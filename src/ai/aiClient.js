const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

function hasConfiguredApiKey(value) {
  if (!value) return false;

  const normalized = String(value).trim().toLowerCase();

  return !(
    normalized === "" ||
    normalized.includes("your_real") ||
    normalized.includes("your_key_here") ||
    normalized.includes("placeholder")
  );
}

let currentGeminiKeyIndex = 0;

function getGeminiKeys() {
  return process.env.GEMINI_API_KEY
    ? process.env.GEMINI_API_KEY.split(",").map((k) => k.trim()).filter(hasConfiguredApiKey)
    : [];
}

async function generateText(userMessage, history = [], systemPrompt = "") {
  try {
    return await callGeminiTextWithRotation(userMessage, history, systemPrompt);
  } catch (geminiError) {
    console.warn("[AI] Gemini failed. Falling back to Groq:", geminiError.message);

    if (!hasConfiguredApiKey(process.env.GROQ_API_KEY)) {
      throw geminiError;
    }

    try {
      return await callGroqText(userMessage, history, systemPrompt);
    } catch (groqError) {
      console.error("[AI] Groq fallback failed:", groqError.response?.data || groqError.message);
      throw groqError;
    }
  }
}

async function callGeminiTextWithRotation(userMessage, history, systemPrompt) {
  const geminiKeys = getGeminiKeys();

  if (geminiKeys.length === 0) {
    throw new Error("No Gemini keys available.");
  }

  let lastError;

  for (let i = 0; i < geminiKeys.length; i++) {
    const indexToTry = (currentGeminiKeyIndex + i) % geminiKeys.length;

    console.log(`[AI] Trying Gemini key ${indexToTry + 1}/${geminiKeys.length}`);

    try {
      const genAI = new GoogleGenerativeAI(geminiKeys[indexToTry]);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });

      const geminiHistory = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const chatSession = model.startChat({ history: geminiHistory });
      const result = await chatSession.sendMessage(userMessage);

      currentGeminiKeyIndex = indexToTry;
      console.log(`[AI] Gemini key ${indexToTry + 1} succeeded`);

      return result.response.text();
    } catch (error) {
      console.warn(`[AI] Gemini key ${indexToTry + 1} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`All Gemini keys failed. Last error: ${lastError.message}`);
}

async function callGroqText(userMessage, history, systemPrompt) {
  const cleanHistory = history.map((msg) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: String(msg.content || "").slice(0, 1000),
  }));

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        { role: "system", content: String(systemPrompt || "") },
        ...cleanHistory,
        { role: "user", content: String(userMessage || "") },
      ],
    },
    {
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
}

module.exports = {
  generateText,
};