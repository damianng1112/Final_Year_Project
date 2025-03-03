const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const router = express.Router();
const User = require('../../models/User');

// Signup route
router.post('/signup', async (req, res) => {
  const { name, email, password, role, doctorId, availability } = req.body;
  try {
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check for doctor-specific validation
    if (role === "doctor" && !doctorId) {
      return res.status(400).json({ message: "Doctor ID is required." });
    }

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hashSync(password, salt);

    let user = new User({ name, email, password: hashedPassword, role });

    if (role === "doctor") {
      user.doctorId = doctorId;
      user.availability = availability || [];  // Assign availability directly
    }

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

// GET all patients
router.get("/patients", async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient'}).select('-password');
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Get all doctors
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('-password');
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching doctors' });
  }
});

// GET all user
router.get("/user", async (req, res) => {
  try {
    const user = await User.find().select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// UPDATE a user 
router.put("/user/:id", async (req, res) => {
  try {
    const updates = req.body; 
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ message: "Error updating user" });
  }
});

// DELETE a user
router.delete("/user/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

module.exports = router;
