# Chat App Backend API

Express.js ilə yazılmış Chat Uygulaması Backend API-si.

## Quraşdırma

### Yerli Ortamda (Local)

```bash
# Dependencies quraşdır
npm install

# .env faylı yarat
cp .env.example .env

# Development mode-da başlat
npm run dev

# Production-da başlat
npm start
```

Server http://localhost:5000 adresində işləyəcəkdir.

## API Endpoints

### Health Check
```
GET /api/health
```
Server statusunu yoxlayır.

**Cavab:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Mesajlar Almaq
```
GET /api/messages
```
Bütün mesajları qaytarır.

**Cavab:**
```json
[
  {
    "id": 1,
    "username": "Ali",
    "message": "Salam!",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ali"
  }
]
```

### Yeni Mesaj Göndərmək
```
POST /api/messages
```

**Request Body:**
```json
{
  "username": "Ali",
  "message": "Salam hamı!"
}
```

**Cavab:**
```json
{
  "id": 1705320600000,
  "username": "Ali",
  "message": "Salam hamı!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ali"
}
```

### İstifadəçilər Almaq
```
GET /api/users
```

**Cavab:**
```json
[
  {
    "id": 1,
    "username": "Ali",
    "email": "ali@example.com",
    "status": "online",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ali"
  }
]
```

### Otaqlar Almaq
```
GET /api/rooms
```

**Cavab:**
```json
[
  {
    "id": 1,
    "name": "General",
    "description": "Ümumi söhbətləri üçün",
    "members": 24,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

## Render.com-da Deploy

### 1. GitHub-a Push Et

```bash
git add .
git commit -m "Backend setup for Render deployment"
git push origin main
```

### 2. Render.com-da Deploy Et

1. [Render.com](https://render.com) saytına daxil ol
2. **New** → **Web Service** seç
3. GitHub repo-nu seç
4. Parametrlər:
   - **Name:** `chat-app-backend` (və ya istədiyin ad)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Advanced** → Environment variables əlavə et:
   - `NODE_ENV=production`
   - `PORT=5000` (Render avtomatik əlavə edir)
6. **Create Web Service** yə basaraq deploy et

### 3. Environment Variables

Render dashboard-da əlavə et:
```
NODE_ENV=production
API_URL=https://your-app-name.onrender.com
```

## Qeydlər

- Server avtomatik PORT dəyişəninə başlayır (Render üçün vacibdir)
- CORS bütün origin-lərdən sorğulara icazə verir
- Error handling və 404 handler tətbiq edilmişdir
- Development-da `nodemon` istifadə et, production-da `node` istifadə olunur

## Lisenziya

MIT
