const express = require('express');
const router = express.Router();

router.get('/:appointmentId', (req, res) => {
  // Implement message history logic
  res.json([]);
});

module.exports = router;