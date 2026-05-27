import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { log } from '../utils/logger.js';
import { broadcastSession } from '../utils/ws.js';

const sessions = new Map();
const reconnectTimers = new Map();

await fs.mkdir(config.sessionsDir, { recursive: true });

export function listSessions() {
  return [...sessions.values()].map(publicSession);
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  return session ? publicSession(session) : null;
}

export async function createPairingSession({ phone, sessionId, useQr }) {
  const id = sanitizeSessionId(sessionId) || crypto.randomUUID();
  if (sessions.has(id)) {
    await removeSession(id, { keepFiles: true });
  }

  const session = createSessionRecord(id, phone);
  sessions.set(id, session);
  await connectSession(session, { phone, useQr, requestPairing: true });
  return publicSession(session);
}

export async function recoverSession(sessionId) {
  const id = sanitizeSessionId(sessionId);
  if (!id) throw createHttpError(400, 'Invalid session id');

  const sessionDir = getSessionDir(id);
  const exists = await existsPath(sessionDir);
  if (!exists) throw createHttpError(404, 'Session credentials not found');

  const session = sessions.get(id) || createSessionRecord(id, null);
  sessions.set(id, session);
  await connectSession(session, { requestPairing: false, useQr: false });
  return publicSession(session);
}

export async function removeSession(sessionId, options = {}) {
  const session = sessions.get(sessionId);
  if (session?.sock) {
    try {
      session.sock.end(undefined);
    } catch (error) {}
  }
  clearReconnect(sessionId);
  sessions.delete(sessionId);
  if (!options.keepFiles) {
    await fs.rm(getSessionDir(sessionId), { recursive: true, force: true });
  }
  broadcastSession({ type: 'session.deleted', sessionId });
}

export async function cleanupExpiredSessions() {
  const now = Date.now();
  for (const session of sessions.values()) {
    if (session.expiresAtMs <= now && session.status !== 'connected') {
      log.warn(`Cleaning expired session ${session.id}`);
      await removeSession(session.id);
    }
  }
}

async function connectSession(session, options) {
  session.status = 'connecting';
  session.updatedAt = new Date().toISOString();
  broadcastSession({ type: 'session.update', session: publicSession(session) });

  const sessionDir = getSessionDir(session.id);
  await fs.mkdir(sessionDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['SLAPET Pairing', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false,
    qrTimeout: 120000
  });

  session.sock = sock;
  session.waVersion = version.join('.');

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && options.useQr) {
      session.qr = await QRCode.toDataURL(qr);
      session.status = 'qr_ready';
      touch(session);
    }

    if (connection === 'open') {
      session.status = 'connected';
      session.connectedAt = new Date().toISOString();
      session.phoneNumber = session.phoneNumber || extractPhone(sock.user?.id);
      session.pairingCode = null;
      session.qr = null;
      clearReconnect(session.id);
      touch(session);
      log.success(`WhatsApp session connected: ${session.id}`);
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      session.status = reason === DisconnectReason.loggedOut ? 'logged_out' : 'disconnected';
      touch(session);
      if (reason !== DisconnectReason.loggedOut) {
        scheduleReconnect(session);
      }
    }
  });

  if (options.requestPairing && options.phone && !sock.authState.creds.registered) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    session.pairingCode = await sock.requestPairingCode(options.phone);
    session.status = 'pairing_code_ready';
    touch(session);
  }
}

function scheduleReconnect(session) {
  if (reconnectTimers.has(session.id)) return;
  const timer = setTimeout(async () => {
    reconnectTimers.delete(session.id);
    if (!sessions.has(session.id)) return;
    try {
      log.info(`Reconnecting session ${session.id}`);
      await connectSession(session, { requestPairing: false, useQr: false });
    } catch (error) {
      log.error(`Reconnect failed for ${session.id}: ${error.message}`);
      scheduleReconnect(session);
    }
  }, 5000);
  reconnectTimers.set(session.id, timer);
}

function clearReconnect(sessionId) {
  const timer = reconnectTimers.get(sessionId);
  if (timer) clearTimeout(timer);
  reconnectTimers.delete(sessionId);
}

function createSessionRecord(id, phoneNumber) {
  const now = Date.now();
  return {
    id,
    phoneNumber,
    status: 'created',
    pairingCode: null,
    qr: null,
    waVersion: null,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAtMs: now + config.sessionTtlMs,
    expiresAt: new Date(now + config.sessionTtlMs).toISOString(),
    sock: null
  };
}

function publicSession(session) {
  return {
    id: session.id,
    phoneNumber: session.phoneNumber,
    status: session.status,
    pairingCode: session.pairingCode,
    qr: session.qr,
    waVersion: session.waVersion,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    connectedAt: session.connectedAt,
    expiresAt: session.expiresAt
  };
}

function touch(session) {
  session.updatedAt = new Date().toISOString();
  broadcastSession({ type: 'session.update', session: publicSession(session) });
}

function getSessionDir(sessionId) {
  return path.join(config.sessionsDir, sanitizeSessionId(sessionId));
}

function sanitizeSessionId(sessionId) {
  if (!sessionId) return '';
  return String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}

function extractPhone(jid = '') {
  return jid.split(':')[0].replace(/[^0-9]/g, '');
}

async function existsPath(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
