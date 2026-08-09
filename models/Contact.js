const mongoose = require('mongoose');

// Har row = "owner ne contactUsername ko apne contacts mein save kiya hai".
// Isse story visibility control hoti hai (sirf saved contacts ki story dikhti hai),
// aur bonus: contacts ab phone/laptop dono pe same dikhte hain (pehle sirf localStorage mein the).
const contactSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contactUsername: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Ek owner ek hi username ko dobara-dobara save na kar sake
contactSchema.index({ owner: 1, contactUsername: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);
