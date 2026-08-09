const express = require('express');
const Story = require('../models/Story');
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

// Sirf humare apne Cloudinary account se aayi hui URL allow karo (XSS/abuse se bachne ke liye,
// jaisa /api/users/photo aur chat messages mein pehle se kiya hai)
function isValidMediaUrl(url) {
  if (!url) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  if (!cloudName) return false;
  const pattern = new RegExp(`^https://res\\.cloudinary\\.com/${cloudName}/(image|video|raw)/upload/[a-zA-Z0-9/_.\\-]+$`);
  return pattern.test(url);
}

// ---------- NAYI STORY BANAO ----------
router.post('/', requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.userId, 'username').lean();
    if (!me) return res.status(401).json({ error: 'User nahi mila' });

    const type = ['image', 'video', 'text'].includes(req.body.type) ? req.body.type : null;
    if (!type) return res.status(400).json({ error: 'Story ka type sahi nahi hai' });

    const mediaUrl = String(req.body.mediaUrl || '');
    if ((type === 'image' || type === 'video') && !isValidMediaUrl(mediaUrl)) {
      return res.status(400).json({ error: 'Invalid media URL' });
    }
    const textContent = String(req.body.textContent || '').slice(0, 200);
    if (type === 'text' && !textContent.trim()) {
      return res.status(400).json({ error: 'Text story khaali nahi ho sakti' });
    }

    const story = await Story.create({
      fromUser: req.userId,
      fromUsername: me.username,
      type,
      mediaUrl: type === 'text' ? '' : mediaUrl,
      textContent,
      backgroundColor: String(req.body.backgroundColor || '#25D366').slice(0, 20),
      musicTrackId: String(req.body.musicTrackId || '').slice(0, 40)
    });

    res.json({ story });
  } catch (err) {
    console.error('Story create error:', err.message);
    res.status(500).json({ error: 'Story bhejna fail hua' });
  }
});

// ---------- APNE SAVED CONTACTS + APNI KHUD KI ACTIVE STORIES DEKHO ----------
// (Expired stories ke liye kuch nahi karna padta — MongoDB TTL unhe khud delete kar deta hai)
router.get('/', requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.userId, 'username').lean();
    if (!me) return res.status(401).json({ error: 'User nahi mila' });

    const contacts = await Contact.find({ owner: req.userId }).lean();
    const usernames = contacts.map((c) => c.contactUsername);
    usernames.push(me.username); // apni khud ki story bhi dikhni chahiye

    const stories = await Story.find({ fromUsername: { $in: usernames } })
      .sort({ createdAt: 1 })
      .lean();

    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: 'Stories load nahi ho payi' });
  }
});

// ---------- STORY DEKHI (view count/list) ----------
router.post('/:id/view', requireAuth, async (req, res) => {
  try {
    await Story.updateOne(
      { _id: req.params.id },
      { $addToSet: { viewedBy: req.userId } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'View mark nahi ho paya' });
  }
});

// ---------- APNI STORY DELETE KARO (24 ghante se pehle bhi) ----------
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story nahi mili' });
    if (String(story.fromUser) !== req.userId) {
      return res.status(403).json({ error: 'Ye aapki story nahi hai' });
    }
    await story.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Story delete fail hui' });
  }
});

module.exports = router;
