const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function stamp() {
  return new Date().toISOString();
}

function write(color, level, message) {
  console.log(`${colors.gray}${stamp()}${colors.reset} ${color}${level}${colors.reset} ${message}`);
}

export const log = {
  info: (message) => write(colors.cyan, 'INFO ', message),
  success: (message) => write(colors.green, 'OK   ', message),
  warn: (message) => write(colors.yellow, 'WARN ', message),
  error: (message) => write(colors.red, 'ERROR', message)
};

export function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    const color = res.statusCode >= 500 ? colors.red : res.statusCode >= 400 ? colors.yellow : colors.green;
    write(color, 'HTTP ', `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
}
