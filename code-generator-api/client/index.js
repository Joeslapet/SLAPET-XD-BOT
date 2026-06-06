// ============================================================
// index.js — Script principal qui utilise le client API
// ============================================================

import { generateCode } from './api.js';

/**
 * Fonction principale asynchrone.
 * Elle récupère l'utilisateur depuis les arguments (ou utilise un défaut)
 * puis appelle l'API et affiche le résultat dans la console.
 */
async function main() {
  // Récupération du nom d'utilisateur depuis la ligne de commande
  // Exécution : node client/index.js --user=alice
  // or          node client/index.js alice
  const args = process.argv.slice(2);
  let user = null;

  for (const arg of args) {
    if (arg.startsWith('--user=')) {
      user = arg.split('=')[1];
      break;
    }
  }

  // Si aucun --user= dans les arguments, on prend le premier argument simple
  if (!user && args.length > 0 && !args[0].startsWith('--')) {
    user = args[0];
  }

  // Valeur par défaut si aucun argument n'est fourni
  user = user || 'utilisateur_test';

  console.log(`🔑 Demande de code pour l'utilisateur : "${user}"`);
  console.log('⏳ Envoi de la requête à l\'API...
');

  try {
    // Appel de la fonction asynchrone du client API
    const result = await generateCode(user);

    // Affichage formaté de la réponse JSON
    console.log('✅ Réponse reçue :');
    console.log('──────────────────────────────');
    console.log(`  Statut  : ${result.success ? 'Succès' : 'Échec'}`);
    console.log(`  Utilisateur : ${result.user}`);
    console.log(`  Code    : ${result.code}`);
    console.log('──────────────────────────────');
  } catch (error) {
    // Affichage de l'erreur en rouge dans la console
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  }
}

// Exécution de la fonction principale
main();
