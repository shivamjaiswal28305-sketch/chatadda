const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// Files disk pe save nahi hote — sirf RAM me hold hote hain, phir seedha Cloudinary
// pe stream ho jaate hain. Render ka disk restart pe wipe ho jaata hai, isliye
// permanent storage ke liye Cloudinary use kar rahe hain (DP + chat photos/files).
const upload = multer({
  storage: multer.memoryStorage(),
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
    // Voice messages: browsers MediaRecorder mimetype "audio/webm", "audio/webm;codecs=opus",
    // "audio/ogg", "audio/mp4" waghera bhejte hain — isliye koi bhi "audio/*" allow kar diya.
    const isAudio = file.mimetype.startsWith('audio/');
    if (allowedTypes.includes(file.mimetype) || isAudio) cb(null, true);
    else cb(new Error('Ye file type allowed nahi hai'));
  }
});

// Buffer ko Cloudinary pe upload karta hai (Promise wrap kiya hai kyunki
// upload_stream callback-style hai)
function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
}

router.post('/', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload fail hua' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Koi file nahi mili' });
    }

    let type = 'document';
    if (req.file.mimetype.startsWith('image/')) type = 'image';
    else if (req.file.mimetype.startsWith('audio/')) type = 'audio';

    // Cloudinary "auto" resource_type khud dekh ke image/video/raw (pdf, doc, audio) tay kar leta hai.
    // Non-image files ke liuse asli filename raakhna zaroori hai (varna download pe naam kharab dikhega).
    try {
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'chatadda',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: req.file.originalname
      });

      res.json({
        type,
        url: result.secure_url,
        name: req.file.originalname
      });
    } catch (cloudErr) {
      console.error('Cloudinary upload error:', cloudErr.message);
      res.status(500).json({ error: 'File cloud pe upload nahi ho payi' });
    }
  });
});

module.exports = router;
