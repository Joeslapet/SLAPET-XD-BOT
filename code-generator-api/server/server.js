// ============================================================
// server.js — Serveur Express avec point d'accès /generate
// ============================================================

import express from 'express';   // Framework web
import cors from 'cors';         // Middleware CORS pour autoriser les requêtes cross-origin
import crypto from 'node:crypto'; // Module natif pour générer des valeurs aléatoires sécurisés
import config from '../config/config.js';

// Initialisation de l'application Express
const app = express();

// ---- Middleware ----
app.use(cors());                 // Autorise toutes les origines (nécessaire pour Render)
app.use(express.json());         // Permet de parser le corps JSON des requêtes entrantes

// ---- Route GET /generate ----
// Exemple d'appel : GET /generate?user=alice
app.get('/generate', (req, res) => {
  try {
    // 1. Récupération du paramètre "user" depuis la query string
    const user = req.query.user;

    // 2. Validation : le paramètre user est obligatoire
    if (!user || typeof user !== 'string' || user.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre "user" est requis et doit être une chaîne non vide.',
      });
    }

    // 3. Génération d'un code unique aléatoire
    //    - 16 octets aléatoires convertis en hexadécimal → 32 caractères
    //    - Préfixe "GC-" pour identifier visuellement le format du code
    const code = `GC-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

    // 4. Construction de la réponse JSON conforme au cahier des charges
    const response = {
      success: true,
      user: user.trim(),   // On nettoie les espaces superflus
      code: code,
    };

    // 5. Envoi de la réponse avec le code HTTP 200 OK
    return res.status(200).json(response);
  } catch (error) {
    // 6. Gestion des erreurs serveur imprévues
    console.error('Erreur serveur:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur.',
    });
  }
});

// ---- Démarrage du serveur ----
app.listen(config.port, () => {
  console.log(`✅ Serveur démarré sur le port ${config.port}`);
  console.log(`📡 Endpoint : http://localhost:${config.port}/generate`);
});
