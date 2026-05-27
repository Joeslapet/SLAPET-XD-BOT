import { WebSocketServer } from 'ws';
import { config } from '../config.js';
import { log } from './logger.js';

let wss = null;

export function attachWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (socket, req) => {
    const token = new URL(req.url, config.publicUrl).searchParams.get('token');
    if (config.apiKey && token !== config.apiKey) {
      socket.close(1008, 'unauthorized');
      return;
    }
    socket.send(JSON.stringify({ type: 'welcome', service: 'slapet-pairing-service' }));
  });
  log.success('WebSocket ready on /ws');
}

export function broadcastSession(payload) {
  if (!wss) return;
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(data);
  }
}
