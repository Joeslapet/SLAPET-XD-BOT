import { config } from '../config.js';

export function requireApiKey(req, res, next) {
  if (!config.apiKey) return next();
  const token = req.header('x-api-key') || req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (token !== config.apiKey) {
    return res.status(401).json({
      ok: false,
      status: 'unauthorized',
      error: 'Invalid or missing API key'
    });
  }
  next();
}
