const axios = require("axios");

const deepSeekQuery = async (prompt) => {
  try {
    const response = await axios.post("http://localhost:8000/v1/chat/completions", {
      model: "deepseek-llm",
      messages: [{ role: "system", content: "You are a helpful AI medical assistant." }, { role: "user", content: prompt }],
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("DeepSeek API error:", error);
    throw new Error("Failed to communicate with LLM.");
  }
};

module.exports = { deepSeekQuery };
