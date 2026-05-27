import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { requireApiKey } from '../utils/security.js';
import { validatePhoneNumber } from '../utils/phone.js';
import {
  createPairingSession,
  getSession,
  listSessions,
  recoverSession,
  removeSession
} from '../database/sessionStore.js';

const router = Router();

const pairingLimiter = rateLimit({
  windowMs: config.pairingRateWindowMs,
  max: config.pairingRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    status: 'rate_limited',
    error: 'Too many pairing attempts. Try again later.'
  }
});

router.get('/health', (req, res) => {
  res.json({ ok: true, status: 'online', timestamp: new Date().toISOString() });
});

router.post('/pairing/code', requireApiKey, pairingLimiter, async (req, res, next) => {
  try {
    const { phoneNumber, sessionId, useQr = true } = req.body || {};
    const phone = validatePhoneNumber(phoneNumber);
    const session = await createPairingSession({ phone, sessionId, useQr });

    res.status(201).json({
      ok: true,
      status: session.status,
      sessionId: session.id,
      phoneNumber: phone,
      pairingCode: session.pairingCode,
      qr: session.qr,
      expiresAt: session.expiresAt,
      message: session.pairingCode
        ? 'Pairing code generated. Open WhatsApp > Linked devices > Link with phone number.'
        : 'QR mode started. Scan the QR code to connect.'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions', requireApiKey, (req, res) => {
  res.json({ ok: true, sessions: listSessions() });
});

router.get('/sessions/:sessionId', requireApiKey, (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ ok: false, status: 'not_found', error: 'Session not found' });
  }
  res.json({ ok: true, session });
});

router.post('/sessions/:sessionId/recover', requireApiKey, async (req, res, next) => {
  try {
    const session = await recoverSession(req.params.sessionId);
    res.json({ ok: true, status: session.status, sessionId: session.id });
  } catch (error) {
    next(error);
  }
});

router.delete('/sessions/:sessionId', requireApiKey, async (req, res, next) => {
  try {
    await removeSession(req.params.sessionId);
    res.json({ ok: true, status: 'deleted', sessionId: req.params.sessionId });
  } catch (error) {
    next(error);
  }
});

export default router;
