const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Appointment" },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }, 
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
