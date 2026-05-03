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

// =========================
// MULTI-KEY SETUP
// =========================
const hasGroqKey = hasConfiguredApiKey(process.env.GROQ_API_KEY);

// Split the comma-separated Gemini keys into an array, clean up spaces, and remove empty/fake ones
const geminiKeys = process.env.GEMINI_API_KEY 
    ? process.env.GEMINI_API_KEY.split(",").map(k => k.trim()).filter(hasConfiguredApiKey)
    : [];

// We start at index 0 (the first key)
let currentGeminiKeyIndex = 0; 

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

    const isRecommendRequest = /recommend|signature|best|推荐|招牌|介绍|其他/.test(msg);

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
    const langInstruction = USE_MATCHED_LANGUAGE 
        ? "CRITICAL FINAL RULE: You MUST reply in the exact same language as the user's last message! If they spoke Chinese, reply in Chinese. If English, reply in English." 
        : "CRITICAL FINAL RULE: You MUST reply in UK English only, regardless of the user's language.";

    const filtered = filterMenu(menuData, userMessage);
    const structuredData = filtered.map(item => ({
        id: item.id, name: item.name, price: item.price,
        calories: item.base_calories, sugar: item.base_sugar_g,
        nutri_grade: item.nutri_grade, tags: item.tags, description: item.description, image: item.image
    }));

    return `You are the DripTea Health Advisor. You are a helpful, human-like AI.

AVAILABLE DRINKS CONTEXT:
${JSON.stringify(structuredData, null, 2)}

NUTRI-GRADE MATH (Official HPB Guidelines):
Base Volume is 500ml. Added Sugar: 0%=0g | 25%=10g | 50%=20g | 100%=40g.
Formula: ((Base Sugar + Added Sugar) / 500) * 100 = Xg per 100ml.
Grade A: <=1g | Grade B: >1g to <=5g | Grade C: >5g to <=10g | Grade D: >10g

STRICT BEHAVIOR RULES:
1. NEVER recommend a drink that does not match the requested flavor.
2. CART MEMORY: Keep track of all drinks the user has confirmed.
3. HTML OVERRIDE: When generating buttons or new lines, you MUST use exact HTML brackets like <button> and <br>. 
4. FAST-TRACK ORDERING: If user gives ALL details (Name, Size, Sugar, Toppings, Checkout intent), bypass all phases.
5. PARTIAL FAST-TRACK: If user gives multiple details but forgets something, ask ONLY for the missing piece.

ORDERING PHASES (Do exactly what the phase says, then STOP):

STEP 1: MENU SELECTION
- If AVAILABLE DRINKS CONTEXT is empty: This means the user hasn't specified a drink. DO NOT list any drinks. Simply ask them what they are in the mood for (e.g., "What flavor or type of drink would you like today?").
- If the user asks for recommendations: Introduce the drinks as: "Here are our highly recommended signature drinks:" (Translate to their language).
- When listing drinks, format EACH drink EXACTLY like this with a line break at the end (Translate the labels to their language):
"[Name] ($[Price]) | Nutri Grade: [Grade] | Sugar: [Sugar]g | Calories: [Calories] kcal<br><br>"
- ONLY AFTER listing all the drinks completely, you MUST ask ONE final question at the very bottom:
  * If there is exactly 1 drink: "Do you want to choose this?" (Translate to their language)
  * If there are 2 or more drinks: "Which one would you like to choose?" (Translate to their language)
- NEVER repeat previous search categories (like "chocolate drinks") if the user is asking for something new.

PHASE 2: SIZE
Once confirmed, calculate the exact prices and ask using this structure (Translate to their language): 
"Alright, a [Name]! Would you like Medium ($[Base Price]) or Large ($[Base Price + 1.50])?"

PHASE 3: SUGAR SELECTION
Ask for Sugar (0%, 25%, 50%, 100%).
Use this structure with the <br><br> break (Translate to their language):
"Alright, a [Size] [Name]! Now, for the sugar level. Would you like 0%, 25%, 50%, or 100%?<br><br>Just so you know, 0% adds 0g of sugar, 25% adds 10g, 50% adds 20g, and 100% adds 40g. Choosing lower sugar helps keep your Nutri-Grade healthier!"

PHASE 4: TOPPINGS & RECALCULATION
Announce the recalculated stats using this structure (Translate to their language):
"With your chosen size and sugar level, your drink:<br>[Name] ($[Calculated Price]) | Nutri Grade: [New Grade] | Sugar: [New Sugar]g | Calories: [New Calories] kcal<br><br>You can now choose from the following toppings:<br>Pearls (+$1.20), Aloe Vera (+$1.00), Cheese Foam (+$1.50)."

PHASE 5: CART SUMMARY & ACTIONS
Once toppings are selected (or if the user fast-tracks multiple drinks), you MUST summarize the cart. 
CRITICAL RULE: You MUST list the individual stats (Sugar, Calories, Grade) directly underneath EACH drink. Do NOT combine the stats at the bottom.

Use this EXACT structure (Translate to their language, EXCEPT the HTML code):
"You currently have the following in your cart:<br><br>
* **[Drink 1 Name]** ([Size], [Sugar], [Toppings])<br>
  - Sugar: [Total]g | Calories: [Total] kcal | Nutri-Grade: [Grade]<br><br>
* **[Drink 2 Name]** ([Size], [Sugar], [Toppings])<br>
  - Sugar: [Total]g | Calories: [Total] kcal | Nutri-Grade: [Grade]<br><br>
*(Repeat for all drinks in the cart)*

<div class='hidden-cart-data' style='display:none;'>
[Drink 1 Name] | [Size], [Sugar], [Toppings] | [Drink 1 Price] | [Image Path]
[Drink 2 Name] | [Size], [Sugar], [Toppings] | [Drink 2 Price] | [Image Path]
</div>

Total price: S$ [Calculate Grand Total]<br>
I will add this to your cart.<br><br><button class='chat-nav-btn' onclick='openCart()'>Check My Cart</button><br><br>
Would you like to add another drink to your order, or are you ready to checkout?<br><br><button class='chat-nav-btn' onclick='goToCheckoutPage([Grand Total])'>Proceed to Checkout</button>"

PHASE 6: FINAL CHECKOUT ACTION
If the user asks for another drink: Start over at STEP 1 for their new drink request.
If the user says check out, DO NOT ask them if they want another drink and reply EXACTLY with this string (Make sure to put the actual Grand Total number inside the parentheses) (translated to their language):
"Great! Let's get that processed for you. <br><br><button class='chat-nav-btn' onclick='goToCheckoutPage([Insert Grand Total Number Here])'>Proceed to Checkout</button>"

${langInstruction}`;
}

