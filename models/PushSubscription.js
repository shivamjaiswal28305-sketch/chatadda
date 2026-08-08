const mongoose = require('mongoose');

// Ek user ke ek browser/device ka push subscription (Notification permission dene ke baad
// browser jo endpoint + keys deta hai, wahi yahan save hota hai taaki server usko push bhej sake)
const pushSubscriptionSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
