# RealChat Backend API Documentation

## Başladıcı

### Port
- **Development**: 3001
- **Production** (Render): Avtomatik təyin olunur

### Installation
```bash
cd backend
npm install
npm start
```

---

## 📡 API Endpoints

### 1. Health Check
```
GET /health
```
Server statusunu yoxlayır.
```json
{ "ok": true }
```

---

### 2. Registration - Request OTP
```
POST /api/register/request-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "securepass123"
}
```

**Validations:**
- Email: valid format
- Username: min 3 simvol
- Password: min 6 simvol

**Response (200):**
```json
{
  "ok": true,
  "message": "OTP göndərildi",
  "expiresInSec": 300
}
```

**Errors:**
- 400: Invalid input
- 409: Email/Username already exists
- 500: Email göndərilmədi

---

### 3. Registration - Verify OTP
```
POST /api/register/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "username": "john_doe",
  "email": "user@example.com"
}
```

Sets HTTP-only cookies:
- `access_token` (15 min)
- `refresh_token` (7 days)

---

### 4. Login
```
POST /api/login
Content-Type: application/json

{
  "identifier": "john_doe",  // username yada email
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "username": "john_doe",
  "email": "user@example.com"
}
```

Sets auth cookies (same as registration).

---

### 5. Get Current User
```
GET /api/me
```

**Response (authenticated - 200):**
```json
{
  "authenticated": true,
  "id": "uuid",
  "username": "john_doe",
  "email": "user@example.com"
}
```

**Response (anonymous - 200):**
```json
{
  "authenticated": false,
  "id": null,
  "username": null,
  "email": null
}
```

---

### 6. Logout
```
POST /api/logout
```
Clears cookies, revokes session.

**Response (200):**
```json
{ "ok": true }
```

---

### 7. Logout All Devices
```
POST /api/logout-all
```
Requires authentication. Revokes ALL refresh tokens.

**Response (200):**
```json
{ "ok": true }
```

---

### 8. Refresh Access Token
```
POST /api/refresh
```
Automatically sends new access_token cookie.

**Response (200):**
```json
{ "ok": true }
```

---

## 🔌 WebSocket (Socket.IO)

### Authentication
WebSocket-ə qoşulmaq üçün access token lazımdır:
```javascript
const socket = io('https://your-render-url.onrender.com', {
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 10,
  transports: ['websocket'],
  agent: false,
  upgrade: false,
  rejectUnauthorized: false
});
```

Socket.io client-side cookies-dən token oxuyur avtomatik.

### Events

#### 1. Join Room
```javascript
socket.emit('auth:join', { room: 'general' });

// Listen for history
socket.on('room:history', (messages) => {
  console.log('Əvvəlki mesajlar:', messages);
});

// Listen for join confirmation
socket.on('room:joined', ({ room, users }) => {
  console.log('Otaqda olanlar:', users);
});
```

#### 2. Send Message
```javascript
socket.emit('message:send', {
  room: 'general',
  text: 'Salam, dünya!',
  clientId: 'optional-uuid-for-optimistic-ui'
});

// Listen for delivery confirmation
socket.on('message:delivered', ({ clientId, messageId }) => {
  console.log('Mesaj göndərildi:', messageId);
});

// Listen for new messages (from others)
socket.on('message:new', (message) => {
  console.log('Yeni mesaj:', message);
});
```

#### 3. Typing Indicator
```javascript
socket.emit('typing', { room: 'general', isTyping: true });

socket.on('typing', ({ username, isTyping }) => {
  console.log(`${username} typing...`);
});
```

#### 4. Message Read/Seen
```javascript
socket.emit('message:read', { room: 'general', readUpTo: messageId });

socket.on('message:seen', ({ readUpTo }) => {
  console.log('Oğurlandı qədər:', readUpTo);
});
```

#### 5. Room Users
```javascript
socket.on('room:users', ({ room, users }) => {
  console.log('Otaqda olanlar:', users);
});
```

---

## 🔐 Security Features

- **JWT Auth**: Access (15m) + Refresh (7d) tokens
- **Password Hashing**: bcryptjs
- **HTTP-only Cookies**: CSRF-proof
- **CORS**: Frontend origin kontrolü
- **SQLite**: Persistent data
- **Socket.io Auth**: Token verification

---

## 🚀 Render.com Deployment

### 1. GitHub-a Push Et
```bash
git add .
git commit -m "Initial RealChat Backend"
git push origin main
```

### 2. Render Dashboard
- New Web Service
- Connect GitHub repo
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 3. Environment Variables (Render > Environment)
```
PORT=3001
NODE_ENV=production
FRONTEND_ORIGIN=https://your-frontend.vercel.app
ACCESS_SECRET=generate-strong-random-string
REFRESH_SECRET=generate-strong-random-string
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=app_password_from_gmail
SMTP_FROM=noreply@realchat.com
```

### 4. Yoxlama
```bash
curl https://your-render-url.onrender.com/health
```

---

## 📁 Database Schema

### users
```sql
- id (TEXT PRIMARY KEY)
- username (TEXT UNIQUE)
- email (TEXT UNIQUE)
- pass_hash (TEXT)
- created_at (INTEGER)
```

### messages
```sql
- id (TEXT PRIMARY KEY)
- room (TEXT)
- username (TEXT)
- text (TEXT)
- system (INTEGER) -- 0 or 1
- created_at (INTEGER)
```

### refresh_tokens
```sql
- token (TEXT PRIMARY KEY)
- user_id (TEXT)
- expires_at (INTEGER)
- revoked_at (INTEGER, nullable)
```

### otp_codes
```sql
- email (TEXT PRIMARY KEY)
- code_hash (TEXT)
- expires_at (INTEGER)
- username (TEXT)
- pass_hash (TEXT)
```

---

## 🐛 Debugging

Enable debug logs:
```bash
DEBUG=* npm start
```

Check SQLite database:
```bash
npm install -g sqlite3
sqlite3 data.sqlite
.tables
.schema
```

---

## 📝 Notes

- SQLite database filə yazılır (`data.sqlite`)
- Render-də ephemeral filesystem var, reset olur redeploy-da
- Production üçün PostgreSQL istifadə etməyi düşünün
- Email göndərmə Gmail App Password tələb edir
