import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

/**
 * GET /generate
 * Reçoit un paramètre `user` en query string.
 * Exemples : /generate?user=joeslapet
 */
app.get('/generate', (req, res) => {
  try {
    const user = String(req.query.user || '').trim();

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre user est requis.',
      });
    }

    const code = createPairingCode(user);

    return res.json({
      success: true,
      user,
      code,
    });
  } catch (error) {
    console.error('Erreur sur /generate', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur.',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Génère un code unique en combinant le nom d'utilisateur et un identifiant court.
 * Exemple de format : ABCD-EFGH
 */
function createPairingCode(user) {
  const randomPart = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, 'A');
  return randomPart.slice(0, 4) + '-' + randomPart.slice(4, 8);
}

app.listen(port, () => {
  console.log(`Pairing API ready on http://localhost:${port}`);
});
