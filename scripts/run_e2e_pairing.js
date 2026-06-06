// scripts/run_e2e_pairing.js
// Simple E2E pairing test: starts the pairing-service, calls /api/pairing/code and /api/pairing/confirm
// Requires: Node.js installed, and `pairing-service` dependencies installed (npm install)

const { spawn } = require('child_process');
const fetch = global.fetch || require('node-fetch');

const PAIRING_SECRET = process.env.PAIRING_SECRET || 'test-pairing-secret';
const PORT = process.env.PORT || '3001';
const BASE = `http://localhost:${PORT}`;

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

async function waitForServer(timeoutMs=10000){
  const start=Date.now();
  while(Date.now()-start < timeoutMs){
    try{
      const res = await fetch(BASE + '/');
      if (res.status === 200) return true;
    }catch(e){}
    await wait(500);
  }
  return false;
}

async function run(){
  console.log('Starting pairing-service...');
  const env = Object.assign({}, process.env, { PAIRING_SECRET, PORT });
  const child = spawn('node', ['pairing-service/server.js'], { env, stdio: ['ignore','pipe','pipe'] });

  child.stdout.on('data', d=>process.stdout.write('[server] '+d));
  child.stderr.on('data', d=>process.stderr.write('[server] ERR '+d));

  const ok = await waitForServer(12000);
  if (!ok){
    console.error('Server did not start or is not reachable. Check that dependencies are installed.');
    child.kill();
    process.exit(1);
  }
  console.log('Server reachable. Generating pairing code...');

  const phone = '+15551234567';
  const genRes = await fetch(BASE + '/api/pairing/code', {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ phoneNumber: phone })
  });
  const genJson = await genRes.json();
  console.log('Generate response:', genJson);
  if (!genJson || !genJson.code){
    console.error('Failed to generate code');
    child.kill(); process.exit(1);
  }

  const code = genJson.code;
  const sig = genJson.sig;
  console.log('Using code', code, 'sig', sig);

  const confRes = await fetch(BASE + '/api/pairing/confirm', {
    method: 'POST', headers: { 'Content-Type':'application/json', 'x-pairing-secret': PAIRING_SECRET },
    body: JSON.stringify({ phoneNumber: phone, code, sig })
  });
  const confJson = await confRes.json();
  console.log('Confirm response:', confJson);

  console.log('Shutting down server');
  child.kill();
  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(2); });
