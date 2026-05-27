import { log } from './logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    status: 'not_found',
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, req, res, next) {
  const status = error.status || error.statusCode || 500;
  const message = status >= 500 ? 'Internal server error' : error.message;
  if (status >= 500) log.error(error.stack || error.message);
  res.status(status).json({
    ok: false,
    status: status >= 500 ? 'error' : 'failed',
    error: message
  });
}
