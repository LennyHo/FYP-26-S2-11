const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const PORT = Number(process.env.PORT || 3000);
const CHAT_LANGUAGE_MODE = String(process.env.CHAT_LANGUAGE_MODE || "english").trim().toLowerCase();
const USE_MATCHED_LANGUAGE = CHAT_LANGUAGE_MODE === "match" || CHAT_LANGUAGE_MODE === "same";
const MAX_HISTORY_MESSAGES = 10;
const MAX_CONVERSATIONS = 200;

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
const hasGroqKey = hasConfiguredApiKey(process.env.GROQ_API_KEY);
const hasGeminiKey = hasConfiguredApiKey(process.env.GEMINI_API_KEY);

const groqClient = axios.create({
    baseURL: "https://api.groq.com/openai/v1",
    timeout: 15000,
    headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY || ""}`,
        "Content-Type": "application/json"
    }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// =========================
// FRONTEND
// =========================
app.use(express.static(path.join(__dirname, "frontend")));

// =========================
// LOAD MENU & UTILS
// =========================
const menuDataPath = path.join(__dirname, "data/menu.json");
const menuData = JSON.parse(fs.readFileSync(menuDataPath, "utf8"));

function getNutriGrade(sugarPer100ml) {
    if (sugarPer100ml <= 1) return "A";
    if (sugarPer100ml <= 5) return "B";
    if (sugarPer100ml <= 10) return "C";
    return "D";
}

function filterMenu(menu, userMessage) {
    const msg = userMessage.toLowerCase();
    const priceMatch = msg.match(/(?:below|under|less than)\s*\$?(\d+(\.\d+)?)/);
    const maxPrice = priceMatch ? parseFloat(priceMatch[1]) : null;

    let results = menu.beverages.filter(item => {
        if (maxPrice !== null) return item.price <= maxPrice;
        return true;
    }).map(item => {
        let score = 0;
        item.tags.forEach(tag => {
            if (msg.includes(tag.toLowerCase())) score += 3;
        });
        if (msg.includes(item.name.toLowerCase())) score += 5;
        if (msg.includes("low sugar") && item.base_sugar_g <= 5) score += 3;

        return {
            ...item,
            score,
            nutri_grade: getNutriGrade((item.base_sugar_g / item.base_volume_ml) * 100)
        };
    });

    const maxScore = Math.max(...results.map(r => r.score));
    if (maxScore > 0) results = results.filter(r => r.score > 0);

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

// =========================
// CONVERSATION MEMORY
// =========================
const conversationStore = new Map();

function getConversationHistory(conversationId) {
    if (!conversationStore.has(conversationId)) {
        if (conversationStore.size >= MAX_CONVERSATIONS) {
            const oldestId = conversationStore.keys().next().value;
            conversationStore.delete(oldestId);
        }
        conversationStore.set(conversationId, []);
    }
    return conversationStore.get(conversationId);
}

function appendToConversation(history, message) {
    history.push(message);
    if (history.length > MAX_HISTORY_MESSAGES) {
        history.splice(0, history.length - MAX_HISTORY_MESSAGES);
    }
}

// =========================
// SYSTEM PROMPT BUILDER
// =========================
function buildSystemPrompt(userMessage) {
    // FIX 4: Aggressive Multilingual Rule
    const langInstruction = USE_MATCHED_LANGUAGE 
        ? "CRITICAL MULTILINGUAL RULE: You MUST detect the language of the user's input. If the user types in Chinese (e.g., '我要milo'), you MUST reply ENTIRELY in Chinese. Match their language perfectly!" 
        : "You MUST reply in UK English only, regardless of the user's language.";

    const filtered = filterMenu(menuData, userMessage);
    const structuredData = filtered.map(item => ({
        id: item.id, name: item.name, price: item.price,
        calories: item.base_calories, sugar: item.base_sugar_g,
        nutri_grade: item.nutri_grade, tags: item.tags, description: item.description
    }));

    return `You are the DripTea Health Advisor. Your tone is warm, friendly, and human. 

${langInstruction}

NUTRI-GRADE MATH (Official HPB Guidelines) - DO NOT SHOW FORMULA, JUST SHOW RESULTS:
Base Volume is 500ml. Added Sugar: 0%=0g | 25%=10g | 50%=20g | 100%=40g.
Formula: ((Base Sugar + Added Sugar) / 500) * 100 = Xg per 100ml.
Grade A: <=1g | Grade B: >1g to <=5g | Grade C: >5g to <=10g | Grade D: >10g

STRICT RULES:
1. NEVER recommend a drink that does not match the requested flavor.
2. PRICE OVERRIDE: "under/below $5" means LESS THAN OR EQUAL TO $5.
3. CART MEMORY (MULTI-DRINK): The user can order multiple drinks. Keep track of all drinks they have confirmed in your memory.

AVAILABLE DRINKS CONTEXT:
${JSON.stringify(structuredData, null, 2)}

ORDERING PHASES (Ask ONE question, then STOP AND WAIT):

STEP 1: MENU SELECTION
- If 2+ drinks: List them and ask: "Which one do you prefer?"
- If exactly 1 drink matches: List it and ask: "We have the [Drink Name]. Do you want to choose this?" (NEVER ask "which one" if there is only 1).

PHASE 2: SIZE
Once a drink is confirmed, ask for Size: Medium (base price) or Large (+$1.50). 

PHASE 3: SUGAR SELECTION & EXPLANATION
Ask for Sugar (0%, 25%, 50%, 100%).
CRITICAL MATH RULE: You MUST explicitly explain what the sugar levels do! Say something like: "Just so you know, 0% adds 0g of sugar, 25% adds 10g, 50% adds 20g, and 100% adds 40g. Choosing lower sugar will help keep your Nutri-Grade healthier!"

PHASE 4: TOPPINGS & DYNAMIC RECALCULATION
First, explicitly announce their NEW total sugar and NEW Nutri-Grade based on the size and sugar level they just picked. Let them see the change!
Then ask for toppings. Show stats:
- Pearls (+$1.20 | +150 kcal, +10g sugar)
- Aloe Vera (+$1.00 | +40 kcal, +5g sugar)
- Cheese Foam (+$1.50 | +200 kcal, +8g sugar)

PHASE 5: CHECKOUT OR ADD ANOTHER DRINK
Summarize the CURRENT drink's stats (Size, Sugar, Toppings, Price, Grade).
Then ask: "Would you like to add another drink to your order, or are you ready to checkout?"
- If they want another drink: Acknowledge it, save the first drink in your memory cart, and ask what they want next (Loop back to STEP 1).
- If they are ready to checkout: Summarize ALL the drinks in their final order, give the Grand Total, and say "Redirecting you to the checkout page now!".`;
}

// =========================
// AI APIS (GEMINI & GROQ)
// =========================
const genAI = hasGeminiKey ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

async function callGeminiText(userMessage, history, systemPrompt) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt
    });

    // Map history to Gemini's format
    const geminiHistory = history.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
    }));

    const chatSession = model.startChat({ history: geminiHistory });
    const result = await chatSession.sendMessage(userMessage);
    return result.response.text();
}

async function callGroqText(userMessage, history, systemPrompt) {
    const response = await groqClient.post("/chat/completions", {
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userMessage }
        ]
    });
    return response.data.choices[0].message.content;
}

// =========================
// MAIN ROUTE
// =========================
app.post("/chat", async (req, res) => {
    try {
        const { message, image, conversationId } = req.body || {};
        const safeMessage = typeof message === "string" ? message.trim() : "";
        const safeConversationId = typeof conversationId === "string" && conversationId.trim()
            ? conversationId.trim().slice(0, 64) : "default";

        if (!image && !safeMessage) {
            return res.status(400).json({ reply: "Please send a message.", system_action: { ui_navigation: "none" } });
        }

        console.log(`[CHAT] ${new Date().toISOString()} | msg="${safeMessage.slice(0, 50)}" | img=${Boolean(image)}`);

        // IMAGE HANDLING (Gemini Only)
        if (image) {
            if (!hasGeminiKey) throw new Error("GEMINI_API_KEY is not configured for images.");
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent([
                { text: safeMessage || "Describe this drink" },
                { inlineData: { mimeType: "image/jpeg", data: image } }
            ]);
            
            let replyText = result.response.text();
            return res.json({ reply: replyText, system_action: { ui_navigation: "none" } });
        }

        // TEXT HANDLING (Gemini First -> Fallback to Groq)
        const systemPrompt = buildSystemPrompt(safeMessage);
        const history = getConversationHistory(safeConversationId);
        let textReply = "";

        try {
            if (!hasGeminiKey) throw new Error("Gemini API key missing.");
            // 1. Try Gemini
            textReply = await callGeminiText(safeMessage, history, systemPrompt);
            console.log("[CHAT] Handled successfully by Gemini");
        } catch (geminiError) {
            console.warn("[CHAT] Gemini failed or missing. Falling back to Groq...", geminiError.message);
            // 2. Fallback to Groq
            if (!hasGroqKey) throw new Error("Both AI systems failed or are missing keys.");
            textReply = await callGroqText(safeMessage, history, systemPrompt);
            console.log("[CHAT] Handled successfully by Groq (Fallback)");
        }

        // Append to shared memory only after a successful reply
        appendToConversation(history, { role: "user", content: safeMessage });
        appendToConversation(history, { role: "assistant", content: textReply });

        res.json({
            reply: textReply,
            system_action: { ui_navigation: "none" }
        });

    } catch (error) {
        console.error("Critical Chat Error:", error.message);
        res.status(500).json({
            reply: "System busy, please try again.",
            system_action: { ui_navigation: "none" }
        });
    }
});

// =========================
app.listen(PORT, () => {
    console.log(`DripTea running on http://localhost:${PORT}`);
    console.log(`[Startup] Gemini Configured (Primary): ${hasGeminiKey}`);
    console.log(`[Startup] Groq Configured (Fallback): ${hasGroqKey}`);
});