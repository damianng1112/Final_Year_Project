const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  doctor: String,
  date: String,
  patient: String,
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
