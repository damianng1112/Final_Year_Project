const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, 
  endTime: { type: String, required: true },
  slotDuration: { type: Number, default: 30 }, 
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: {
    type: String,
    enum: ["patient", "doctor"],
    default: "patient",
  },
  availability: [availabilitySchema], // Doctor's availability
});

module.exports = mongoose.model("User", UserSchema);
