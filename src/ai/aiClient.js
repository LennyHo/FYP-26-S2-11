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

const geminiKeys = process.env.GEMINI_API_KEY
  ? process.env.GEMINI_API_KEY.split(",").map((k) => k.trim()).filter(hasConfiguredApiKey)
  : [];

let currentGeminiKeyIndex = 0;

const hasGroqKey = hasConfiguredApiKey(process.env.GROQ_API_KEY);

const groqClient = axios.create({
  baseURL: "https://api.groq.com/openai/v1",
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${process.env.GROQ_API_KEY || ""}`,
    "Content-Type": "application/json",
  },
});

async function generateText(userMessage, history = [], systemPrompt = "") {
  try {
    return await callGeminiTextWithRotation(userMessage, history, systemPrompt);
  } catch (geminiError) {
    console.warn("[AI] Gemini failed. Falling back to Groq:", geminiError.message);

    if (!hasGroqKey) {
      throw geminiError;
    }

    return callGroqText(userMessage, history, systemPrompt);
  }
}

async function callGeminiTextWithRotation(userMessage, history, systemPrompt) {
  if (geminiKeys.length === 0) {
    throw new Error("No Gemini keys available.");
  }

  let lastError;

  for (let i = 0; i < geminiKeys.length; i++) {
    const indexToTry = (currentGeminiKeyIndex + i) % geminiKeys.length;

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
      return result.response.text();
    } catch (error) {
      console.warn(`[AI] Gemini key ${indexToTry + 1} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`All Gemini keys failed. Last error: ${lastError.message}`);
}

async function callGroqText(userMessage, history, systemPrompt) {
  const response = await groqClient.post("/chat/completions", {
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ],
  });

  return response.data.choices[0].message.content;
}

module.exports = {
  generateText,
};