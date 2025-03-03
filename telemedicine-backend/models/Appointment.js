const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'booked', 'approved', 'completed', 'cancelled'], 
    default: 'pending' 
  }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
