# XXXD-BOT Pairing Service - Deployment Guide

## Overview

Your application is structured as follows:
```
XXXD-BOT/
├── pairing-service/           <-- Web Interface + API (This runs on Render)
│   ├── public/                <-- Static HTML/CSS/JS
│   ├── src/
│   ├── server.js
│   ├── package.json
│   └── sessions/              <-- WhatsApp sessions stored here
│
├── bot.js                      <-- Main bot (runs separately)
└── config.json
```

## Local Testing

### 1. Setup Pairing Service

```bash
cd pairing-service
cp .env.example .env
npm install
npm run dev
```

Visit: http://localhost:3000

### 2. Test the flow:
1. Enter phone number (e.g., 22891234567)
2. Get pairing code in format: XXXX-XXXX
3. Scan QR or enter code in WhatsApp
4. Session created in `pairing-service/sessions/`

## Production Deployment on Render

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add pairing service"
git push origin main
```

### Step 2: Connect to Render
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: xxxd-bot-pairing
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `pairing-service` ← IMPORTANT!

### Step 3: Environment Variables
In Render dashboard, set:
- `NODE_ENV` = production
- `API_KEY` = (generate a strong key)
- `PUBLIC_URL` = https://xxxd-bot-pairing.onrender.com (auto-filled)
- `LOG_LEVEL` = info

### Step 4: Deploy
Click "Deploy" button

Your service is now live at: https://xxxd-bot-pairing.onrender.com

## Using the Pairing Service

### Web Interface
- URL: https://xxxd-bot-pairing.onrender.com
- User enters phone number
- System generates code in format: ARRF-RTRE
- User scans QR or enters code in WhatsApp

### API Endpoints

**Get Health Status**
```bash
curl https://xxxd-bot-pairing.onrender.com/api/pairing/health
```

**Generate Pairing Code**
```bash
curl -X POST https://xxxd-bot-pairing.onrender.com/api/pairing/code \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"phone": "22891234567"}'
```

Response:
```json
{
  "sessionId": "session_123456789_abc123",
  "phone": "22891234567",
  "code": "ARRF-RTRE",
  "qr": "data:image/png;base64,...",
  "status": "pending",
  "expiresIn": 300
}
```

**Check Session Status**
```bash
curl https://xxxd-bot-pairing.onrender.com/api/pairing/sessions/{sessionId} \
  -H "x-api-key: YOUR_API_KEY"
```

## Integrating with Main Bot

After pairing is complete, the session is saved in `pairing-service/sessions/{sessionId}/`

To use in bot.js:
```javascript
import { loadSession } from './pairing-service/src/database/sessionStore.js';

const sessionId = process.env.PAIRED_SESSION_ID || 'your-session-id';
const { socket } = await loadSession(sessionId);

// Use socket for WhatsApp operations
```

## Monitoring

### View Logs
```bash
# On Render dashboard, click "Logs" tab
# Or from CLI:
curl https://xxxd-bot-pairing.onrender.com/api/pairing/health
```

### Common Issues

**"Session not found"**
- Session expired after 1 hour (default TTL)
- Generate new pairing code

**"Rate limit exceeded"**
- Max 5 pairing attempts per 5 minutes
- Wait 5 minutes before trying again

**"WebSocket connection failed"**
- Fallback to polling works automatically
- Check CORS_ORIGIN setting

## File Structure After First Run

```
pairing-service/
├── public/              (static files)
├── src/                 (server code)
├── sessions/            (created at runtime)
│   ├── session_xxx/
│   │   ├── creds.json
│   │   ├── pre-key-1.json
│   │   └── ...
├── logs/                (created at runtime)
├── package.json
└── server.js
```

## Scaling Notes

For production with multiple concurrent users:
- Use session store (currently file-based)
- Consider migrating to MongoDB/Redis for session storage
- Add rate limiting per IP (already configured)
- Monitor memory usage on free tier

## Support

For issues with:
- **Pairing**: Check phone number format and WhatsApp version
- **Deployment**: Check Render logs for errors
- **Integration**: Ensure session path is accessible from bot.js
