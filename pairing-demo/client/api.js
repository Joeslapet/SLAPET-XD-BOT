import axios from 'axios';
import { config } from '../config/config.js';

/**
 * Envoie une requête GET à l'API pour générer un code de pairing.
 * @param {string} user Nom d'utilisateur
 */
export async function generateCode(user) {
  if (!user || typeof user !== 'string') {
    throw new Error('Le paramètre user doit être une chaîne non vide.');
  }

  const url = `${config.apiUrl}/generate?user=${encodeURIComponent(user)}`;

  try {
    const response = await axios.get(url, {
      timeout: 5000,
    });

    if (!response.data || response.data.success !== true) {
      throw new Error(response.data?.error || 'Réponse invalide de l\'API');
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API a renvoyé une erreur: ${error.response.data?.error || error.response.statusText}`);
    }
    if (error.request) {
      throw new Error("Aucune réponse reçue de l'API. Vérifie que le serveur est démarré.");
    }
    throw new Error(`Erreur Axios: ${error.message}`);
  }
}
