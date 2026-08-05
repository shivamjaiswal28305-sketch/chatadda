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
const io = new Server(server);

app.use(express.json());

// Public folder ko dhoondo, chahe uske naam me koi invisible character ho
const publicDirName = fs.readdirSync(__dirname, { withFileTypes: true })
  .find(e => e.isDirectory() && e.name.replace(/[^\x20-\x7E]/g, '') === 'public')?.name || 'public';
app.use(express.static(path.join(__dirname, publicDirName)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- MongoDB connect ----------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatadda';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// ---------- REST routes ----------
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);

// Chat history: last 50 messages of a room (public or a private pair-id)
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

// All registered users (for contacts/search — phase 2 me UI banega)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username isOnline lastSeen').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Users load nahi ho paye' });
  }
});

// ---------- socket <-> username tracking ----------
const onlineUsers = {}; // socketId -> { userId, username }

const blockedWords = ['badword1', 'badword2'];
function cleanMessage(msg) {
  let clean = msg;
  blockedWords.forEach(w => {
    const regex = new RegExp(w, 'gi');
    clean = clean.replace(regex, '***');
  });
  return clean;
}

function findSocketIdByUsername(username) {
  return Object.keys(onlineUsers).find(id => onlineUsers[id].username === username);
}

// Private room id: dono usernames ko sort karke jodo, taaki dono taraf se same room-id bane
function privateRoomId(u1, u2) {
  return [u1, u2].sort().join('__');
}

const reportsFile = path.join(__dirname, 'reports.json');
function saveReport(entry) {
  let reports = [];
  try {
    if (fs.existsSync(reportsFile)) reports = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
  } catch (e) { reports = []; }
  reports.push(entry);
  try { fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2)); }
  catch (e) { console.error('Report save failed:', e.message); }
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // ---------- JOIN (ab JWT token se, Google Sign-In ki jagah) ----------
  socket.on('join', async (token) => {
    const payload = verifyToken(token);
    if (!payload) {
      socket.emit('authError', 'Session expire ho gaya, dobara login karo');
      return;
    }
    const user = await User.findById(payload.userId);
    if (!user) {
      socket.emit('authError', 'User nahi mila, dobara login karo');
      return;
    }

    onlineUsers[socket.id] = { userId: String(user._id), username: user.username };
    socket.username = user.username;
    socket.userId = String(user._id);

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    socket.emit('joined', user.username);
    io.emit('system', `${user.username} chat me aa gaye`);
    io.emit('userList', Object.values(onlineUsers).map(u => u.username));
  });

  // ---------- PUBLIC MESSAGE (text/image/document/location) ----------
  socket.on('chatMessage', async (data) => {
    if (!socket.username) return;
    const type = ['text', 'image', 'document', 'location'].includes(data.type) ? data.type : 'text';
    const text = type === 'text' ? cleanMessage(String(data.text || '').slice(0, 500)) : '';

    const msgDoc = await Message.create({
      room: 'public',
      fromUser: socket.userId,
      fromUsername: socket.username,
      type,
      text,
      mediaUrl: data.mediaUrl || '',
      mediaName: data.mediaName || '',
      location: data.location || undefined
    });

    io.emit('chatMessage', {
      _id: msgDoc._id,
      username: socket.username,
      type,
      text,
      mediaUrl: msgDoc.mediaUrl,
      mediaName: msgDoc.mediaName,
      location: msgDoc.location,
      time: new Date(msgDoc.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });
  });

  // ---------- PRIVATE MESSAGE ----------
  socket.on('privateMessage', async ({ toUsername, text, type, mediaUrl, mediaName, location }) => {
    if (!socket.username || !toUsername) return;
    const targetUser = await User.findOne({ username: toUsername });
    if (!targetUser) return;

    const msgType = ['text', 'image', 'document', 'location'].includes(type) ? type : 'text';
    const cleanText = msgType === 'text' ? cleanMessage(String(text || '').slice(0, 500)) : '';
    const room = privateRoomId(socket.username, toUsername);

    const msgDoc = await Message.create({
      room,
      fromUser: socket.userId,
      fromUsername: socket.username,
      toUser: targetUser._id,
      type: msgType,
      text: cleanText,
      mediaUrl: mediaUrl || '',
      mediaName: mediaName || '',
      location: location || undefined
    });

    const time = new Date(msgDoc.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const payload = {
      _id: msgDoc._id,
      from: socket.username,
      to: toUsername,
      type: msgType,
      text: cleanText,
      mediaUrl: msgDoc.mediaUrl,
      mediaName: msgDoc.mediaName,
      location: msgDoc.location,
      time
    };
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('privateMessage', payload);
    socket.emit('privateMessage', payload);
  });

  // ---------- READ RECEIPTS ----------
  socket.on('markRead', async ({ room }) => {
    if (!socket.userId || !room) return;
    await Message.updateMany(
      { room, readBy: { $ne: socket.userId } },
      { $addToSet: { readBy: socket.userId } }
    );
    io.to(findSocketIdByUsername(socket.username) || socket.id).emit('readAck', { room });
    // Doosre user ko bhi batao ki maine padh liya (blue-tick jaisa)
    const otherUsername = room.split('__').find(u => u !== socket.username);
    if (otherUsername) {
      const targetId = findSocketIdByUsername(otherUsername);
      if (targetId) io.to(targetId).emit('messagesRead', { room, byUsername: socket.username });
    }
  });

  socket.on('typing', () => {
    if (socket.username) socket.broadcast.emit('typing', socket.username);
  });

  socket.on('privateTyping', (toUsername) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId && socket.username) io.to(targetId).emit('privateTyping', socket.username);
  });

  socket.on('reportUser', ({ reportedUsername, reason }) => {
    if (!socket.username) return;
    const entry = {
      reportedBy: socket.username,
      reportedUser: reportedUsername,
      reason: String(reason || 'No reason given').slice(0, 300),
      time: new Date().toISOString()
    };
    saveReport(entry);
    socket.emit('reportReceived', reportedUsername);
  });

  // ---------- CALLING (unchanged) ----------
  socket.on('callOffer', ({ toUsername, offer, callType }) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId && socket.username) {
      io.to(targetId).emit('callOffer', { fromUsername: socket.username, offer, callType });
    } else {
      socket.emit('callFailed', { toUsername, reason: 'offline' });
    }
  });

  socket.on('callAnswer', ({ toUsername, answer }) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('callAnswer', { fromUsername: socket.username, answer });
  });

  socket.on('iceCandidate', ({ toUsername, candidate }) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('iceCandidate', { fromUsername: socket.username, candidate });
  });

  socket.on('callReject', ({ toUsername }) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('callReject', { fromUsername: socket.username });
  });

  socket.on('callEnd', ({ toUsername }) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('callEnd', { fromUsername: socket.username });
  });

  // ---------- DISCONNECT ----------
  socket.on('disconnect', async () => {
    if (socket.username) {
      io.emit('system', `${socket.username} chale gaye`);
      io.emit('callEnd', { fromUsername: socket.username });
      delete onlineUsers[socket.id];
      io.emit('userList', Object.values(onlineUsers).map(u => u.username));

      try {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
      } catch (e) { /* ignore */ }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
});

