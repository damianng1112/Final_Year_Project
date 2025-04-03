const express = require("express");
const router = express.Router();
const { deepSeekQuery } = require("../../utils/deepseekService");

// Improved triage route with better prompt and result extraction
router.post("/", async (req, res) => {
  const { symptoms } = req.body;

  if (!symptoms) {
    return res.status(400).json({ error: "Symptoms are required." });
  }

  try {
    // Enhanced prompt for more accurate assessment
    const prompt = `You are an AI medical assistant trained to provide preliminary symptom assessments. 
    Analyze these symptoms carefully and provide a structured response:

    "${symptoms}"

    Follow these specific guidelines:
    1. Start with "Based on the symptoms described, "
    2. Provide a concise explanation of the most likely possible condition(s).
    3. Explicitly state the severity level as "Severity: [Mild/Moderate/Severe]" 
       - Use Mild for non-urgent conditions that can be managed at home
       - Use Moderate for conditions requiring medical attention within days
       - Use Severe for conditions requiring urgent medical attention within 24 hours
    4. Clearly state whether the patient should seek medical attention.
    5. If appropriate, include 2-3 bullet points with self-care tips.

    Maintain a professional but compassionate tone. Ensure your response is conservative - when in doubt about severity, err on the side of caution.`;

    console.log("Sending request to DeepSeek model...");
    const llmResponse = await deepSeekQuery(prompt);
    console.log("Received response from DeepSeek model");

    // Extract response and determine severity
    const explanation = llmResponse.trim();
    
    // Enhanced severity detection with regex
    let severity = "Mild"; // Default
    const severityMatch = explanation.match(/severity:\s*(mild|moderate|severe)/i);
    
    if (severityMatch) {
      severity = severityMatch[1].charAt(0).toUpperCase() + severityMatch[1].slice(1).toLowerCase();
    } else if (explanation.toLowerCase().includes("severe")) {
      severity = "Severe";
    } else if (explanation.toLowerCase().includes("moderate")) {
      severity = "Moderate";
    }
    
    // Determine if booking is recommended based on severity and content
    let recommendBooking = false;
    
    if (severity === "Severe") {
      recommendBooking = true;
    } else if (severity === "Moderate") {
      recommendBooking = true;
    } else {
      // Check for specific phrases indicating medical attention is needed
      const needAttentionPhrases = [
        "see a doctor", 
        "medical attention", 
        "consult", 
        "seek help",
        "appointment", 
        "healthcare provider",
        "specialist"
      ];
      
      recommendBooking = needAttentionPhrases.some(phrase => 
        explanation.toLowerCase().includes(phrase)
      );
    }
    
    // Ensure correct severity classification is in the response text
    if (!explanation.includes(`Severity: ${severity}`)) {
      const updatedExplanation = explanation.replace(
        /Severity:\s*(mild|moderate|severe)/i,
        `Severity: ${severity}`
      );
      res.json({ 
        explanation: updatedExplanation || explanation, 
        recommendBooking,
        severity 
      });
    } else {
      res.json({ 
        explanation, 
        recommendBooking,
        severity 
      });
    }
  } catch (error) {
    console.error("Error processing triage:", error);
    res.status(500).json({ 
      error: "Failed to process triage request. " + error.message 
    });
  }
});

module.exports = router;