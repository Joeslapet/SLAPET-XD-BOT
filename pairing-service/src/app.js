import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import pairingRoutes from './routes/pairing.routes.js';
import errorHandler from './utils/errors.js';
import logger from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use((req, res, next) => {
    logger.log(`${req.method} ${req.path}`);
    next();
});

// API Rate limiters
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

const pairingLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true
});

app.use('/api/pairing/code', pairingLimiter);
app.use('/api/', apiLimiter);

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.use('/api/pairing', pairingRoutes);

// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ message: 'Route not found' });
    } else {
        res.status(404).render('404');
    }
});

// Error handler
app.use(errorHandler);

export default app;
