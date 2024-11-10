const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');

// Book appointment route
router.post('/book-appointment', async (req, res) => {
  const { doctor, date, patient } = req.body;
  try {
    const appointment = new Appointment({ doctor, date, patient });
    await appointment.save();
    res.json({ message: "Appointment booked successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error booking appointment" });
  }
});

module.exports = router;
