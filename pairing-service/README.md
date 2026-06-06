# XXXD-BOT Pairing Service

Web interface for pairing WhatsApp devices with the bot via QR code or pairing code.

## Features

✓ Beautiful, responsive web interface
✓ Phone number input with validation
✓ Generates pairing codes in format: XXXX-XXXX
✓ QR code generation for quick pairing
✓ Real-time session monitoring via WebSocket
✓ Polling fallback for browsers without WebSocket support
✓ RESTful API with API key authentication
✓ Session management with TTL
✓ Rate limiting to prevent abuse
✓ Comprehensive logging

## Architecture

```
┌─────────────────────────────────────────────────────┐
│            Web Browser Interface                     │
│  (HTML/CSS/JS - port 3000)                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│          Express.js API Server                       │
│  ├─ Static files serving                            │
│  ├─ Pairing code generation                         │
│  ├─ Session management                              │
│  └─ WebSocket real-time updates                     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│        Baileys WhatsApp Client                       │
│  ├─ QR code generation                              │
│  ├─ Session creation                                │
│  └─ Device linking                                  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│      WhatsApp Multi-Device Protocol                  │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- WhatsApp installed on a phone

### Installation

1. **Clone & Install**
   ```bash
   cd pairing-service
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Access Interface**
   - Open http://localhost:3000
   - Enter your phone number
   - Scan QR or use pairing code

## API Documentation

### Base URL
- Local: `http://localhost:3000/api/pairing`
- Production: `https://xxxd-bot-pairing.onrender.com/api/pairing`

### Authentication
All requests require `x-api-key` header:
```
x-api-key: your-api-key-here
```

### Endpoints

#### 1. Health Check
```http
GET /health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 1234
}
```

#### 2. Generate Pairing Code
```http
POST /code
Content-Type: application/json
x-api-key: your-api-key

{
  "phone": "22891234567"
}
```
Response:
```json
{
  "sessionId": "session_1234567890_abc123",
  "phone": "22891234567",
  "code": "ARRF-RTRE",
  "qr": "data:image/png;base64,iVBORw0KGgo...",
  "status": "pending",
  "expiresIn": 300,
  "instructions": {
    "step1": "Open WhatsApp on your phone",
    "step2": "Go to Settings - Linked Devices",
    "step3": "Tap Link a Device",
    "step4": "Scan QR code or enter pairing code"
  }
}
```

#### 3. Get All Sessions
```http
GET /sessions
x-api-key: your-api-key
```
Response:
```json
{
  "count": 2,
  "sessions": [
    {
      "sessionId": "session_xxx",
      "status": "connected",
      "phone": "22891234567",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 4. Get Session Status
```http
GET /sessions/{sessionId}
x-api-key: your-api-key
```
Response:
```json
{
  "sessionId": "session_xxx",
  "phone": "22891234567",
  "status": "connected",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "expiresAt": "2024-01-01T01:00:00.000Z"
}
```

#### 5. Recover Session
```http
POST /sessions/{sessionId}/recover
x-api-key: your-api-key
```

#### 6. Delete Session
```http
DELETE /sessions/{sessionId}
x-api-key: your-api-key
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| HOST | 0.0.0.0 | Server host |
| PUBLIC_URL | http://localhost:3000 | Public URL (for QR encoding) |
| API_KEY | change-me | API authentication key |
| SESSION_TTL_MINUTES | 60 | Session expiration time |
| SESSION_CLEANUP_MINUTES | 10 | Cleanup job interval |
| LOG_LEVEL | info | Logging level |
| CORS_ORIGIN | * | CORS allowed origins |

## File Structure

```
pairing-service/
├── public/                 # Static web interface
│   ├── index.html         # Main page
│   ├── css/
│   │   └── style.css      # Styling
│   ├── js/
│   │   └── main.js        # Frontend logic
│   └── assets/            # Images, fonts, etc
│
├── src/
│   ├── app.js             # Express app configuration
│   ├── config.js          # Configuration loader
│   ├── bot-integration.js # Bot utilities
│   ├── database/
│   │   └── sessionStore.js # Session management
│   ├── routes/
│   │   └── pairing.routes.js # API endpoints
│   └── utils/
│       ├── cleanup.js     # Session cleanup
│       ├── errors.js      # Error handling
│       ├── logger.js      # Logging
│       ├── pairing.js     # Pairing utilities
│       ├── phone.js       # Phone validation
│       ├── security.js    # Authentication
│       └── ws.js          # WebSocket server
│
├── sessions/              # WhatsApp sessions (created at runtime)
├── logs/                  # Application logs
├── server.js              # Entry point
├── package.json           # Dependencies
├── ecosystem.config.cjs   # PM2 configuration
└── .env.example           # Environment template
```

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Run Production Server
```bash
npm start
```

### Monitor with PM2
```bash
npm run prod
```

## Production Deployment

### On Render

1. Push to GitHub
2. Create new Web Service on render.com
3. Set Root Directory to `pairing-service`
4. Configure environment variables
5. Deploy

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed instructions.

## Security

- API Key authentication on all endpoints
- Rate limiting: 5 requests per 5 minutes for pairing
- Phone number validation (8-15 digits)
- Session expiration: 60 minutes default
- CORS configuration
- Helmet security headers
- No sensitive data in logs

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/pairing/health
```

### View Logs
```bash
# Development
npm run dev

# Production
# Check Render dashboard Logs tab
```

### WebSocket Connection
- Real-time session updates
- Fallback to polling if WebSocket unavailable
- Automatic reconnection on failure

## Pairing Code Format

Generated codes follow the pattern: `XXXX-XXXX`

Examples:
- `ARRF-RTRE`
- `K8M2-9QP1`
- `B3T5-6LW9`

Format: 8 random alphanumeric characters with hyphen at position 5

## Integration with Main Bot

### Using Paired Sessions

```javascript
// In bot.js
import { getSession } from './pairing-service/src/database/sessionStore.js';

// Get the paired session
const sessionId = process.env.PAIRED_SESSION_ID;
const session = await getSession(sessionId);

// Access WhatsApp socket
const { socket } = session;

// Use for bot operations
socket.ev.on('messages.upsert', (msg) => {
  // Handle messages
});
```

### Session Storage

Sessions are stored in `pairing-service/sessions/{sessionId}/`:
- `creds.json` - WhatsApp credentials
- `pre-key-*.json` - Pre-keys
- Session metadata

## Troubleshooting

### "Phone number invalid"
- Ensure correct international format (8-15 digits)
- Remove +, spaces, dashes

### "Session expired"
- Sessions last 1 hour by default
- Generate new pairing code

### "Rate limit exceeded"
- Max 5 pairing attempts per 5 minutes
- Wait before retrying

### "WebSocket connection failed"
- Frontend automatically falls back to polling
- Check browser console for errors
- Verify CORS settings

## Performance Notes

- Free Render tier: ~50-100MB memory
- Supports ~50 concurrent sessions
- For higher load: upgrade Render plan or use database session store

## License

ISC

## Support

For issues, check:
1. Console logs (development)
2. Render dashboard logs (production)
3. Browser console (client-side errors)
4. Phone number format validation
5. API key configuration