// =========================
// AI APIS (GEMINI ROTATOR & GROQ)
// =========================

// This function attempts to use Gemini, cycling through keys if one fails
async function callGeminiTextWithRotation(userMessage, history, systemPrompt) {
    if (geminiKeys.length === 0) throw new Error("No Gemini keys available.");

    let lastError;
    // Loop through however many keys you provided
    for (let i = 0; i < geminiKeys.length; i++) {
        // This ensures we start with the current working key, but will cycle to the next if it fails
        let indexToTry = (currentGeminiKeyIndex + i) % geminiKeys.length;
        
        try {
            const genAI = new GoogleGenerativeAI(geminiKeys[indexToTry]);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: systemPrompt
            });

            const geminiHistory = history.map(msg => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
            }));

            const chatSession = model.startChat({ history: geminiHistory });
            const result = await chatSession.sendMessage(userMessage);
            
            // If it succeeds, set this as the new active key so we don't keep trying broken ones
            currentGeminiKeyIndex = indexToTry;
            return result.response.text();
        } catch (err) {
            console.warn(`[CHAT] Gemini Key ${indexToTry + 1} failed:`, err.message);
            lastError = err;
            // The loop will naturally continue to the next key...
        }
    }
    
    // If we break out of the loop, ALL Gemini keys have failed
    throw new Error(`All ${geminiKeys.length} Gemini keys failed. Last error: ${lastError.message}`);
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

        // IMAGE HANDLING (Gemini Rotator)
        if (image) {
            if (geminiKeys.length === 0) throw new Error("GEMINI_API_KEY is not configured for images.");
            
            let imageReply = null;
            let lastErr = null;
            
            for (let i = 0; i < geminiKeys.length; i++) {
                let indexToTry = (currentGeminiKeyIndex + i) % geminiKeys.length;
                try {
                    const genAI = new GoogleGenerativeAI(geminiKeys[indexToTry]);
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const result = await model.generateContent([
                        { text: safeMessage || "Describe this drink" },
                        { inlineData: { mimeType: "image/jpeg", data: image } }
                    ]);
                    imageReply = result.response.text();
                    currentGeminiKeyIndex = indexToTry;
                    break; // Success! Break out of the loop
                } catch (err) {
                    console.warn(`[CHAT] Image Gemini Key ${indexToTry + 1} failed:`, err.message);
                    lastErr = err;
                }
            }
            
            if (!imageReply) throw new Error("All Gemini keys failed for image request.");
            return res.json({ reply: imageReply, system_action: { ui_navigation: "none" } });
        }

        // TEXT HANDLING (Gemini Rotator -> Fallback to Groq)
        const systemPrompt = buildSystemPrompt(safeMessage);
        const history = getConversationHistory(safeConversationId);
        let textReply = "";

        try {
            // 1. Try ALL Gemini keys via the rotator
            textReply = await callGeminiTextWithRotation(safeMessage, history, systemPrompt);
            console.log(`[CHAT] Handled successfully by Gemini (Using Key ${currentGeminiKeyIndex + 1})`);
        } catch (geminiError) {
            console.warn("[CHAT] ALL Gemini keys failed. Falling back to Groq...", geminiError.message);
            // 2. Fallback to Groq
            if (!hasGroqKey) throw new Error("Both AI systems (and all keys) failed.");
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
            reply: "Kitchen is busy, please try again.",
            system_action: { ui_navigation: "none" }
        });
    }
});

// =========================
app.listen(PORT, () => {
    console.log(`DripTea running on http://localhost:${PORT}`);
});
