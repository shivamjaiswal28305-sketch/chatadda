require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const User = require('./models/User');
const Message = require('./models/Message');
const { router: authRouter, verifyToken } = require('./routes/auth');
const uploadRouter = require('./routes/upload');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

const publicDirName = fs.readdirSync(__dirname, { withFileTypes: true })
  .find(e => e.isDirectory() && e.name.replace(/[^\x20-\x7E]/g, '') === 'public')?.name || 'public';
app.use(express.static(path.join(__dirname, publicDirName)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatadda';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);

app.get('/api/messages/:room', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: 'History load nahi ho payi' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username isOnline lastSeen photoUrl').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Users load nahi ho paye' });
  }
});

app.get('/api/users/search', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'Phone number do' });

    const user = await User.findOne({ phone: String(phone) }, 'username photoUrl').lean();
    if (!user) return res.status(404).json({ error: 'Ye number ChatAdda pe registered nahi hai' });

    res.json({ username: user.username, photoUrl: user.photoUrl || '' });
  } catch (err) {
    res.status(500).json({ error: 'Search fail hua' });
  }
});

app.post('/api/users/photo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Session expire ho gaya, dobara login karo' });

    const { photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ error: 'Photo URL do' });

    const user = await User.findByIdAndUpdate(payload.userId, { photoUrl }, { new: true });
    if (!user) return res.status(404).json({ error: 'User nahi mila' });

    io.emit('presenceUpdate', {
      username: user.username,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      photoUrl: user.photoUrl
    });

    res.json({ photoUrl: user.photoUrl });
  } catch (err) {
    res.status(500).json({ error: 'DP update fail hua' });
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication error: Token missing'));
  
  const payload = verifyToken(token);
  if (!payload) return next(new Error('Authentication error: Invalid Token'));
  
  socket.userId = payload.userId;
  next();
});

const publicRoomUsers = new Set();
const blockedWords = ['badword1', 'badword2'];

function cleanMessage(msg) {
  let clean = msg;
  blockedWords.forEach(w => {
    const regex = new RegExp(w, 'gi');
    clean = clean.replace(regex, '***');
  });
  return clean;
}

const ALLOWED_MSG_TYPES = ['text', 'image', 'document', 'location', 'audio', 'contact'];

io.on('connection', async (socket) => {
  try {
    const user = await User.findById(socket.userId);
    if (!user) {
      socket.disconnect();
      return;
    }

    socket.username = user.username;
    socket.join(user.username);

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    socket.emit('joined', user.username);
    io.emit('presenceUpdate', { username: user.username, isOnline: true, lastSeen: user.lastSeen, photoUrl: user.photoUrl });

    socket.on('enterPublicRoom', () => {
      publicRoomUsers.add(socket.username);
      io.emit('system', `${socket.username} chat me aa gaye`);
      io.emit('userList', Array.from(publicRoomUsers));
    });

    socket.on('leavePublicRoom', () => {
      publicRoomUsers.delete(socket.username);
      io.emit('userList', Array.from(publicRoomUsers));
    });

    socket.on('chatMessage', async (data) => {
      try {
        const type = ALLOWED_MSG_TYPES.includes(data.type) ? data.type : 'text';
        const text = type === 'text' ? cleanMessage(String(data.text || '').slice(0, 500)) : '';

        const msgDoc = await Message.create({
          room: 'public',
          fromUser: socket.userId,
          fromUsername: socket.username,
          type,
          text,
          mediaUrl: data.mediaUrl || '',
          mediaName: data.mediaName || '',
          mediaDuration: type === 'audio' ? Number(data.duration || 0) : 0,
          location: data.location || undefined,
          contactName: type === 'contact' ? String(data.contactName || '').slice(0, 60) : '',
          contactPhone: type === 'contact' ? String(data.contactPhone || '').slice(0, 20) : ''
        });

        io.emit('chatMessage', {
          _id: msgDoc._id,
          username: socket.username,
          type,
          text,
          mediaUrl: msgDoc.mediaUrl,
          mediaName: msgDoc.mediaName,
          duration: msgDoc.mediaDuration,
          location: msgDoc.location,
          contactName: msgDoc.contactName,
          contactPhone: msgDoc.contactPhone,
          deleted: false,
          edited: false,
          reactions: [],
          createdAt: msgDoc.createdAt
        });
      } catch (e) {
        console.error('chatMessage error:', e.message);
      }
    });

    socket.on('privateMessage', async ({ toUsername, text, type, mediaUrl, mediaName, duration, location, contactName, contactPhone }) => {
      try {
        if (!toUsername) return;
        const targetUser = await User.findOne({ username: toUsername });
        if (!targetUser) return;

        const msgType = ALLOWED_MSG_TYPES.includes(type) ? type : 'text';
        const cleanText = msgType === 'text' ? cleanMessage(String(text || '').slice(0, 500)) : '';
        const room = [socket.username, toUsername].sort().join('__');

        const msgDoc = await Message.create({
          room,
          fromUser: socket.userId,
          fromUsername: socket.username,
          toUser: targetUser._id,
          type: msgType,
          text: cleanText,
          mediaUrl: mediaUrl || '',
          mediaName: mediaName || '',
          mediaDuration: msgType === 'audio' ? Number(duration || 0) : 0,
          location: location || undefined,
          contactName: msgType === 'contact' ? String(contactName || '').slice(0, 60) : '',
          contactPhone: msgType === 'contact' ? String(contactPhone || '').slice(0, 20) : ''
        });

        const payload = {
          _id: msgDoc._id,
          from: socket.username,
          to: toUsername,
          type: msgType,
          text: cleanText,
          mediaUrl: msgDoc.mediaUrl,
          mediaName: msgDoc.mediaName,
          duration: msgDoc.mediaDuration,
          location: msgDoc.location,
          contactName: msgDoc.contactName,
          contactPhone: msgDoc.contactPhone,
          deleted: false,
          edited: false,
          reactions: [],
          createdAt: msgDoc.createdAt,
          read: false
        };

        io.to(toUsername).to(socket.username).emit('privateMessage', payload);
      } catch (e) {
        console.error('privateMessage error:', e.message);
      }
    });

    socket.on('disconnect', async () => {
      if (socket.username) {
        publicRoomUsers.delete(socket.username);
        io.emit('userList', Array.from(publicRoomUsers));

        const seenAt = new Date();
        try {
          await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: seenAt });
        } catch (e) { /* ignore */ }

        io.emit('presenceUpdate', { username: socket.username, isOnline: false, lastSeen: seenAt });
      }
    });
  } catch (err) {
    console.error('Socket connection error:', err.message);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}`);
});
