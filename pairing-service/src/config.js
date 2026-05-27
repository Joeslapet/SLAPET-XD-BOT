import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export const config = {
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3000),
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  sessionTtlMs: Number(process.env.SESSION_TTL_MINUTES || 60) * 60 * 1000,
  cleanupMs: Number(process.env.SESSION_CLEANUP_MINUTES || 10) * 60 * 1000,
  pairingRateWindowMs: Number(process.env.PAIRING_RATE_LIMIT_WINDOW_MINUTES || 10) * 60 * 1000,
  pairingRateMax: Number(process.env.PAIRING_RATE_LIMIT_MAX || 5),
  logLevel: process.env.LOG_LEVEL || 'info',
  rootDir,
  sessionsDir: path.join(rootDir, 'sessions')
};
