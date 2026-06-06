// ============================================================
// config.js — Configuration centralisée du projet
// ============================================================

/**
 * Configuration de l'API.
 * En production (Render), la variable d'environnement API_URL sera utilisée.
 * En local, on utilise localhost:3000 par défaut.
 */
const config = {
  // URL de base de l'API
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  // Port d'écoute du serveur (Render définit automatiquement PORT)
  port: process.env.PORT || 3000,
};

// Export de la configuration (modules ES)
export default config;
