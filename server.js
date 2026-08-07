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
app.use(express.static(path.join(__dirname, publicDirName), {
  setHeaders: (res, filePath) => {
    // index.html hamesha fresh chahiye (varna purana cached HTML purani JS/CSS files
    // reference karta rahega). CSS/JS ko chhota cache diya hai kyunki unpe ?v= version
    // query already lagi hui hai — naya deploy hote hi naya URL ban jaata hai.
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
  }
}));
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

// All registered users (for contacts/search + profile photo/last seen cache)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username isOnline lastSeen photoUrl').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Users load nahi ho paye' });
  }
});

// Phone number se exact user search — sirf username+photo return karta hai, phone kabhi expose nahi hota
app.get('/api/users/search', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'Phone number do' });

    const user = await User.findOne({ phone }, 'username photoUrl').lean();
    if (!user) return res.status(404).json({ error: 'Ye number ChatAdda pe registered nahi hai' });

    res.json({ username: user.username, photoUrl: user.photoUrl || '' });
  } catch (err) {
    res.status(500).json({ error: 'Search fail hua' });
  }
});

// Apna profile photo (DP) update karo — pehle /api/upload se file upload karo, phir uska URL yahan bhejo
app.post('/api/users/photo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Session expire ho gaya, dobara login karo' });

    const { photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ error: 'Photo URL do' });

    // Sirf apne /uploads/ route se aayi hui file allow karo — koi bhi arbitrary
    // string (jisme HTML/quotes ho sakte hain) accept nahi karni, warna baad me
    // frontend pe render hote waqt XSS ban sakti hai.
    if (!/^\/uploads\/[a-zA-Z0-9._-]+$/.test(photoUrl)) {
      return res.status(400).json({ error: 'Invalid photo URL' });
    }

    const user = await User.findByIdAndUpdate(payload.userId, { photoUrl }, { new: true });
    if (!user) return res.status(404).json({ error: 'User nahi mila' });

    // Sabko turant naya DP dikhao
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

// ---------- socket <-> username tracking ----------
const onlineUsers = {}; // socketId -> { userId, username, inPublicRoom }

const blockedWords = ['badword1', 'badword2'];
function cleanMessage(msg) {
  let clean = msg;
  blockedWords.forEach(w => {
    const regex = new RegExp(w, 'gi');
    clean = clean.replace(regex, '***');
  });
  return clean;
}

// Sab message types jo abhi support hote hain (voice message aur contact share sahit)
const ALLOWED_MSG_TYPES = ['text', 'image', 'document', 'location', 'audio', 'contact'];

function findSocketIdByUsername(username) {
  return Object.keys(onlineUsers).find(id => onlineUsers[id].username === username);
}

function publicRoomUsernames() {
  return Object.values(onlineUsers).filter(u => u.inPublicRoom).map(u => u.username);
}

// Private room id: dono usernames ko sort karke jodo, taaki dono taraf se same room-id bane
function privateRoomId(u1, u2) {
  return [u1, u2].sort().join('__');
}

