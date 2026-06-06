// scripts/run_full_e2e_with_bot.js
// Starts pairing-service, optionally starts bot.js, performs generate+confirm pairing flow, then stops.
// Usage:
//   START_BOT=1 PAIRING_SECRET=secret node scripts/run_full_e2e_with_bot.js

const { spawn } = require('child_process');
const fetch = global.fetch || require('node-fetch');

const PAIRING_SECRET = process.env.PAIRING_SECRET || 'test-pairing-secret';
const PORT = process.env.PORT || '3001';
const START_BOT = process.env.START_BOT === '1';
const BASE = `http://localhost:${PORT}`;

function wait(ms){return new Promise(r=>setTimeout(r,ms));}
async function waitForServer(timeoutMs=15000){
  const start=Date.now();
  while(Date.now()-start < timeoutMs){
    try{ const res = await fetch(BASE + '/'); if (res.status === 200) return true; }catch(e){}
    await wait(500);
  }
  return false;
}

async function run(){
  console.log('Starting pairing-service...');
  const env = Object.assign({}, process.env, { PAIRING_SECRET, PORT });
  const server = spawn('node', ['pairing-service/server.js'], { env, stdio: ['ignore','pipe','pipe'] });
  server.stdout.on('data', d=>process.stdout.write('[server] '+d));
  server.stderr.on('data', d=>process.stderr.write('[server] ERR '+d));

  let bot = null;
  if (START_BOT){
    console.log('Starting bot.js (may require WhatsApp auth)...');
    bot = spawn('node', ['bot.js'], { env, stdio: ['ignore','pipe','pipe'] });
    bot.stdout.on('data', d=>process.stdout.write('[bot] '+d));
    bot.stderr.on('data', d=>process.stderr.write('[bot] ERR '+d));
  }

  const ok = await waitForServer(15000);
  if (!ok){ console.error('Server did not start; ensure dependencies installed.'); server.kill(); if (bot) bot.kill(); process.exit(1); }
  console.log('Server ready — generating pairing code');

  const phone = process.env.TEST_PHONE || '+15551234567';
  const genRes = await fetch(BASE + '/api/pairing/code', {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ phoneNumber: phone })
  });
  const genJson = await genRes.json();
  console.log('Generate response:', genJson);
  if (!genJson || !genJson.code){ console.error('Generation failed'); server.kill(); if (bot) bot.kill(); process.exit(2); }

  const code = genJson.code;
  const sig = genJson.sig;
  console.log('Using code', code, 'sig', sig);

  // Confirm via secret header
  const confRes = await fetch(BASE + '/api/pairing/confirm', {
    method: 'POST', headers: { 'Content-Type':'application/json', 'x-pairing-secret': PAIRING_SECRET },
    body: JSON.stringify({ phoneNumber: phone, code, sig })
  });
  const confJson = await confRes.json();
  console.log('Confirm response:', confJson);

  console.log('Shutting down...');
  server.kill();
  if (bot) bot.kill();
  process.exit(confJson && confJson.ok ? 0 : 3);
}

run().catch(e=>{ console.error(e); process.exit(4); });
