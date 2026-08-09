const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Hardcoded fallback secret hona security risk hai (koi bhi fake login token bana sakta
  // hai) — isliye ab agar Render pe JWT_SECRET env var missing hai to server start hi nahi hoga.
  console.error('FATAL: JWT_SECRET env var set nahi hai. Render dashboard > Environment me JWT_SECRET add karo (koi bhi random 32+ character string).');
  process.exit(1);
}
const JWT_EXPIRY = '30d';

function makeToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// ---------- SIGNUP ----------
router.post('/signup', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');

    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username 3 se 20 characters ka hona chahiye' });
    }
    if (!phone || phone.length < 8 || phone.length > 15) {
      return res.status(400).json({ error: 'Sahi phone number daalo' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password kam se kam 6 characters ka hona chahiye' });
    }

    // Phone number duplicate check
    const existingPhone = await User.findOne({ phone: String(phone) });
    if (existingPhone) {
      return res.status(400).json({ error: 'Ye phone number pehle se registered hai' });
    }

    // Username duplicate check (चैट मैपिंग सही रहने के लिए जरूरी है)
    const existingUsername = await User.findOne({ username: String(username) });
    if (existingUsername) {
      return res.status(400).json({ error: 'Ye Username pehle se kisi aur ka hai, doosra chuno' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, phone, passwordHash });

    const token = makeToken(String(user._id));
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Signup fail hua, dobara try karo' });
  }
});

// ---------- LOGIN ----------
router.post('/login', async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone aur password dono daalo' });
    }

    const user = await User.findOne({ phone: String(phone) });
    if (!user) {
      return res.status(400).json({ error: 'Phone number ya password galat hai' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Phone number ya password galat hai' });
    }

    const token = makeToken(String(user._id));
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login fail hua, dobara try karo' });
  }
});

module.exports = { router, verifyToken };
