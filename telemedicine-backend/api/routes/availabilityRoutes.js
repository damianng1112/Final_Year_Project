const express = require("express");
const router = express.Router();
const Appointment = require("../../models/Appointment");
const { generateTimeSlots } = require("./helpers");
const User = require("../../models/User");

// GET all appointments
router.get("/availability", async (req, res) => {
  try {
    const appointments = await Appointment.find();
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Error fetching appointments" });
  }
});

// Get available slots for a doctor
router.get("/:doctorId", async (req, res) => {
  try {
    const { date } = req.query;
    const selectedDate = new Date(date);  
    const formattedDate = selectedDate.toISOString().split("T")[0];
    const dayOfWeek = selectedDate.getDay(); // 0 (Sun) to 6 (Sat)

    const doctor = await User.findById(req.params.doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // First, try to find a specific availability entry for the chosen date.
    let schedule = doctor.availability.find(a => 
      a.date.toISOString().split("T")[0] === formattedDate
    );

    // If not found, check for recurring availability based on the day of the week.
    if (!schedule) {
      schedule = doctor.recurringAvailability.find(r => r.dayOfWeek === dayOfWeek);
    }

    if (!schedule) {
      return res.status(400).json({ message: "Doctor is not available on this date." });
    }

    const { startTime, endTime, slotDuration } = schedule;

    // Generate all possible slots for the schedule.
    let availableSlots = generateTimeSlots(startTime, endTime, slotDuration);

    // Get already booked slots
    const bookedAppointments = await Appointment.find({
      doctor: req.params.doctorId,
      date: selectedDate,
    });
    const bookedSlots = bookedAppointments.map(app => app.time);

    // Filter available slots (compare using slotStart)
    availableSlots = availableSlots.filter(slot => !bookedSlots.includes(slot.slotStart));

    res.json({ availableSlots, bookedSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching availability" });
  }
});

router.post("/set-availability", async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, slotDuration } = req.body;

    // Validate doctor
    const doctor = await User.findOne({ doctorId: doctorId});
    if (!doctor || doctor.role !== "doctor") {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }

    // Convert date to ISO format for consistency
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // Generate time slots
    const slots = generateTimeSlots(startTime, endTime, slotDuration);

    // Check if availability already exists for that date
    const existingAvailability = doctor.availability.find(
      (a) => a.date.toISOString().split("T")[0] === formattedDate
    );

    if (existingAvailability) {
      // Update existing availability
      existingAvailability.startTime = startTime;
      existingAvailability.endTime = endTime;
      existingAvailability.slotDuration = slotDuration;
      existingAvailability.slots = slots;
    } else {
      // Add new availability entry
      doctor.availability.push({
        date: new Date(date),
        startTime,
        endTime,
        slotDuration,
        slots,
      });
    }

    await doctor.save();
    res.json({ message: "Availability set successfully", availability: doctor.availability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error setting availability" });
  }
});

// GET recurring availability for a doctor
router.get("/recurAvailability/:doctorId", async (req, res) => {
  try {
    const doctor = await User.findById(req.params.doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json({ recurringAvailability: doctor.recurringAvailability });
  } catch (err) {
    res.status(500).json({ message: "Error fetching recurring availability" });
  }
});

// UPDATE a recurring availability entry
router.put("/:doctorId/:recurringId", async (req, res) => {
  const { doctorId, recurringId } = req.params;
  const { dayOfWeek, startTime, endTime, slotDuration } = req.body;
  try {
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }
    const recurring = doctor.recurringAvailability.id(recurringId);
    if (!recurring) {
      return res.status(404).json({ message: "Recurring availability not found" });
    }
    if (dayOfWeek !== undefined) recurring.dayOfWeek = dayOfWeek;
    if (startTime) recurring.startTime = startTime;
    if (endTime) recurring.endTime = endTime;
    if (slotDuration) recurring.slotDuration = slotDuration;
    await doctor.save();
    res.json({ message: "Recurring availability updated", recurringAvailability: recurring });
  } catch (err) {
    res.status(500).json({ message: "Error updating recurring availability", error: err.message });
  }
});

// DELETE a recurring availability entry
router.delete("/:doctorId/:recurringId", async (req, res) => {
  const { doctorId, recurringId } = req.params;
  try {
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }
    const recurring = doctor.recurringAvailability.id(recurringId);
    if (!recurring) {
      return res.status(404).json({ message: "Recurring availability not found" });
    }
    recurring.remove();
    await doctor.save();
    res.json({ message: "Recurring availability deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting recurring availability", error: err.message });
  }
});

module.exports = router;
