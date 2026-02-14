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

### Authentication

#### 1. Health Check
```
GET /health
```
Server statusunu yoxlayır.
```json
{ "ok": true }
```

#### 2. Registration - Request OTP
```
POST /api/register/request-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "ok": true,
  "message": "OTP göndərildi",
  "expiresInSec": 300
}
```

#### 3. Registration - Verify OTP
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

#### 4. Login
```
POST /api/login
Content-Type: application/json

{
  "identifier": "john_doe",
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

#### 5. Get Current User
```
GET /api/me
```

**Response (200):**
```json
{
  "authenticated": true,
  "id": "uuid",
  "username": "john_doe",
  "email": "user@example.com"
}
```

#### 6. Logout
```
POST /api/logout
```

**Response (200):**
```json
{ "ok": true }
```

#### 7. Logout All Devices
```
POST /api/logout-all
```
Requires authentication.

**Response (200):**
```json
{ "ok": true }
```

#### 8. Refresh Access Token
```
POST /api/refresh
```

**Response (200):**
```json
{ "ok": true }
```

---

### Room Management

#### Create Room (Generates Unique ID)
```
POST /api/rooms/create
Authorization: Bearer <access_token>

{
  "name": "general"
}
```

**Response (200):**
```json
{
  "id": "room-uuid",
  "name": "general"
}
```

#### Delete Room (Soft Delete - 6 Month Auto-Purge)
```
DELETE /api/rooms/:roomId
Authorization: Bearer <access_token>
```

Soft deletes room. Permanently deleted after 6 months via `/api/cleanup/old-rooms`.

**Response (200):**
```json
{ "ok": true }
```

---

### Invite/Share System

#### Create Invite Link
```
POST /api/invites/create
Authorization: Bearer <access_token>

{
  "roomId": "room-uuid",
  "expirationDays": 7
}
```

**Response (200):**
```json
{
  "inviteToken": "ABC123DEF456GHIJ",
  "expiresAt": 1234567890000,
  "roomId": "room-uuid"
}
```

#### Resolve Invite Link (Join Room)
```
POST /api/invites/resolve
Authorization: Bearer <access_token>

{
  "inviteToken": "ABC123DEF456GHIJ"
}
```

**Response (200):**
```json
{
  "room": {
    "id": "room-uuid",
    "name": "room-name"
  }
}
```

---

### Maintenance

#### Cleanup Old Rooms & Expired Invites
```
POST /api/cleanup/old-rooms
```

Runs automatically but can be called manually for scheduled tasks:
- Deletes soft-deleted rooms older than 6 months
- Removes expired invite tokens

**Response (200):**
```json
{ "ok": true }
```

---

## 🔌 WebSocket (Socket.IO)

### Authentication
WebSocket-ə access token (cookie) ilə qoşulur.

### Events

#### 1. Join Room
```javascript
socket.emit('auth:join', { room: 'general' });

// Listen for history
socket.on('room:history', (messages) => {
  // Array of messages with edit/delete status
});

// Confirmation
socket.on('room:joined', ({ room, users }) => {
  // Current users in room
});

socket.on('room:users', ({ room, users }) => {
  // User list updated
});
```

---

#### 2. Send Message (with Reply Support)
```javascript
socket.emit('message:send', {
  room: 'general',
  text: 'Salam, dünya!',
  clientId: 'optional-uuid',
  replyToId: 'optional-message-id'  // NEW: For message replies
});

socket.on('message:delivered', ({ clientId, messageId }) => {
  // Message successfully stored
});

socket.on('message:new', (message) => {
  // Message object with all fields:
  // {
  //   id, room, userId, username, text,
  //   createdAt, editedAt, deletedAt, deletedForAll,
  //   replyToId,
  //   replyTo: { id, userId, username, text, createdAt }
  // }
});
```

---

#### 3. Edit Message (Sender Only)
```javascript
socket.emit('message:edit', {
  messageId: 'msg-id',
  newText: 'Updated message text'
});

