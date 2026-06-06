// ============================================================
// api.js — Fonction client utilisant Axios pour interroger l'API
// ============================================================

import axios from 'axios';    // Client HTTP
import config from '../config/config.js';

/**
 * Génère un code unique pour un utilisateur donné.
 *
 * @param {string} user - Nom ou identifiant de l'utilisateur
 * @returns {Promise<Object>} Réponse de l'API : { success, user, code }
 * @throws {Error} Si la requête échoue ou si l'API retourne une erreur
 */
export async function generateCode(user) {
  // Validation locale du paramètre avant d'envoyer la requête
  if (!user || typeof user !== 'string' || user.trim().length === 0) {
    throw new Error('Le paramètre "user" est requis et doit être une chaîne non vide.');
  }

  try {
    // 1. Construction de l'URL complète avec le paramètre user
    //    Exemple : http://localhost:3000/generate?user=alice
    const url = `${config.apiUrl}/generate`;

    // 2. Envoi de la requête GET avec Axios
    const response = await axios.get(url, {
      params: {
        user: user.trim(),
      },
      // Timeout : 10 secondes max avant d'abandonner
      timeout: 10000,
    });

    // 3. Extraction et retour des données JSON de la réponse
    return response.data;
  } catch (error) {
    // 4. Gestion fine des erreurs Axios
    if (error.response) {
      // L'API a répondu avec un code HTTP d'erreur (4xx ou 5xx)
      throw new Error(
        `Erreur API (${error.response.status}) : ${error.response.data?.message || 'Réponse invalide'}`
      );
    } else if (error.request) {
      // La requête a été envoyée mais aucune réponse reçue (timeout, réseau, etc.)
      throw new Error('Impossible de contacter le serveur. Vérifiez que l\'API est bien démarrée.');
    } else {
      // Autre erreur lors de la configuration de la requête
      throw new Error(`Erreur lors de la requête : ${error.message}`);
    }
  }
}
