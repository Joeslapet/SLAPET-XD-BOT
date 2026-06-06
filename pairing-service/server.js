import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import qrcode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const PAIRING_SECRET = process.env.PAIRING_SECRET || 'build-by-joeslapet';
const BOT_NUMBER = process.env.BOT_NUMBER || '22892864375';
const SESSIONS_DIR = path.join(__dirname, 'sessions');

await fs.mkdir(SESSIONS_DIR, { recursive: true });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

function normalizePhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

function normalizePairingCode(code) {
  const cleaned = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return String(code || '').toUpperCase().trim();
}

function buildWhatsAppLink(code) {
  const text = encodeURIComponent(`PAIRING CODE: ${code}`);
  return `https://wa.me/${BOT_NUMBER}?text=${text}`;
}

function buildPhoneLabel(phone) {
  const digits = normalizePhone(phone);
  return digits.length ? `+${digits}` : '';
}

function generatePairingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateSessionId() {
  return crypto.randomBytes(12).toString('hex');
}

function sessionFile(sessionId) {
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

async function saveSession(session) {
  await fs.writeFile(sessionFile(session.id), JSON.stringify(session, null, 2), 'utf-8');
}

async function readSession(sessionId) {
  const file = sessionFile(sessionId);
  const data = await fs.readFile(file, 'utf-8');
  return JSON.parse(data);
}

app.get('/', (req, res) => {
  res.render('pairing', { botNumber: BOT_NUMBER });
});

app.post('/api/pairing/code', async (req, res) => {
  try {
    const phoneNumber = normalizePhone(req.body.phoneNumber || req.query.phoneNumber || '');

    if (!phoneNumber || phoneNumber.length < 8 || phoneNumber.length > 16) {
      return res.status(400).json({ ok: false, error: 'Numéro invalide. Entrez un numéro WhatsApp valide.' });
    }

    const code = generatePairingCode();
    const session = {
      id: generateSessionId(),
      phoneNumber,
      code,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await saveSession(session);

    const whatsAppLink = buildWhatsAppLink(session.code);
    const qrDataUrl = await qrcode.toDataURL(whatsAppLink, { margin: 1, scale: 8 });

    return res.json({
      ok: true,
      sessionId: session.id,
      code: session.code,
      phoneNumber: buildPhoneLabel(session.phoneNumber),
      whatsAppLink,
      qrDataUrl,
    });
  } catch (error) {
    console.error('Error generating code:', error);
    return res.status(500).json({ ok: false, error: 'Erreur interne du serveur.' });
  }
});

app.get('/api/pairing/sessions/:sessionId', async (req, res) => {
  try {
    const session = await readSession(req.params.sessionId);
    return res.json({ ok: true, status: session.status, phoneNumber: buildPhoneLabel(session.phoneNumber), code: session.code });
  } catch (e) {
    return res.status(404).json({ ok: false, error: 'Session introuvable.' });
  }
});

app.post('/api/pairing/confirm', async (req, res) => {
  const secret = req.headers['x-pairing-secret'];
  if (!secret || String(secret) !== PAIRING_SECRET) {
    return res.status(403).json({ ok: false, error: 'Accès refusé.' });
  }

  const phoneNumber = normalizePhone(req.body.phoneNumber || '');
  const code = normalizePairingCode(req.body.code || '');

  if (!phoneNumber || !code) {
    return res.status(400).json({ ok: false, error: 'phoneNumber et code sont requis.' });
  }

  const files = await fs.readdir(SESSIONS_DIR);
  for (const filename of files) {
    if (!filename.endsWith('.json')) continue;
    const filePath = path.join(SESSIONS_DIR, filename);
    const session = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    if (session.phoneNumber === phoneNumber && normalizePairingCode(session.code) === code) {
      if (session.status === 'connected') {
        return res.json({ ok: true, status: 'connected' });
      }
      session.status = 'connected';
      session.connectedAt = new Date().toISOString();
      await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
      return res.json({ ok: true, status: 'connected' });
    }
  }

  return res.status(404).json({ ok: false, error: 'Code ou numéro non trouvé.' });
});

app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Pairing service running on port ${PORT}`);
});
