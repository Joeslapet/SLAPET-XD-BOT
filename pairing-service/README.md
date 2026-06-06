# Pairing Service — Quick Run & Test

Prerequisites:
- Node.js (v18+). Install npm packages in this folder before running the server.

Install dependencies:

```bash
cd pairing-service
npm install
```

Start server (example):

```bash
# Linux/macOS
export PAIRING_SECRET='your_secret'
export BOT_NUMBER='15551234567'
export PORT=3001
node server.js

# Windows PowerShell
$env:PAIRING_SECRET='your_secret'
$env:BOT_NUMBER='15551234567'
$env:PORT=3001
node server.js
```

Test HMAC generation locally (no deps required):

```bash
# from repo root
node pairing-service/test_hmac.js
```

Quick pairing API test (server must be running):

```bash
curl -s -X POST 'http://localhost:3001/api/pairing/code' \
  -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"+15551234567"}' | jq .

# then confirm (use returned sig)
curl -s -X POST 'http://localhost:3001/api/pairing/confirm' \
  -H 'Content-Type: application/json' \
  -H 'x-pairing-secret: your_secret' \
  -d '{"phoneNumber":"+15551234567","code":"ABCD-EFGH","sig":"<SIG_FROM_PREVIOUS>"}' | jq .
```

## E2E automated test

From repo root, run:

```bash
node scripts/run_e2e_pairing.js
```

This starts the pairing-service (requires dependencies installed) and performs a generate+confirm cycle.

## Full E2E with bot

Run the full pairing flow including an optional `bot.js` instance:

```bash
# from repo root
export PAIRING_SECRET=your_secret
export PORT=3001
# set START_BOT=1 to spawn the bot (it may require WhatsApp authentication)
START_BOT=1 node scripts/run_full_e2e_with_bot.js
```

On Windows PowerShell, use `$env:PAIRING_SECRET = "your_secret"` and `$env:START_BOT = "1"`.

## Deployment / Supervision

PM2 (process manager):

Run:

    npm install -g pm2
    pm2 start ecosystem.config.js

Docker / docker-compose:

    docker-compose up --build -d
    docker-compose logs -f
