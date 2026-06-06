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
