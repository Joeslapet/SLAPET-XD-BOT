import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pairingRoutes from './routes/pairing.routes.js';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './utils/errors.js';
import { requestLogger } from './utils/logger.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'slapet-pairing-service',
    status: 'online',
    endpoints: ['/api/health', '/api/pairing/code', '/api/sessions/:sessionId']
  });
});

app.use('/api', pairingRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
