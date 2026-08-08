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
    required: true,
    index: true
  },
  fromUsername: {
    type: String,
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
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
  mediaDuration: {
    type: Number,
    default: 0
  },
  location: {
    lat: Number,
    lng: Number
  },
  contactName: {
    type: String,
    default: ''
  },
  contactPhone: {
    type: String,
    default: ''
  },
  replyTo: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    fromUsername: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'text'
    },
    text: {
      type: String,
      default: ''
    }
  },
  forwarded: {
    type: Boolean,
    default: false
  },
  pinned: {
    type: Boolean,
    default: false
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

// Fast Chat History Load Index (Room + Time)
messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
