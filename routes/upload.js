const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('./auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\-_]/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${safeName}${ext}`);
  }
});

// Dangerous extensions protection
const BLOCKED_EXTENSIONS = ['.exe', '.php', '.js', '.sh', '.bat', '.cmd', '.py', '.html', '.htm', '.jar'];

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Ye executable file uploaded nahi ho sakti'));
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];

    const isAudio = file.mimetype.startsWith('audio/');
    if (allowedTypes.includes(file.mimetype) || isAudio) {
      cb(null, true);
    } else {
      cb(new Error('Ye file type allowed nahi hai'));
    }
  }
});

// Protected upload route (Sirf Logged-in Users ke liye)
router.post('/', (req, res) => {
  // Check auth token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Pehle login karo' });
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload fail hua' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Koi file nahi mili' });
    }

    let type = 'document';
    if (req.file.mimetype.startsWith('image/')) type = 'image';
    else if (req.file.mimetype.startsWith('audio/')) type = 'audio';

    res.json({
      type,
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname
    });
  });
});

module.exports = router;
