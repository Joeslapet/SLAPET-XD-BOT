import { generateCode } from './api.js';

async function main() {
  const user = process.argv[2] || 'testuser';
  console.log(`Demande de pairing pour: ${user}`);

  try {
    const result = await generateCode(user);
    console.log('Réponse API:', result);
    console.log(`Code généré pour ${result.user}: ${result.code}`);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

main();
