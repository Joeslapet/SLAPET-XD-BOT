import { config } from '../config.js';
import { cleanupExpiredSessions } from '../database/sessionStore.js';
import { log } from './logger.js';

export function startSessionCleanup() {
  setInterval(async () => {
    try {
      await cleanupExpiredSessions();
    } catch (error) {
      log.error(`Session cleanup failed: ${error.message}`);
    }
  }, config.cleanupMs).unref();
  log.info(`Session cleanup every ${Math.round(config.cleanupMs / 60000)} minutes`);
}
