require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const User = require('./models/User');
const Message = require('./models/Message');
const PushSubscription = require('./models/PushSubscription');
const Story = require('./models/Story');
const Contact = require('./models/Contact');
const { router: authRouter, verifyToken } = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const storiesRouter = require('./routes/stories');
const contactsRouter = require('./routes/contacts');
const musicLibrary = require('./config/musicLibrary');
const webpush = require('web-push');
const rateLimit = require('express-rate-limit');

const app = express();
// Render (aur zyadatar hosting) ek reverse proxy ke peeche app chalata hai. Iske bina
// express-rate-limit sabko ek hi "IP" samajh sakta hai (saare users milke rate-limit
// hit kar sakte hain) — "1" matlab pehle proxy hop ko trust karo (Render ka apna proxy).
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// ---------- Rate limiting (brute-force / abuse se bachne ke liye) ----------
// Login/signup: ek IP se 15 minute me 20 try se zyada nahi (bots ko password guess karne se rokta hai)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bahut zyada try ho gaye, thodi der baad phir try karo' }
});
// Upload: ek IP se 15 minute me 60 uploads se zyada nahi (Cloudinary abuse/spam se bachne ke liye)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bahut zyada uploads ho gaye, thodi der baad phir try karo' }
});

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

// ---------- MongoDB connect ----------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatadda';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// ---------- Push notifications (Web Push / VAPID) ----------
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:chatadda@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY set nahi hain — push notifications kaam nahi karengi.');
}

// Push notification ke andar dikhne wala chhota preview text banata hai
function replyPushSummary(type, text, contactName) {
  switch (type) {
    case 'image': return '📷 Photo bheji';
    case 'document': return '📄 Document bheja';
    case 'location': return '📍 Location share ki';
    case 'audio': return '🎤 Voice message bheja';
    case 'contact': return `👤 Contact share ki${contactName ? ': ' + contactName : ''}`;
    default: return text || 'Naya message';
  }
}

// Diye gaye username ke saare saved devices ko push notification bhejta hai.
// Agar koi subscription expire/invalid ho gayi ho (410/404) to use DB se hata deta hai.
async function sendPushToUser(username, { title, body, url }) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const subs = await PushSubscription.find({ username });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, url: url || '/' });
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        payload
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
      }
    }
  }));
}

// ---------- REST routes ----------
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/upload', uploadLimiter, uploadRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/contacts', contactsRouter);

// Har REST route ke liye login check karne wala helper — Authorization: Bearer <token> header chahiye
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Login zaroori hai, session expire ho gaya hoga' });
  req.userId = payload.userId;
  next();
}

// Cloudinary URL hai ya nahi check karta hai (image/video/raw sab resource types allow) —
// isse client se aaya galat/khatarnak mediaUrl DB me save hone se pehle reject ho jaata hai.
function isValidMediaUrl(url) {
  if (!url) return true; // koi media nahi bheja, valid hai
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  if (!cloudName) return false;
  const pattern = new RegExp(`^https://res\\.cloudinary\\.com/${cloudName}/(image|video|raw)/upload/[a-zA-Z0-9/_.\\-]+$`);
  return pattern.test(url);
}

// Story banate waqt background music choose karne ke liye tracks ki list
app.get('/api/music', requireAuth, (req, res) => {
  res.json(musicLibrary);
});

// Client ko VAPID public key deta hai taaki wo pushManager.subscribe() kar sake
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Naya push subscription save/update karo (username + browser ka endpoint/keys)
app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { username, subscription } = req.body;
    if (!username || !subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      { username, endpoint: subscription.endpoint, keys: subscription.keys },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Subscription save nahi ho payi' });
  }
});

// Notifications band karte waqt subscription hata do
app.post('/api/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await PushSubscription.deleteOne({ endpoint });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Unsubscribe fail hua' });
  }
});

// Chat history: last 50 messages of a room (public or a private pair-id)
// Login zaroori hai, aur agar private room hai to sirf uske dono participants hi padh sakte hain
// (warna koi bhi dusre logon ke usernames jodke unki private chat padh sakta tha).
app.get('/api/messages/:room', requireAuth, async (req, res) => {
  try {
    const room = req.params.room;

    if (room !== 'public') {
      const me = await User.findById(req.userId, 'username').lean();
      if (!me) return res.status(401).json({ error: 'User nahi mila' });
      const participants = room.split('__');
      if (!participants.includes(me.username)) {
        return res.status(403).json({ error: 'Ye chat aapki nahi hai' });
      }
    }

    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: 'History load nahi ho payi' });
  }
});

// All registered users (for contacts/search + profile photo/last seen cache) — login zaroori hai
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await User.find({}, 'username isOnline lastSeen photoUrl').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Users load nahi ho paye' });
  }
});