socket.on('message:edited', (message) => {
  // Updated message with editedAt timestamp
  // {
  //   id, text, editedAt, ...
  // }
});
```

---

#### 4. Delete Message
```javascript
// Delete for self only (others still see it)
socket.emit('message:delete', {
  messageId: 'msg-id',
  deleteForAll: false
});

socket.on('message:deleted-me', { messageId });

// Delete for all users (sender only)
socket.emit('message:delete', {
  messageId: 'msg-id',
  deleteForAll: true
});

socket.on('message:deleted-all', { messageId });
```

---

#### 5. Message Status / Read Receipts (with User)
```javascript
// Mark specific message as seen
socket.emit('message:status', {
  messageId: 'msg-id',
  status: 'seen'  // or 'delivered'
});

socket.on('message:status-update', {
  messageId: 'msg-id',
  statuses: [
    { messageId, userId, status: 'seen' },
    { messageId, userId, status: 'delivered' }
  ]
});

// Mark all messages up to point as read
socket.emit('message:read', {
  room: 'general',
  readUpTo: 'latest-msg-id'
});

socket.on('message:seen', {
  readUpTo: 'msg-id',
  statuses: [
    { messageId, userId, status: 'seen' }
  ]
});
```

---

#### 6. Typing Indicator
```javascript
socket.emit('typing', { room: 'general', isTyping: true });

socket.on('typing', ({ username, isTyping }) => {
  // Someone is typing
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
- **Soft Deletes**: Message and room history preservation
- **Invite Tokens**: Secure room sharing links

---

## 📁 Database Schema (Enhanced)

### users
```sql
- id TEXT PRIMARY KEY
- username TEXT UNIQUE
- email TEXT UNIQUE
- pass_hash TEXT
- created_at INTEGER
```

### rooms
```sql
- id TEXT PRIMARY KEY
- name TEXT UNIQUE
- creator_id TEXT (FK: users)
- created_at INTEGER
- deleted_at INTEGER (soft delete)
```

### room_invites
```sql
- id TEXT PRIMARY KEY
- room_id TEXT (FK: rooms)
- invite_token TEXT UNIQUE
- created_by TEXT (FK: users)
- created_at INTEGER
- expires_at INTEGER (nullable, auto-cleanup)
- used_count INTEGER
```

### messages (Enhanced)
```sql
- id TEXT PRIMARY KEY
- room TEXT
- user_id TEXT (FK: users)
- client_id TEXT (for optimistic UI)
- username TEXT
- text TEXT
- system INTEGER (0 or 1)
- created_at INTEGER
- edited_at INTEGER (nullable)
- deleted_at INTEGER (nullable, soft delete)
- deleted_for_all INTEGER (boolean)
- reply_to_id TEXT (FK: messages, nullable)
```

### message_status (NEW: Read Receipts with User)
```sql
- message_id TEXT (FK: messages)
- user_id TEXT (FK: users)
- status TEXT ('delivered', 'seen')
- updated_at INTEGER
- PRIMARY KEY (message_id, user_id)
```

### refresh_tokens
```sql
- token TEXT PRIMARY KEY
- user_id TEXT (FK: users)
- created_at INTEGER
- expires_at INTEGER
- revoked_at INTEGER (nullable)
```

### otp_codes
```sql
- email TEXT PRIMARY KEY
- code_hash TEXT
- expires_at INTEGER
- username TEXT
- pass_hash TEXT
```

---

## 🚀 Deployment

### Environment Variables
```
PORT=3001
NODE_ENV=production
FRONTEND_ORIGIN=https://your-frontend.vercel.app
ACCESS_SECRET=generate-strong-random-string
REFRESH_SECRET=generate-strong-random-string
BREVO_API_KEY=your-brevo-api-key
SMTP_FROM=noreply@realchat.com
```

---

## 📝 New Features

✅ **Unique Room IDs** - Each room gets a UUID for global uniqueness
✅ **Room Deletion** - Soft deletes, auto-purged after 6 months
✅ **Invite System** - Shareable links with optional expiration
✅ **Message Editing** - Edit timestamp tracked, original preserved
✅ **Message Deletion** - Delete for self or all users
✅ **Message Replies** - Quote/reply to specific messages
✅ **Read Receipts** - Per-user message status tracking (delivered/seen)
