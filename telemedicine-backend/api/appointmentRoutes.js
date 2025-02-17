const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const User = require("../models/User");

// Function to generate time slots
const generateTimeSlots = (startTime, endTime, duration) => {
  const slots = [];
  let currentTime = new Date(`1970-01-01T${startTime}:00`);
  const endTimeObj = new Date(`1970-01-01T${endTime}:00`);

  while (currentTime < endTimeObj) {
    const formattedTime = currentTime.toTimeString().split(" ")[0].slice(0, 5); // "HH:mm"
    slots.push(formattedTime);
    currentTime.setMinutes(currentTime.getMinutes() + duration);
  }

  return slots;
};

// Get available slots for a doctor
router.get("/availability/:doctorId", async (req, res) => {
  try {
    const { date } = req.query;
    const formattedDate = new Date(date).toISOString().split("T")[0];

    const doctor = await User.findById(req.params.doctorId);
    
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Find availability entry for the selected date
    const availability = doctor.availability.find(a => 
      a.date.toISOString().split("T")[0] === formattedDate
    );

    if (!availability) {
      return res.status(400).json({ message: "Doctor is not available on this date." });
    }

    const { startTime, endTime, slotDuration } = availability;

    // Generate all possible slots
    let availableSlots = generateTimeSlots(startTime, endTime, slotDuration);

    // Get already booked slots
    const bookedAppointments = await Appointment.find({
      doctor: req.params.doctorId,
      date: new Date(date),
    });

    const bookedSlots = bookedAppointments.map(app => app.time);

    // Filter available slots
    availableSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));

    res.json({ availableSlots, bookedSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching availability" });
  }
});

// Book appointment
router.post("/book-appointment", async (req, res) => {
  const { doctorId, date, time, patientId } = req.body;

  try {
    const doctor = await User.findById(doctorId);
    const patient = await User.findById(patientId);

    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (!patient || patient.role !== "patient") {
      return res.status(400).json({ message: "Invalid patient" });
    }

    // Find availability entry for the selected date
    const availability = doctor.availability.find(a => 
      a.date.toISOString().split("T")[0] === new Date(date).toISOString().split("T")[0]
    );

    if (!availability) {
      return res.status(400).json({ message: "Doctor is not available on this date." });
    }

    // Generate slots dynamically
    const { startTime, endTime, slotDuration } = availability;
    const availableSlots = generateTimeSlots(startTime, endTime, slotDuration);

    if (!availableSlots.includes(time)) {
      return res.status(400).json({ message: "Time slot not available" });
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: new Date(date),
      time: time,
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "Time slot already booked." });
    }

    // Create appointment
    const appointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      date: new Date(date),
      time,
      status: "booked",
    });

    await appointment.save();
    res.json({ message: "Appointment booked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error booking appointment" });
  }
});

module.exports = router;
