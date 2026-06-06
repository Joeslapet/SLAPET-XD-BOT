# Bot + Pairing Service Integration Guide

## Overview

The pairing service generates WhatsApp sessions that the main bot can use.

## Architecture

```
User Browser
    │
    ▼
Pairing Service (port 3000)
    │ ├─ Generates pairing code
    │ ├─ Creates session
    │ └─ Stores in: pairing-service/sessions/{sessionId}/
    │
    ▼
Bot (port 3001 or separate process)
    │ └─ Loads session from pairing-service/sessions/
    │
    ▼
WhatsApp
```

## Step 1: Pairing Phase

User goes to https://xxxd-bot-pairing.onrender.com

1. Enters phone number
2. Gets pairing code (e.g., ARRF-RTRE)
3. Scans QR or enters code in WhatsApp
4. System creates session in: `pairing-service/sessions/session_xxx/`

Session files created:
- `creds.json` - WhatsApp credentials
- `pre-key-1.json`, `pre-key-2.json`, etc
- `session-metadata.json` - Session info

## Step 2: Bot Integration

In your `bot.js` or separate bot file:

```javascript
import { loadSession } from './pairing-service/src/database/sessionStore.js';

// Load the paired session
const sessionId = process.env.PAIRED_SESSION_ID || 'session_xxx';

async function startBot() {
    try {
        // Load session
        const { socket } = await loadSession(sessionId);
        
        console.log('Bot connected successfully');
        
        // Now use socket for all operations
        socket.ev.on('messages.upsert', async (msg) => {
            console.log('Message received:', msg);
        });
        
    } catch (error) {
        console.error('Failed to start bot:', error);
    }
}

startBot();
```

## File Paths

### After Pairing

```
XXXD-BOT/
├── pairing-service/
│   └── sessions/
│       └── session_1704067200000_abc123/
│           ├── creds.json
│           ├── pre-key-1.json
│           ├── pre-key-2.json
│           ├── ...
│           └── session-metadata.json
│
└── bot.js (loads session from above)
```

## Environment Variables

### For Pairing Service
```bash
PORT=3000
API_KEY=your-secret-key
SESSION_TTL_MINUTES=60
```

### For Bot
```bash
PAIRED_SESSION_ID=session_1704067200000_abc123
PAIRING_SERVICE_URL=http://localhost:3000
```

## Deployment on Render

### Option 1: Single Service (Recommended)

Deploy everything together:
- Pairing service on port 3000
- Bot runs as background worker or separate service

### Option 2: Multiple Services

1. **Pairing Service Web**
   - Name: `xxxd-bot-pairing`
   - Command: `npm start` (from pairing-service)
   - Port: 3000

2. **Bot Worker**
   - Name: `xxxd-bot-worker`
   - Command: `node bot.js`
   - No public port needed
   - Reads sessions from `pairing-service/sessions/`

Both services share the same GitHub repo:
```
XXXD-BOT/
├── pairing-service/     ← Service 1 deploys this
├── bot.js               ← Service 2 runs this
└── ...
```

## Session Sharing Between Services

### Problem
Pairing service and bot run in different containers/processes.
They need to share session files.

### Solution

**Option A: File System** (Current - Simple)
- Both services access same `pairing-service/sessions/` directory
- Works if using shared storage (Render includes this)
- Simple, no database needed

**Option B: Database** (Scalable)
```javascript
// Store sessions in MongoDB/PostgreSQL
// Pairing service: saves sessions to DB
// Bot: loads sessions from DB
```

**Option C: API Communication**
```javascript
// Bot calls pairing service API to get session
const response = await fetch('http://pairing:3000/api/pairing/sessions/{id}', {
    headers: { 'x-api-key': API_KEY }
});
```

## Example: Complete Flow

### 1. User Pairs Device

```bash
# User visits: https://xxxd-bot-pairing.onrender.com
# 1. Enters: 22891234567
# 2. Gets code: ARRF-RTRE
# 3. Scans QR in WhatsApp
# 4. System creates: pairing-service/sessions/session_1704067200000_abc123/
```

### 2. Bot Uses Session

```javascript
// bot.js
import { loadSession } from './pairing-service/src/database/sessionStore.js';

const sessionId = 'session_1704067200000_abc123';
const { socket } = await loadSession(sessionId);

// Bot is now connected!
socket.sendMessage('22891234567@s.whatsapp.net', {
    text: 'Hello from bot!'
});
```

### 3. Conversation with User

```
User: "Hi bot"
  ↓ (WhatsApp)
Bot (receives via socket)
  ↓
bot.js processes message
  ↓ (sends response via socket)
User: "Response from bot"
```

## Connecting Multiple Bots

If you want multiple bot instances:

```
Pairing Service
    ├─ session_1: phone A (bot instance 1)
    ├─ session_2: phone B (bot instance 2)
    └─ session_3: phone C (bot instance 3)
```

Each bot loads a different session:
```javascript
// Bot 1
const sessionId = 'session_1';
const { socket: socket1 } = await loadSession(sessionId);

// Bot 2
const sessionId = 'session_2';
const { socket: socket2 } = await loadSession(sessionId);
```

## Monitoring Connections

### Check Session Status

```bash
# API request
curl https://xxxd-bot-pairing.onrender.com/api/pairing/sessions/{sessionId} \
  -H "x-api-key: YOUR_KEY"
```

### List All Sessions

```bash
curl https://xxxd-bot-pairing.onrender.com/api/pairing/sessions \
  -H "x-api-key: YOUR_KEY"
```

### Logs

```bash
# Render dashboard: Click "Logs" tab
# Look for:
# - "Pairing code generated"
# - "Session created"
# - "Connection established"
```

## Troubleshooting Integration

### Bot Can't Find Session
```javascript
// Debug: List available sessions
import fs from 'fs';
const sessions = fs.readdirSync('./pairing-service/sessions');
console.log('Available sessions:', sessions);
```

### Permission Denied
- Ensure bot has read access to `pairing-service/sessions/`
- Check file permissions
- On Render: should work automatically

### Session Expired
- Sessions expire after TTL (default 60 minutes)
- Generate new pairing code
- Or extend TTL in .env: `SESSION_TTL_MINUTES=1440`

## Next Steps

1. Set up pairing service on Render
2. Pair your first device
3. Update bot.js to load the session
4. Test message sending/receiving
5. Deploy bot to Render or keep local

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed instructions.
