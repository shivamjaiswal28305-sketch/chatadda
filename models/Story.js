const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fromUsername: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['image', 'video', 'text'],
    required: true
  },
  mediaUrl: {
    type: String,
    default: '' // image/video story ka Cloudinary URL (text story ke liye khaali)
  },
  textContent: {
    type: String,
    default: '' // text story ka text, ya photo/video ke upar ka chhota caption
  },
  backgroundColor: {
    type: String,
    default: '#25D366' // sirf text-only stories ke background ke liye
  },
  musicTrackId: {
    type: String,
    default: '' // config/musicLibrary.js mein se select kiya hua track id, agar koi hai
  },
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL index: MongoDB is document ko createdAt ke 86400 second (24 ghante) baad
    // apne aap delete kar deta hai — koi cron job ya manual cleanup nahi chahiye.
    expires: 86400
  }
});

module.exports = mongoose.model('Story', storySchema);
