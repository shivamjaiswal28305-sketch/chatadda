const express = require('express');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { verifyToken } = require('./auth');

const router = express.Router();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Login zaroori hai' });
  req.userId = payload.userId;
  next();
}

// Apne saare saved contacts ki list do (sirf usernames ka array)
router.get('/', requireAuth, async (req, res) => {
  try {
    const contacts = await Contact.find({ owner: req.userId }).lean();
    res.json(contacts.map((c) => c.contactUsername));
  } catch (err) {
    res.status(500).json({ error: 'Contacts load nahi ho paye' });
  }
});

// Naya contact save karo (jab kisi ko phone-search se dhoondke chat shuru karte ho)
router.post('/', requireAuth, async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    if (!username) return res.status(400).json({ error: 'Username do' });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'Ye user nahi mila' });

    await Contact.findOneAndUpdate(
      { owner: req.userId, contactUsername: username },
      { owner: req.userId, contactUsername: username },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Contact save nahi ho paya' });
  }
});

// Contact list se hatao
router.delete('/:username', requireAuth, async (req, res) => {
  try {
    await Contact.deleteOne({ owner: req.userId, contactUsername: req.params.username });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Contact hatana fail hua' });
  }
});

module.exports = router;
