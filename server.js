const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/test', (req, res) => res.send('working'));
// Track online users: socket.id -> username
const onlineUsers = {};

// Simple bad-words filter (add more words as needed)
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
  return Object.keys(onlineUsers).find(id => onlineUsers[id] === username);
}

// Reports get appended to reports.json (simple file-based log, no database needed)
const reportsFile = path.join(__dirname, 'reports.json');
function saveReport(entry) {
  let reports = [];
  try {
    if (fs.existsSync(reportsFile)) {
      reports = JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
    }
  } catch (e) {
    reports = [];
  }
  reports.push(entry);
  try {
    fs.writeFileSync(reportsFile, JSON.stringify(reports, null, 2));
  } catch (e) {
    console.error('Report save failed:', e.message);
  }
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // When user joins with a username
  socket.on('join', (username) => {
    username = String(username).trim().slice(0, 20);
    if (!username) {
      username = 'Guest' + Math.floor(Math.random() * 1000);
    }

    // Prevent duplicate usernames
    const existingNames = Object.values(onlineUsers);
    let finalName = username;
    let counter = 1;
    while (existingNames.includes(finalName)) {
      finalName = `${username}${counter}`;
      counter++;
    }

    onlineUsers[socket.id] = finalName;
    socket.username = finalName;

    // Tell the user their final assigned name
    socket.emit('joined', finalName);

    // Notify everyone
    io.emit('system', `${finalName} chat me aa gaye 👋`);
    io.emit('userList', Object.values(onlineUsers));
  });

  // Public chat message
  socket.on('chatMessage', (msg) => {
    if (!socket.username) return;
    const text = cleanMessage(String(msg).slice(0, 500));
    io.emit('chatMessage', {
      username: socket.username,
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Private 1-on-1 message
  socket.on('privateMessage', ({ toUsername, text }) => {
    if (!socket.username || !toUsername) return;
    const cleanText = cleanMessage(String(text).slice(0, 500));
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const payload = {
      from: socket.username,
      to: toUsername,
      text: cleanText,
      time
    };

    // Send to receiver if they're online
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId) {
      io.to(targetId).emit('privateMessage', payload);
    }
    // Echo back to sender so their own screen shows it too
    socket.emit('privateMessage', payload);
  });

  // Typing indicator (public room)
  socket.on('typing', () => {
    if (socket.username) {
      socket.broadcast.emit('typing', socket.username);
    }
  });

  // Typing indicator (private chat)
  socket.on('privateTyping', (toUsername) => {
    const targetId = findSocketIdByUsername(toUsername);
    if (targetId && socket.username) {
      io.to(targetId).emit('privateTyping', socket.username);
    }
  });

  // Report a user
  socket.on('reportUser', ({ reportedUsername, reason }) => {
    if (!socket.username) return;
    const entry = {
      reportedBy: socket.username,
      reportedUser: reportedUsername,
      reason: String(reason || 'No reason given').slice(0, 300),
      time: new Date().toISOString()
    };
    saveReport(entry);
    console.log('New report:', entry);
    socket.emit('reportReceived', reportedUsername);
  });

  // ---------- WebRTC call signaling (server sirf messages relay karta hai) ----------
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

  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('system', `${socket.username} chale gaye 👋`);
      // Agar ye user kisi call me tha to doosre party ko bata do
      io.emit('callEnd', { fromUsername: socket.username });
      delete onlineUsers[socket.id];
      io.emit('userList', Object.values(onlineUsers));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server chal raha hai: http://localhost:${PORT}`);
});
