import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Routes
app.get('/', (req, res) => {
    res.render('pairing');
});

app.post('/api/pairing/code', (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number required' });
    }

    // Generate pairing code
    const code = generatePairingCode();
    const sessionId = generateSessionId();

    res.json({
        ok: true,
        sessionId,
        phoneNumber,
        code
    });
});

app.get('/api/pairing/sessions/:sessionId', (req, res) => {
    res.json({
        ok: true,
        sessionId: req.params.sessionId,
        status: 'pending'
    });
});

function generatePairingCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

app.listen(PORT, () => {
    console.log('Pairing service running on port', PORT);
});
