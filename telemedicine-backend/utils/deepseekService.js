const axios = require("axios");

const deepSeekQuery = async (prompt) => {
  try {
    const response = await axios.post("http://ollama:11434/api/generate", {
      model: "deepseek-r1:1.5b", // Using the DeepSeek model
      prompt: prompt,
      stream: false
    });

    let result = response.data.response;
    
    result = result.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    result = result.replace(/\s+/g, ' ').trim();
    
    return result;
  } catch (error) {
    console.error("Ollama API error:", error.response?.data || error.message);
    throw new Error("Failed to communicate with local LLM. " + 
      (error.message.includes("ECONNREFUSED") ? 
        "Make sure Ollama is running on your machine." : 
        error.message)
    );
  }
};

module.exports = { deepSeekQuery };