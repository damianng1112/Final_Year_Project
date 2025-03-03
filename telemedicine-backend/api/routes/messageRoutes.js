const express = require('express');
const Message = require('../../models/Message');
const router = express.Router();

// Get chat history for an appointment
router.get('/:appointmentId', async (req, res) => {
  try {
    const messages = await Message.find({ appointmentId: req.params.appointmentId })
    .populate("sender", "name")
    .sort('timestamp');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Save message when received
router.post('/', async (req, res) => {
  try {
    const { appointmentId, sender, content } = req.body;
    const message = new Message({ appointmentId, sender, content });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

module.exports = router;
