import { createServer } from 'node:http';
import app from './src/app.js';
import { config } from './src/config.js';
import { log } from './src/utils/logger.js';
import { attachWebSocket } from './src/utils/ws.js';
import { startSessionCleanup } from './src/utils/cleanup.js';

const server = createServer(app);
attachWebSocket(server);
startSessionCleanup();

server.listen(config.port, config.host, () => {
  log.success(`Pairing service online on ${config.host}:${config.port}`);
  log.info(`Public URL: ${config.publicUrl}`);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

function shutdown(signal) {
  log.warn(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
