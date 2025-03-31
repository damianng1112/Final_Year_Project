const express = require("express");
const router = express.Router();
const { deepSeekQuery } = require("../../utils/deepseekService");

// Triage route - process symptoms & return an assessment
router.post("/", async (req, res) => {
  const { symptoms } = req.body;

  if (!symptoms) {
    return res.status(400).json({ error: "Symptoms are required." });
  }

  try {
    // Send symptoms to DeepSeek LLM
    const llmResponse = await deepSeekQuery(
      `You are a medical assistant. Analyze the following symptoms and:
      1. Provide a clear, simple explanation of the possible condition.
      2. Rate the severity as 'Mild', 'Moderate', or 'Severe'.
      3. Recommend whether the user should book an appointment or monitor symptoms at home.
      Symptoms: ${symptoms}`
    );

    // Extract response
    const explanation = llmResponse.trim();

    // Determine severity & booking suggestion
    let recommendBooking = false;
    if (explanation.includes("Severe")) {
      recommendBooking = true;
    }

    res.json({ explanation, recommendBooking });
  } catch (error) {
    console.error("Error processing triage:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
