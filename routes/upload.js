const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('./auth');

const router = express.Router();

// Uploads directory path creation
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\-_]/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${safeName}${ext}`);
  }
});

// Dangerous Extensions Filter
const BLOCKED_EXTENSIONS = ['.exe', '.php', '.js', '.sh', '.bat', '.cmd', '.py', '.html', '.htm', '.jar'];

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error('Executable ya script file upload nahi kar sakte'));
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

    const isAudio = file.mimetype.startsWith('audio/') || file.mimetype === 'video/ogg';
    
    if (allowedTypes.includes(file.mimetype) || isAudio) {
      cb(null, true);
    } else {
      cb(new Error('Ye file format allowed nahi hai'));
    }
  }
});

// Protected Upload Endpoint
router.post('/', (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Token missing hai' });
    }

    if (typeof verifyToken !== 'function') {
      console.error('Error: verifyToken function auth.js se export nahi hua hai');
      return res.status(500).json({ error: 'Server authentication setup issue' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized: Session expire ho gaya' });
    }

    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size 15MB se kam honi chahiye' });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message || 'Upload fail hua' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Koi file select nahi ki gayi' });
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
  } catch (err) {
    console.error('Upload Route Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
