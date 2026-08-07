const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    index: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromUsername: {
    type: String,
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['text', 'image', 'document', 'location', 'audio', 'contact'],
    default: 'text'
  },
  text: {
    type: String,
    default: ''
  },
  mediaUrl: {
    type: String,
    default: ''
  },
  mediaName: {
    type: String,
    default: ''
  },
  // Voice message ki duration (seconds) — audio player mein dikhane ke liye
  mediaDuration: {
    type: Number,
    default: 0
  },
  location: {
    lat: Number,
    lng: Number
  },
  // Contact share ke liye
  contactName: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    default: ''
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    username: { type: String, required: true },
    emoji: { type: String, required: true }
  }],
  deleted: {
    type: Boolean,
    default: false
  },
  edited: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
