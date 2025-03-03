const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDuration: { type: Number, default: 30 },
});

// New schema for recurring availability:
const recurringAvailabilitySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDuration: { type: Number, default: 30 },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor'], required: true },
  doctorId: { type: String, required: function() { return this.role === 'doctor'; } }, 
  availability: { type: [availabilitySchema], default: [] },
  recurringAvailability: { type: [recurringAvailabilitySchema], default: [] }, // recurring weekly schedule
});

module.exports = mongoose.model('User', userSchema);
