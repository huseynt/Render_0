const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Get messages endpoint
app.get('/api/messages', (req, res) => {
  const messages = [
    {
      id: 1,
      username: 'Ali',
      message: 'Salam! Bu chat uygulaması işləyir.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali'
    },
    {
      id: 2,
      username: 'Ayşe',
      message: 'Salam Ali! Mövcuddur.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse'
    },
    {
      id: 3,
      username: 'Ali',
      message: 'Render-da deploy edildi!',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali'
    }
  ];
  res.json(messages);
});

// Get users endpoint
app.get('/api/users', (req, res) => {
  const users = [
    {
      id: 1,
      username: 'Ali',
      email: 'ali@example.com',
      status: 'online',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali'
    },
    {
      id: 2,
      username: 'Ayşe',
      email: 'ayse@example.com',
      status: 'online',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse'
    },
    {
      id: 3,
      username: 'Məhəmməd',
      email: 'mehemmed@example.com',
      status: 'offline',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehemmed'
    }
  ];
  res.json(users);
});

// Get rooms endpoint
app.get('/api/rooms', (req, res) => {
  const rooms = [
    {
      id: 1,
      name: 'General',
      description: 'Ümumi söhbətləri üçün',
      members: 24,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
    },
    {
      id: 2,
      name: 'Random',
      description: 'Təsadüfi söhbətlər',
      members: 18,
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString()
    },
    {
      id: 3,
      name: 'Technology',
      description: 'Texnologiya haqqında',
      members: 32,
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
    }
  ];
  res.json(rooms);
});

// Post message endpoint
app.post('/api/messages', (req, res) => {
  const { username, message } = req.body;

  if (!username || !message) {
    return res.status(400).json({
      error: 'username və message tələb olunur'
    });
  }

  const newMessage = {
    id: Date.now(),
    username,
    message,
    timestamp: new Date().toISOString(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  };

  res.status(201).json(newMessage);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Bir xəta baş verdi',
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint tapılmadı',
    path: req.path
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda işləyir`);
  console.log(`🌍 http://localhost:${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   GET  /api/health    - Server statusu`);
  console.log(`   GET  /api/messages  - Bütün mesajlar`);
  console.log(`   GET  /api/users     - Bütün istifadəçilər`);
  console.log(`   GET  /api/rooms     - Bütün otaqlar`);
  console.log(`   POST /api/messages  - Yeni mesaj göndər`);
});

module.exports = app;
