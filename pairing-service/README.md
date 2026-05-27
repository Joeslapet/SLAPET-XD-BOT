# SLAPET Pairing Service

API Express moderne pour generer des Pairing Codes WhatsApp avec Baileys.

## Installation

```bash
cd pairing-service
npm install
cp .env.example .env
npm start
```

## Render

- Build command: `npm install`
- Start command: `npm start`
- Root directory: `pairing-service`
- Environment: configure `API_KEY`, `PUBLIC_URL`, `PORT`

## Pairing Code

```bash
curl -X POST http://localhost:3000/api/pairing/code \
  -H "Content-Type: application/json" \
  -H "x-api-key: change-me" \
  -d "{\"phoneNumber\":\"22890000000\",\"sessionId\":\"owner-main\"}"
```

Response:

```json
{
  "ok": true,
  "status": "pairing_code_ready",
  "sessionId": "owner-main",
  "phoneNumber": "22890000000",
  "pairingCode": "ABCD-EFGH",
  "qr": null,
  "expiresAt": "..."
}
```

## WebSocket

Connect to:

```text
ws://localhost:3000/ws?token=change-me
```

## Sessions

Credentials are stored in `pairing-service/sessions/<sessionId>`.
