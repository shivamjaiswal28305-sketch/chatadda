const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB, same limit as frontend
  fileFilter: (req, file, cb) => {
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
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Ye file type allowed nahi hai'));
  }
});

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload fail hua' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Koi file nahi mili' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    res.json({
      type: isImage ? 'image' : 'document',
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname
    });
  });
});

module.exports = router;