// Ek message jis room ka hai, uske sab participants ko event bhejo (public = sabko, private = dono taraf)
function broadcastToRoom(room, event, payload) {
  if (room === 'public') {
    io.emit(event, payload);
    return;
  }
  room.split('__').forEach((u) => {
    const sid = findSocketIdByUsername(u);
    if (sid) io.to(sid).emit(event, payload);
  });
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

  // ---------- JOIN (auth only — koi broadcast nahi, silent) ----------
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

    onlineUsers[socket.id] = { userId: String(user._id), username: user.username, inPublicRoom: false };
    socket.username = user.username;
    socket.userId = String(user._id);

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    socket.emit('joined', user.username);
    // Global presence: iske contacts/private-chat wale sab jagah "Online" dikhega, sirf Adda Room ke andar nahi
    io.emit('presenceUpdate', { username: user.username, isOnline: true, lastSeen: user.lastSeen, photoUrl: user.photoUrl });
    // NOTE: yahan koi 'system' broadcast ya 'userList' emit nahi hota — silent hai
  });

  // ---------- ADDA ROOM (public) mein ENTER karna — sirf yahan presence reveal hoti hai ----------
  socket.on('enterPublicRoom', () => {
    if (!socket.username || !onlineUsers[socket.id]) return;
    if (onlineUsers[socket.id].inPublicRoom) return; // already andar hai
    onlineUsers[socket.id].inPublicRoom = true;
    io.emit('system', `${socket.username} chat me aa gaye`);
    io.emit('userList', publicRoomUsernames());
  });

  // ---------- ADDA ROOM se LEAVE (dusri chat pe switch karte waqt) ----------
  socket.on('leavePublicRoom', () => {
    if (!socket.username || !onlineUsers[socket.id]) return;
    if (!onlineUsers[socket.id].inPublicRoom) return;
    onlineUsers[socket.id].inPublicRoom = false;
    io.emit('userList', publicRoomUsernames());
  });

  // ---------- PUBLIC MESSAGE (text/image/document/location/audio/contact) ----------
  socket.on('chatMessage', async (data) => {
    if (!socket.username) return;
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
  });

  // ---------- PRIVATE MESSAGE ----------
  socket.on('privateMessage', async ({ toUsername, text, type, mediaUrl, mediaName, duration, location, contactName, contactPhone }) => {
    if (!socket.username || !toUsername) return;
    const targetUser = await User.findOne({ username: toUsername });
    if (!targetUser) return;

    const msgType = ALLOWED_MSG_TYPES.includes(type) ? type : 'text';
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
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('privateMessage', payload);
    socket.emit('privateMessage', payload);
  });

  // ---------- EDIT MESSAGE (sirf apna, sirf text type) ----------
  socket.on('editMessage', async ({ messageId, newText }) => {
    if (!socket.userId || !messageId) return;
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (String(msg.fromUser) !== socket.userId) return; // sirf apna message edit kar sakte ho
      if (msg.type !== 'text' || msg.deleted) return;

      const cleaned = cleanMessage(String(newText || '').slice(0, 500));
      if (!cleaned.trim()) return;
      msg.text = cleaned;
      msg.edited = true;
      await msg.save();

      broadcastToRoom(msg.room, 'messageEdited', { messageId: String(msg._id), room: msg.room, newText: cleaned });
    } catch (err) { /* ignore */ }
  });

  // ---------- DELETE FOR EVERYONE (sirf apna message) ----------
  socket.on('deleteMessageForEveryone', async ({ messageId }) => {
    if (!socket.userId || !messageId) return;
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (String(msg.fromUser) !== socket.userId) return; // sirf apna message delete kar sakte ho

      msg.deleted = true;
      msg.text = '';
      msg.mediaUrl = '';
      msg.mediaName = '';
      msg.mediaDuration = 0;
      msg.location = undefined;
      msg.contactName = '';
      msg.contactPhone = '';
      await msg.save();

      broadcastToRoom(msg.room, 'messageDeleted', { messageId: String(msg._id), room: msg.room });
    } catch (err) { /* ignore */ }
  });

  // ---------- REACT TO MESSAGE (emoji reaction — ek user, ek message pe ek hi reaction) ----------
  socket.on('reactMessage', async ({ messageId, emoji }) => {
    if (!socket.username || !messageId || !emoji) return;
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.deleted) return;

      const existingIndex = msg.reactions.findIndex(r => r.username === socket.username);
      if (existingIndex !== -1 && msg.reactions[existingIndex].emoji === emoji) {
        // Same emoji dobara tap kiya -> reaction hatao (toggle off)
        msg.reactions.splice(existingIndex, 1);
      } else if (existingIndex !== -1) {
        // Alag emoji choose kiya -> purana replace karo
        msg.reactions[existingIndex].emoji = emoji;
      } else {
        // Naya reaction add karo
        msg.reactions.push({ username: socket.username, emoji });
      }
      await msg.save();

      broadcastToRoom(msg.room, 'messageReaction', {
        messageId: String(msg._id),
        room: msg.room,
        reactions: msg.reactions
      });
    } catch (err) { /* ignore */ }
  });

  // ---------- READ RECEIPTS ----------
  socket.on('markRead', async ({ room }) => {
    if (!socket.userId || !room) return;
    await Message.updateMany(
      { room, readBy: { $ne: socket.userId } },
      { $addToSet: { readBy: socket.userId } }
    );
    // Doosre user ko batao ki maine padh liya (blue-tick jaisa)
    const otherUsername = room.split('__').find(u => u !== socket.username);
    if (otherUsername) {
      const targetId = findSocketIdByUsername(otherUsername);
      if (targetId) io.to(targetId).emit('messagesRead', { room, byUsername: socket.username });
    }
  });

  socket.on('typing', () => {
    if (socket.username && onlineUsers[socket.id]?.inPublicRoom) socket.broadcast.emit('typing', socket.username);
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

  socket.on('callTypeSwitch', ({ toUsername, offer, newType }) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId && socket.username) {
      io.to(targetId).emit('callTypeSwitch', { fromUsername: socket.username, offer, newType });
    }
  });

  socket.on('callTypeSwitchAnswer', ({ toUsername, answer }) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('callTypeSwitchAnswer', { fromUsername: socket.username, answer });
  });

  socket.on('callEnd', ({ toUsername }) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('callEnd', { fromUsername: socket.username });
  });

  // ---------- DISCONNECT ----------
  socket.on('disconnect', async () => {
    if (socket.username) {
      const wasInPublic = onlineUsers[socket.id]?.inPublicRoom;
      delete onlineUsers[socket.id];

      if (wasInPublic) {
        io.emit('system', `${socket.username} chale gaye`);
        io.emit('userList', publicRoomUsernames());
      }
      io.emit('callEnd', { fromUsername: socket.username });

      const seenAt = new Date();
      try {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: seenAt });
      } catch (e) { /* ignore */ }

      // Global presence: sabko "Last seen" turant update dikhao
      io.emit('presenceUpdate', { username: socket.username, isOnline: false, lastSeen: seenAt });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
});
