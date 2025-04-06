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
    const availableSlots = generateTimeSlots(startTime, endTime, slotDuration);

    // Get already booked slots
    const bookedAppointments = await Appointment.find({
      doctor: req.params.doctorId,
      date: selectedDate,
    });
    const bookedSlots = bookedAppointments.map(app => app.time);

    // Filter out booked slots
    const filteredSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));

    res.json({ availableSlots: filteredSlots, bookedSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching availability" });
  }
});

// NEW ENDPOINT: Set recurring availability
router.post("/set-recurring", async (req, res) => {
  try {
    const { doctorId, dayOfWeek, startTime, endTime, slotDuration } = req.body;

    if (!doctorId || dayOfWeek === undefined || !startTime || !endTime || !slotDuration) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if recurring availability already exists for this day
    const existingRecurring = doctor.recurringAvailability.find(r => r.dayOfWeek === dayOfWeek);
    
    if (existingRecurring) {
      // Update existing
      existingRecurring.startTime = startTime;
      existingRecurring.endTime = endTime;
      existingRecurring.slotDuration = slotDuration;
    } else {
      // Create new
      doctor.recurringAvailability.push({
        dayOfWeek,
        startTime,
        endTime,
        slotDuration
      });
    }

    await doctor.save();
    res.json({ 
      message: "Recurring availability set successfully", 
      recurringAvailability: doctor.recurringAvailability 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error setting recurring availability" });
  }
});

// NEW ENDPOINT: Generate monthly availability
router.post("/generate-monthly", async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required" });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Only proceed if recurring availability is set
    if (!doctor.recurringAvailability || doctor.recurringAvailability.length === 0) {
      return res.status(400).json({ message: "Please set recurring availability first" });
    }

    // Generate availability for the next 30 days
    const today = new Date();
    const generatedDates = [];
    const errors = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const formattedDate = date.toISOString().split("T")[0];
      
      // Check if there's a recurring schedule for this day of week
      const recurringSchedule = doctor.recurringAvailability.find(r => r.dayOfWeek === dayOfWeek);
      
      if (recurringSchedule) {
        // Check if there's already specific availability for this date
        const existingAvailability = doctor.availability.find(a => 
          a.date.toISOString().split("T")[0] === formattedDate
        );
        
        if (!existingAvailability) {
          try {
            // Add new availability based on recurring schedule
            doctor.availability.push({
              date: new Date(date),
              startTime: recurringSchedule.startTime,
              endTime: recurringSchedule.endTime,
              slotDuration: recurringSchedule.slotDuration
            });
            
            generatedDates.push(formattedDate);
          } catch (error) {
            errors.push(`Error generating availability for ${formattedDate}: ${error.message}`);
          }
        }
      }
    }

    await doctor.save();
    
    res.json({ 
      message: "Monthly availability generated successfully", 
      generatedDates,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating monthly availability" });
  }
});

// Get available slots for a doctor in a date range
router.get("/:doctorId/range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }
    
    const doctor = await User.findById(req.params.doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const availableSlots = [];
    
    // Check each day in the range
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const formattedDate = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();
      
      // Check if doctor has availability for this date
      let schedule = doctor.availability.find(a => 
        a.date.toISOString().split("T")[0] === formattedDate
      );

      // If not found in specific dates, check recurring availability
      if (!schedule) {
        schedule = doctor.recurringAvailability.find(r => r.dayOfWeek === dayOfWeek);
      }
      
      // If schedule found, check available slots
      if (schedule) {
        const { startTime, endTime, slotDuration } = schedule;
        const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);
        
        // Get booked slots for this date
        const bookedAppointments = await Appointment.find({
          doctor: req.params.doctorId,
          date: new Date(formattedDate),
        });
        
        const bookedSlots = bookedAppointments.map(app => app.time);
        
        // Filter out booked slots
        const openSlots = timeSlots.filter(slot => !bookedSlots.includes(slot));
        
        // Add open slots to the result
        openSlots.forEach(time => {
          availableSlots.push({
            date: formattedDate,
            time: time
          });
        });
      }
    }
    
    res.json({ availableSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching availability range" });
  }
});

// Get next available slot for a doctor
router.get("/:doctorId/next-available", async (req, res) => {
  try {
    const doctor = await User.findById(req.params.doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const today = new Date();
    let nextAvailableSlot = null;
    
    // Check the next 14 days
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const formattedDate = checkDate.toISOString().split("T")[0];
      const dayOfWeek = checkDate.getDay();
      
      // Check if doctor has availability for this date
      let schedule = doctor.availability.find(a => 
        a.date.toISOString().split("T")[0] === formattedDate
      );

      // If not found in specific dates, check recurring availability
      if (!schedule) {
        schedule = doctor.recurringAvailability.find(r => r.dayOfWeek === dayOfWeek);
      }
      
      // If schedule found, check available slots
      if (schedule) {
        const { startTime, endTime, slotDuration } = schedule;
        const availableSlots = generateTimeSlots(startTime, endTime, slotDuration);
        
        // Get booked slots for this date
        const bookedAppointments = await Appointment.find({
          doctor: req.params.doctorId,
          date: checkDate,
        });
        
        const bookedSlots = bookedAppointments.map(app => app.time);
        
        // Filter out booked slots
        const openSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));
        
        // If there are open slots, return the first one
        if (openSlots.length > 0) {
          nextAvailableSlot = {
            date: formattedDate,
            time: openSlots[0]
          };
          break;
        }
      }
    }
    
    if (nextAvailableSlot) {
      res.json({ slot: nextAvailableSlot });
    } else {
      res.status(404).json({ message: "No available slots found in the next 14 days" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error finding next available slot" });
  }
});

// Update User model to include recurring availability
router.post("/set-availability", async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, slotDuration } = req.body;

    // Validate doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }

    // Convert date to ISO format for consistency
    const formattedDate = new Date(date).toISOString().split("T")[0];

    // Check if availability already exists for that date
    const existingAvailability = doctor.availability.find(
      (a) => a.date.toISOString().split("T")[0] === formattedDate
    );

    if (existingAvailability) {
      // Update existing availability
      existingAvailability.startTime = startTime;
      existingAvailability.endTime = endTime;
      existingAvailability.slotDuration = slotDuration;
    } else {
      // Add new availability entry
      doctor.availability.push({
        date: new Date(date),
        startTime,
        endTime,
        slotDuration
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
    res.json({ recurringAvailability: doctor.recurringAvailability || [] });
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
    
    // Find the recurring availability entry
    const recurring = doctor.recurringAvailability.id(recurringId);
    if (!recurring) {
      return res.status(404).json({ message: "Recurring availability not found" });
    }
    
    // Update fields
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
    
    // Find and remove the recurring availability entry
    const recurring = doctor.recurringAvailability.id(recurringId);
    if (!recurring) {
      return res.status(404).json({ message: "Recurring availability not found" });
    }
    
    doctor.recurringAvailability.pull(recurringId);
    await doctor.save();
    
    res.json({ message: "Recurring availability deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting recurring availability", error: err.message });
  }
});

module.exports = router;