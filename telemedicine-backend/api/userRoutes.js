const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const router = express.Router();
const User = require('../models/User');

// Signup route
router.post('/signup', async (req, res) => {
  const { name, email, password, role, doctorId } = req.body; // Include role and doctorId
  try {
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check for doctor-specific validation
    if (role === 'doctor' && !doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required for doctor role.' });
    }

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hashSync(password, salt);

    // Create a new user with the hashed password and role
    const user = new User({ name, email, password: hashedPassword, role, doctorId });
    await user.save();

    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: "Error registering user" });
  }
});


// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare entered password with stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Create JWT Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Respond with user information
    res.json({ message: "Login successful", token, user: { _id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// Fetch user by ID
router.get('/user/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select('-password'); // Exclude password field
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: 'Error retrieving user information' });
  }
});

// Get all doctors
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching doctors' });
  }
});

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

module.exports = router;
