const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: {
    type: String,
    enum: ['patient', 'doctor'],
    default: 'patient',
  },
  doctorId: String,
});

module.exports = mongoose.model('User', UserSchema);