// Phone number se exact user search — sirf username+photo return karta hai, phone kabhi expose nahi hota.
// Login zaroori hai, taaki koi anjaan bot sab phone numbers try-try ke registered users pata na laga sake.
app.get('/api/users/search', requireAuth, async (req, res) => {
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

    // Sirf apne Cloudinary account se aayi hui secure image URL allow karo — koi bhi
    // arbitrary string (jisme HTML/quotes ho sakte hain) accept nahi karni, warna baad
    // me frontend pe render hote waqt XSS ban sakti hai.
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    const cloudinaryPattern = new RegExp(
      `^https://res\\.cloudinary\\.com/${cloudName}/image/upload/[a-zA-Z0-9/_.\\-]+$`
    );
    if (!cloudName || !cloudinaryPattern.test(photoUrl)) {
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

// Client se aaya replyTo object saaf karke chhota, safe object banao (koi bhi extra/galat data na jaaye DB me)
function sanitizeReplyTo(replyTo) {
  if (!replyTo || !replyTo.messageId) return undefined;
  return {
    messageId: replyTo.messageId,
    fromUsername: String(replyTo.fromUsername || '').slice(0, 40),
    type: ALLOWED_MSG_TYPES.includes(replyTo.type) ? replyTo.type : 'text',
    text: String(replyTo.text || '').slice(0, 120)
  };
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

    // mediaUrl sirf humare apne Cloudinary account se aayi honi chahiye — warna client
    // koi bhi khatarnak/galat URL bhej sakta tha jo baad me doosre users ke browser pe
    // bina saaf kiye render ho jaata (XSS risk).
    if (['image', 'document', 'audio'].includes(type) && !isValidMediaUrl(data.mediaUrl)) return;

    const replyTo = sanitizeReplyTo(data.replyTo);
    const forwarded = !!data.forwarded;

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
      contactPhone: type === 'contact' ? String(data.contactPhone || '').slice(0, 20) : '',
      replyTo,
      forwarded
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
      replyTo: msgDoc.replyTo,
      forwarded: msgDoc.forwarded,
      pinned: false,
      deleted: false,
      edited: false,
      reactions: [],
      createdAt: msgDoc.createdAt
    });
  });

  // ---------- PRIVATE MESSAGE ----------
  socket.on('privateMessage', async ({ toUsername, text, type, mediaUrl, mediaName, duration, location, contactName, contactPhone, replyTo, forwarded }) => {
    if (!socket.username || !toUsername) return;
    const targetUser = await User.findOne({ username: toUsername });
    if (!targetUser) return;

    const msgType = ALLOWED_MSG_TYPES.includes(type) ? type : 'text';
    if (['image', 'document', 'audio'].includes(msgType) && !isValidMediaUrl(mediaUrl)) return;
    const cleanText = msgType === 'text' ? cleanMessage(String(text || '').slice(0, 500)) : '';
    const room = privateRoomId(socket.username, toUsername);
    const safeReplyTo = sanitizeReplyTo(replyTo);
    const isForwarded = !!forwarded;

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
      contactPhone: msgType === 'contact' ? String(contactPhone || '').slice(0, 20) : '',
      replyTo: safeReplyTo,
      forwarded: isForwarded
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
      replyTo: msgDoc.replyTo,
      forwarded: msgDoc.forwarded,
      pinned: false,
      deleted: false,
      edited: false,
      reactions: [],
      createdAt: msgDoc.createdAt,
      read: false
    };
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) io.to(targetId).emit('privateMessage', payload);
    socket.emit('privateMessage', payload);

    // Recipient abhi socket se connected nahi hai (app band ya background me) — push notification bhejo
    if (!targetId) {
      sendPushToUser(toUsername, {
        title: socket.username,
        body: replyPushSummary(msgType, cleanText, contactName),
        url: '/'
      }).catch(() => {});
    }
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
      // Private chat ke message pe sirf uske dono participants hi react kar sakte hain
      if (msg.room !== 'public' && !msg.room.split('__').includes(socket.username)) return;

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

  // ---------- PIN MESSAGE ----------
  socket.on('pinMessage', async ({ messageId }) => {
    if (!socket.username || !messageId) return;
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.deleted) return;
      // Private chat ke message pe sirf uske dono participants hi pin kar sakte hain
      if (msg.room !== 'public' && !msg.room.split('__').includes(socket.username)) return;

      // Ek room me ek time pe ek hi pinned message rahega (WhatsApp jaisa simple behaviour)
      await Message.updateMany({ room: msg.room, pinned: true }, { pinned: false });
      msg.pinned = true;
      await msg.save();

      broadcastToRoom(msg.room, 'messagePinned', {
        room: msg.room,
        messageId: String(msg._id),
        type: msg.type,
        text: msg.text,
        fromUsername: msg.fromUsername
      });
    } catch (err) { /* ignore */ }
  });

  socket.on('unpinMessage', async ({ messageId, room }) => {
    if (!socket.username || !messageId) return;
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      // Private chat ke message pe sirf uske dono participants hi unpin kar sakte hain
      if (msg.room !== 'public' && !msg.room.split('__').includes(socket.username)) return;
      msg.pinned = false;
      await msg.save();
      broadcastToRoom(msg.room || room, 'messageUnpinned', { room: msg.room || room });
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
