# RealChat Backend

Express.js + Socket.io + JWT Auth + SQLite ilə yazılmış Real-time Chat Application Backend-i.

## Xüsusiyyətlər

✅ **User Authentication**
- OTP-based registration (email verification)
- JWT-based login (access + refresh tokens)
- Secure password hashing (bcryptjs)
- HTTP-only cookies

✅ **Real-time Chat**
- Socket.io integration
- Multi-room support
- Message history (50 last messages)
- User presence tracking
- Typing indicators
- Message read status

✅ **Security**
- CORS configuration
- Access token (15 min) + Refresh token (7 days)
- Password validation
- Email normalization
- CSRF protection

## Quraşdırma

### Lokal Olaraq

```bash
# Dependencies quraşdır
npm install

# .env faylı yarat (.env.example-dən)
cp .env.example .env

# Development server başlat
npm start
```

Server http://localhost:3001 ünvanında başlayacaq.

### Environment Variables

`.env` faylında aşağıdakılar lazımdır:

```env
PORT=3001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

ACCESS_SECRET=your_secret_key
REFRESH_SECRET=your_secret_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@realchat.com
```

## API Endpoints

### Authentication

**POST /api/register/request-otp**
- Email-ə OTP göndər
- Body: `{ email, username, password }`

**POST /api/register/verify-otp**
- OTP doğrula və istifadəçi yarat
- Body: `{ email, code }`
- Returns: User data + auth cookies

**POST /api/login**
- Email/username ilə daxil ol
- Body: `{ identifier, password }`

**POST /api/logout**
- Cookies silinir

**POST /api/logout-all**
- Bütün cihazlardan çıx

**GET /api/me**
- Cari istifadəçi məlumatı

**POST /api/refresh**
- Token refresh

### WebSocket (Socket.io)

**auth:join** - Otaqaya qoşul
```javascript
socket.emit('auth:join', { room: 'general' });
socket.on('room:history', messages => {});
socket.on('room:joined', { room, users } => {});
```

**message:send** - Mesaj göndər
```javascript
socket.emit('message:send', { room, text, clientId });
socket.on('message:delivered', { clientId, messageId } => {});
socket.on('message:new', message => {});
```

**typing** - Typing göstəri
```javascript
socket.emit('typing', { room, isTyping });
socket.on('typing', { username, isTyping } => {});
```

Bütün endpoints haqda: **[API_DOCS.md](./API_DOCS.md)**

## Database

SQLite istifadə edilir (`data.sqlite`):

- **users** - İstifadəçi məlumatları
- **messages** - Chat mesajları
- **refresh_tokens** - Token management
- **otp_codes** - OTP verification

## Deployment

### Render.com-a Deploy

1. GitHub-ə push et
2. Render New Web Service
3. Root Directory: `backend`
4. Build: `npm install`
5. Start: `npm start`
6. Environment variables əlavə et

**[DEPLOYMENT.md](./DEPLOYMENT.md)** faylında detallı bələdçi.

## Development

```bash
# Dev mode (nodemon)
npm run dev

# Test server
curl http://localhost:3001/health

# Logs izlə
DEBUG=* npm start
```

## Frontend Integration

Frontend-də:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url
```

```javascript
// API call
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
  method: 'POST',
  credentials: 'include',  // important!
  body: JSON.stringify(...)
});

// Socket connection
import io from 'socket.io-client';
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL);
```

## Struktur

```
backend/
├── index.js          # Main server file
├── db.js             # SQLite database layer
├── mail.js           # Email configuration
├── package.json      # Dependencies
├── Procfile          # Render deployment
├── .env.example      # Environment template
├── API_DOCS.md       # API documentation
└── DEPLOYMENT.md     # Deployment guide
```

## Notes

- SQLite local file-based. Production-da PostgreSQL istifadə edin.
- Free Tier Render-də 15 min inactivity sonra cold start.
- Email göndərmə üçün Gmail App Password lazımdır.
- Refresh token 7 gün, access token 15 dəqiqə valid.

## License

MIT
