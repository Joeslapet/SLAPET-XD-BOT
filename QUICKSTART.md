# XXXD-BOT Pairing Service - Quick Start Guide

## 5-Minute Setup

### Locally (Testing)

```bash
# 1. Navigate to pairing service
cd pairing-service

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:3000

# 5. Test pairing
# - Enter phone: 22891234567
# - Get code: ARRF-RTRE
# - Scan QR in WhatsApp
```

### On Render (Production)

```bash
# 1. Push to GitHub
git add .
git commit -m "Add pairing service"
git push origin main

# 2. Go to Render (https://render.com)
# 3. Click: New + → Web Service
# 4. Connect your GitHub repo
# 5. Configure:
#    - Name: xxxd-bot-pairing
#    - Root Directory: pairing-service
#    - Build: npm install
#    - Start: npm start

# 6. Set Environment Variables:
#    - API_KEY: (your secret key)
#    - LOG_LEVEL: info

# 7. Click Deploy
# Done! Service runs at: https://xxxd-bot-pairing.onrender.com
```

## How It Works

```
1. User visits: https://xxxd-bot-pairing.onrender.com
   ↓
2. Enters phone number: 22891234567
   ↓
3. System generates code: ARRF-RTRE
   ↓
4. Shows QR code
   ↓
5. User scans QR in WhatsApp Settings → Linked Devices
   ↓
6. System creates session (auto-connects bot!)
   ↓
7. Success! Bot is now linked
```

## API Usage

### Get Pairing Code
```bash
curl -X POST http://localhost:3000/api/pairing/code \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"phone": "22891234567"}'
```

Response:
```json
{
  "sessionId": "session_1234567890_abc",
  "code": "ARRF-RTRE",
  "qr": "data:image/png;base64,..."
}
```

### Check Session Status
```bash
curl http://localhost:3000/api/pairing/sessions/session_1234567890_abc \
  -H "x-api-key: your-api-key"
```

## File Structure Created

```
pairing-service/
├── public/
│   ├── index.html       ← Main pairing page
│   ├── css/style.css    ← Styling
│   └── js/main.js       ← Frontend logic
│
├── src/
│   ├── app.js
│   ├── bot-integration.js
│   └── routes/pairing.routes.js  ← API endpoints
│
├── sessions/            ← Sessions stored here
├── package.json
└── server.js
```

## Environment Variables

Create `.env` in pairing-service/:
```
PORT=3000
API_KEY=your-secret-key-change-this
SESSION_TTL_MINUTES=60
LOG_LEVEL=info
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | `PORT=3001 npm run dev` |
| "API key invalid" | Check .env API_KEY matches header |
| Session not found | Generate new pairing code |
| QR not showing | Update browser / clear cache |

## Next Steps

1. Test locally first
2. Deploy to Render
3. Integrate with main bot.js
4. Configure webhook for messages
5. Test end-to-end

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
See [INTEGRATION.md](./INTEGRATION.md) to connect with bot.js.

## Support Files

- **DEPLOYMENT.md** - Full deployment guide
- **INTEGRATION.md** - Connecting with bot.js
- **pairing-service/README.md** - Technical documentation
- **render.yaml** - Render configuration

Happy pairingfrom ! 🚀
