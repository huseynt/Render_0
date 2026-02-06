# RealChat Backend - Render.com Deployment Bələdçisi

## 1️⃣ GitHub-a Push Et

Əvvəl backend klasığı GitHub-a push edəcəyimizi düşünüyəm. Sən `backend` folderini GitHub-a push etmən lazımdır.

```bash
# Layihə root-da
git add backend/
git commit -m "Add RealChat Backend"
git push origin main
```

---

## 2️⃣ Render.com-da Web Service Yarat

### Addım 1: Render.com-a Daxil Ol
- https://render.com → Dashboard
- **New** → **Web Service**

### Addım 2: GitHub Repo Seç
- Öz `Chat-App` repo-nu seç
- Connect

### Addım 3: Deploy Ayarları

| Ayar | Dəyər |
|------|-------|
| **Name** | `realchat-backend` (istədiyiniz ad) |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` (yaxud `Starter` premium) |

### Addım 4: Environment Variables Əlavə Et

Render → Environment bölməsinə bax:

```
PORT=3001
NODE_ENV=production
FRONTEND_ORIGIN=https://your-frontend-url.vercel.app

ACCESS_SECRET=<generate-strong-secret>
REFRESH_SECRET=<generate-strong-secret>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=<app-password-from-gmail>
SMTP_FROM=noreply@realchat.com
```

**Strong Secret Generasiya Et:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Addım 5: Deploy Et
- **Create Web Service** dəyib, Render özü deploy edəcək
- Konsolu izlə (2-3 dəqiqə çəkə bilər)

---

## 3️⃣ Frontend-i Backend-ə Qoşla

Sənin Next.js frontend-ində, `.env.local` faylına əlavə et:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.onrender.com
```

Frontend-dən API çağırışları:

```javascript
// fetch API
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
  method: 'POST',
  credentials: 'include',  // cookies üçün
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'user', password: 'pass' })
});

// Socket.io
import io from 'socket.io-client';
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 10,
  transports: ['websocket']
});
```

---

## 4️⃣ Test Et

Backend URL (Render dashboardda):
```
https://realchat-backend-xxxxx.onrender.com
```

**Health Check:**
```bash
curl https://realchat-backend-xxxxx.onrender.com/health
# { "ok": true }
```

**Register:**
```bash
curl -X POST https://realchat-backend-xxxxx.onrender.com/api/register/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"test","password":"123456"}'
```

---

## 5️⃣ Sorunları Düzəlt

### Server əlavə olmuyor
- Konsolu yoxla: `npm start` çalışırsa?
- PORT 3001-də `listen` ediyor?
- `index.js` var?

### Cookies işləmir
- `FRONTEND_ORIGIN` düzəldildi?
- CORS active?
- `credentials: 'include'` frontend-də?

### Socket.io qoşulmuyor
- Access token var?
- WebSocket enabled?
- FRONTEND_ORIGIN frontend URL-sinə yönəldi?

### Email göndərilmədi
- SMTP credentials düzəldildi?
- Gmail App Password (2FA tələb olunur)?
- SMTP_FROM sahib ola bilən email?

---

## 6️⃣ Free Tier Məhdudiyyətləri

Render Free:
- 15 dəqiqə inactivity sonra uyuyur (cold start)
- SQLite persistent deyil (redeploy-da silinir)
- Produksiya üçün **Starter** plan lazımdır ($7/ay)

**Məsləhətlər:**
- Production üçün PostgreSQL istifadə et (Render Postgres)
- Database backup
- Uptime monitoring

---

## 7️⃣ Production Checklist

- [ ] `.env` faylını `.gitignore`-ya əlavə et (push etmə!)
- [ ] ACCESS_SECRET və REFRESH_SECRET güclü olsun
- [ ] NODE_ENV=production
- [ ] FRONTEND_ORIGIN doğru olsun
- [ ] SMTP credentials işləsin
- [ ] SQLite → PostgreSQL migration (real production üçün)
- [ ] HTTPS enabled (Render otomatik)

---

## 📞 Support

Əgər qıstırırsan:
1. Render logs-u yoxla (Render Dashboard)
2. `npm start` lokal test et
3. `/health` endpoint-i çağır
