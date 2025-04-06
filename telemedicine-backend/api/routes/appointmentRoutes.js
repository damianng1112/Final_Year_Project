const express = require("express");
const router = express.Router();
const { generateTimeSlots } = require("./helpers");
const Appointment = require("../../models/Appointment");
const User = require("../../models/User");

// GET appointments for a given user (doctor or patient)
router.get("/:userId", async (req, res) => {
  try {
    // Find the user to determine their role
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let appointments;

    // If the user is a doctor, fetch appointments where this doctor is assigned
    // and populate the patient details.
    if (user.role === "doctor") {
      appointments = await Appointment.find({ doctor: user._id, status: "pending" })
        .populate("patient");
    } 
    // If the user is a patient, fetch appointments where this patient is assigned
    // and populate the doctor details.
    else if (user.role === "patient") {
      appointments = await Appointment.find({ patient: user._id, status: "pending" })
        .populate("doctor");
    } else {
      return res.status(400).json({ message: "Invalid user role." });
    }

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({ message: "No pending appointments found." });
    }

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ message: "Error fetching appointments" });
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
      status: "pending",
    });

    await appointment.save();
    res.json({ message: "Appointment booked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error booking appointment" });
  }
});

// PUT update (reschedule) an appointment
router.put("/appointment/:id", async (req, res) => {
  try {
    const { date, time } = req.body; // fields you allow updating
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    // Optionally, add logic to validate the new time slot is available
    appointment.date = new Date(date) || appointment.date;
    appointment.time = time || appointment.time;
    // Update status or other fields if needed

    await appointment.save();
    res.json({ message: "Appointment updated", appointment });
  } catch (err) {
    res.status(500).json({ message: "Error updating appointment" });
  }
});

// DELETE cancel an appointment
router.delete("/appointment/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment canceled" });
  } catch (err) {
    res.status(500).json({ message: "Error canceling appointment" });
  }
});

// Add this route to your appointmentRoutes.js file

// GET detailed information about a specific appointment
router.get("/detail/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("doctor", "name role")
      .populate("patient", "name role");
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    res.json(appointment);
  } catch (err) {
    console.error("Error fetching appointment details:", err);
    res.status(500).json({ message: "Error fetching appointment details" });
  }
});

module.exports = router;
