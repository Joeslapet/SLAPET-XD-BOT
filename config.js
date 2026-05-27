const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const CONFIG_FILE = path.join(__dirname, 'config.json');

const defaultConfig = {
  ownerNumber: '',
  botName: 'SLAPET HACKER BOT',
  version: '3.0.0',
  prefix: '.',
  autoReconnect: true,
  logPrivate: true,
  logOwnerMessages: true,
  autoDownloadStatus: true,
  autoDownloadMedia: true
};

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readJSONSync(CONFIG_FILE);
      return { ...defaultConfig, ...data };
    } catch (e) {
      console.error('Erreur lecture config.json, utilisation config par defaut');
      return { ...defaultConfig };
    }
  }
  return { ...defaultConfig };
}

function saveConfig(config) {
  fs.writeJSONSync(CONFIG_FILE, config, { spaces: 2 });
}

async function getConfig() {
  let config = loadConfig();

  if (!config.ownerNumber) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const num = await new Promise((resolve) => {
      rl.question('Entrez votre numero WhatsApp (ex: 22892864375) : ', (answer) => {
        resolve(answer.replace(/[^0-9]/g, ''));
      });
    });

    rl.close();
    config.ownerNumber = num.includes('@s.whatsapp.net') ? num : `${num}@s.whatsapp.net`;
    saveConfig(config);
    console.log(`Owner configure: ${config.ownerNumber}`);
  }

  return config;
}

function updateConfig(updates) {
  const config = loadConfig();
  Object.assign(config, updates);
  saveConfig(config);
  return config;
}

module.exports = { getConfig, updateConfig, loadConfig, defaultConfig };
