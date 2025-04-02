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
    // Send symptoms to DeepSeek LLM with enhanced prompt
    const prompt = `You are a medical assistant helping with symptom triage. Analyze these symptoms carefully:

"${symptoms}"

Respond with the following format:
1. Start with "Based on the symptoms described, "
2. Provide a clear, simple explanation of the most likely possible condition(s).
3. Include a line that explicitly states "Severity: [Mild/Moderate/Severe]"
4. Recommend whether the user should book an appointment or monitor symptoms at home.
5. If appropriate, include 2-3 bullet points with self-care tips.

Keep your response concise but informative.`;

    console.log("Sending request to Ollama with DeepSeek model...");
    const llmResponse = await deepSeekQuery(prompt);
    console.log("Received response from DeepSeek model");

    // Extract response
    const explanation = llmResponse.trim();

    // Determine severity & booking suggestion
    let recommendBooking = false;
    let severity = "Mild"; // Default

    if (explanation.toLowerCase().includes("severity: severe") || 
        explanation.toLowerCase().includes("severe")) {
      severity = "Severe";
      recommendBooking = true;
    } else if (explanation.toLowerCase().includes("severity: moderate") || 
               explanation.toLowerCase().includes("moderate")) {
      severity = "Moderate";
      // Recommend booking for moderate cases too
      recommendBooking = true;
    }

    // Also check for explicit booking recommendations
    if (explanation.toLowerCase().includes("book an appointment") || 
        explanation.toLowerCase().includes("see a doctor") ||
        explanation.toLowerCase().includes("medical attention")) {
      recommendBooking = true;
    }

    res.json({ 
      explanation, 
      recommendBooking,
      severity 
    });
  } catch (error) {
    console.error("Error processing triage:", error);
    res.status(500).json({ 
      error: "Failed to process triage request. " + error.message 
    });
  }
});

module.exports = router;