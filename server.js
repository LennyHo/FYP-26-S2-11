const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const PORT = Number(process.env.PORT || 5000);
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
// LOAD MENU
// =========================
const menuData = JSON.parse(fs.readFileSync("./data/menu.json", "utf8"));

// =========================
// NUTRI-GRADE FUNCTION
// =========================
function getNutriGrade(sugarPer100ml) {
    if (sugarPer100ml <= 1) return "A";
    if (sugarPer100ml <= 5) return "B";
    if (sugarPer100ml <= 10) return "C";
    return "D";
}

// =========================
// SCORE-BASED FILTER (BULLETPROOF VERSION)
// =========================
function filterMenu(menu, userMessage) {
    const msg = userMessage.toLowerCase();

    // 1. Detect if the user set a hard price limit
    const priceMatch = msg.match(/(?:below|under|less than)\s*\$?(\d+(\.\d+)?)/);
    const maxPrice = priceMatch ? parseFloat(priceMatch[1]) : null;

    // 2. Filter BEFORE scoring
    let results = menu.beverages.filter(item => {
        // STRICT JAVASCRIPT FILTER: "Under $5" means Less Than OR EXACTLY EQUAL To $5.
        if (maxPrice !== null) {
            return item.price <= maxPrice; 
        }
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

    // 3. Only keep drinks that actually match the flavor/words asked
    const maxScore = Math.max(...results.map(r => r.score));
    if (maxScore > 0) {
        results = results.filter(r => r.score > 0);
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

// =========================
// GEMINI (IMAGE BRAIN)
// =========================
let model = null;
if (hasGeminiKey) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });
}

// =========================
// GROQ (TEXT BRAIN & MEMORY)
// =========================
const conversationStore = new Map();

function getLanguageInstruction() {
    if (USE_MATCHED_LANGUAGE) {
        return "You MUST detect the language of the user's latest message. If the message is clearly English OR ambiguous Latin-alphabet text, reply in UK English. Only reply in another language when the user's language is clearly non-English.";
    }

    return "You MUST reply in UK English only, regardless of the user's language.";
}

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

async function callGroq(userMessage, conversationId) {
    if (!hasGroqKey) {
        return {
            reply: "Groq API key is missing or still a placeholder. Please set GROQ_API_KEY in DripTea_V1/.env and restart the backend.",
            system_action: { ui_navigation: "none" }
        };
    }

    const filtered = filterMenu(menuData, userMessage);

    const structuredData = filtered.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        calories: item.base_calories,
        sugar: item.base_sugar_g,
        nutri_grade: item.nutri_grade,
        tags: item.tags,
        description: item.description
    }));

    const conversationHistory = getConversationHistory(conversationId);
    appendToConversation(conversationHistory, { role: "user", content: userMessage });

    const systemPrompt = `
You are the DripTea Health Advisor. Your tone is warm, friendly, and human. 

MULTILINGUAL RULE (STRICT & CRITICAL):
${getLanguageInstruction()}

NUTRI-GRADE MATH (Official HPB Guidelines): (HIDDEN INTERNAL LOGIC - DO NOT SHOW MATH TO USER):
Base Volume is 500ml.
Added Sugar: 0% = 0g | 25% = 10g | 50% = 20g | 100% = 40g.
Formula: ((Base Sugar + Added Sugar) / 500) * 100 = Xg per 100ml.
* Grade A: <= 1g
* Grade B: > 1g to <= 5g
* Grade C: > 5g to <= 10g
* Grade D: > 10g

STRICT FLAVOR & PRICE RULES (CRITICAL):
1. NEVER recommend a drink that does not match the user's requested flavor. If they ask for chocolate, DO NOT suggest Milk Tea.
2. PRICE OVERRIDE: If a user asks for drinks "under", "below", or "for" a certain price (e.g., $5), you MUST treat that as "LESS THAN OR EQUAL TO". You MUST include drinks that are exactly that price (e.g., $5.00).
3. NEVER show the math formula or calculations to the user. Just show the final Grade and Calories.
4. If no drink perfectly matches their request, apologize and offer the closest match.
5. SMART GUESSING: If you showed MULTIPLE drinks and the user says "this one" or "yes", you MUST ask them to clarify which drink. However, if you only showed ONE single drink, and the user says "yes" or "this one", you MUST accept that as a confirmation for that specific drink and proceed to Phase 2.

ORDERING RULES:
Guide the user ONE STEP AT A TIME. DO NOT list the whole flow at once. Ask ONE question, then STOP.

AVAILABLE DRINKS CONTEXT:
${JSON.stringify(structuredData, null, 2)}

ORDERING PHASES (Determine the phase, do it, and WAIT):

STEP 1: MENU SELECTION
Analyze the AVAILABLE DRINKS CONTEXT.
SCENARIO A: There are 2 OR MORE drinks.
1. List each drink: "- [Name] ($[Price]) | Grade: [Grade] | Sugar: [Sugar]g | Calories: [Calories] kcal"
2. Ask: "Which one would you like?"
(STOP AND WAIT).
SCENARIO B: There is ONLY 1 drink.
You MUST provide the drink stats and the size question in ONE SINGLE MESSAGE. Follow this exact template:
- [Drink Name] ($[Price]) | Grade: [Grade] | Sugar: [Sugar]g | Calories: [Calories] kcal
We have the [Drink Name]! Do you like this?
(Example for Milo:
- Milo Dinosaur ($5.00) | Grade: B | Sugar: 12g | Calories: 220 kcal
We have the [Drink Name]! Do you like this? 
(STOP AND WAIT).

PHASE 2: SIZE & SUGAR (WITH PROACTIVE HEALTH ADVICE)
(CRITICAL RULE: If the user types the actual name of the drink, DO NOT ask them to confirm. Move straight to this phase!)
Once the drink is confirmed, ask for the Size. 
SIZE RULES: You ONLY have Medium (base price) and Large (base price + $1.50). YOU DO NOT HAVE A SMALL SIZE. NEVER OFFER SMALL.
Calculate and show the EXACT final price for Medium and Large. (e.g., "Medium $5.00, Large $6.50"). (STOP HERE).

PHASE 3: SUGAR SELECTION (WITH PROACTIVE HEALTH ADVICE)
Once size is picked, ask for their Sugar level (0%, 25%, 50%, 100%).
CRITICAL ADVICE: You MUST actively recommend choosing lesser sugar (like 0% or 25%) for a healthier choice, explaining it can improve their Nutri-Grade! (STOP HERE).

PHASE 4: TOPPINGS & RECALCULATION
Once sugar is picked, immediately congratulate them and proudly state their CURRENT Nutri-Grade, total Sugar, and total Calories based on their size and sugar choices.
THEN, casually ask if they want Toppings. You MUST show the price AND the nutritional impact next to each topping option so they can decide safely.
Use these exact stats for the toppings:
- Pearls (+$1.20 | adds 150 kcal & 10g sugar)
- Aloe Vera (+$1.00 | adds 40 kcal & 5g sugar)
- Cheese Foam (+$1.50 | adds 200 kcal & 8g sugar)
(STOP HERE).

PHASE 5: CHECKOUT
Summarize their complete custom order (Drink, Size, Sugar, Toppings, Final Price, Final Nutri-Grade, Final Calories). 
DO NOT ask them to change their sugar level here. Simply ask if they are ready to check out.
If they say yes, respond with "Great! Redirecting you to the checkout page now!".
`;

    try {
        const response = await groqClient.post(
            "/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                temperature: 0.7,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...conversationHistory.slice(-10)
                ]
            }
        );

        const textReply = response.data.choices[0].message.content;
        appendToConversation(conversationHistory, { role: "assistant", content: textReply });

        return {
            reply: textReply,
            system_action: { ui_navigation: "none" }
        };

    } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.error?.message || err.message;
        console.error("Groq Error:", status || "unknown", detail);
        return {
            reply: `Groq connection failed (${status || "network"}): ${detail || "unknown error"}`,
            system_action: { ui_navigation: "none" }
        };
    }
}

app.get("/health/ai", async (_req, res) => {
    const result = {
        groq: {
            configured: hasGroqKey,
            reachable: false,
            status: null,
            detail: ""
        },
        gemini: {
            configured: hasGeminiKey
        },
        language_mode: USE_MATCHED_LANGUAGE ? "match" : "english"
    };

    if (!hasGroqKey) {
        result.groq.detail = "GROQ_API_KEY is missing or placeholder.";
        return res.status(200).json(result);
    }

    try {
        const response = await groqClient.get("/models");
        result.groq.reachable = true;
        result.groq.status = response.status;
        result.groq.detail = "Groq API reachable.";
        return res.status(200).json(result);
    } catch (error) {
        result.groq.status = error.response?.status || null;
        result.groq.detail = error.response?.data?.error?.message || error.message;
        return res.status(502).json(result);
    }
});

// =========================
// MAIN ROUTE
// =========================
app.post("/chat", async (req, res) => {
    try {
        const { message, image, conversationId } = req.body || {};
        let jsonResponse;
        const safeMessage = typeof message === "string" ? message.trim() : "";
        const safeConversationId = typeof conversationId === "string" && conversationId.trim()
            ? conversationId.trim().slice(0, 64)
            : "default";

        if (!image && !safeMessage) {
            return res.status(400).json({
                reply: "Please send a message.",
                system_action: { ui_navigation: "none" }
            });
        }

        console.log(
            `[CHAT] ${new Date().toISOString()} | message="${safeMessage.slice(0, 80)}" | hasImage=${Boolean(image)}`
        );

        if (image) {
            if (!model) {
                return res.status(400).json({
                    reply: "Image analysis is unavailable because GEMINI_API_KEY is not configured.",
                    system_action: { ui_navigation: "none" }
                });
            }

            const chatSession = model.startChat();
            const result = await chatSession.sendMessage([
                { text: message || "Describe this drink" },
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: image
                    }
                }
            ]);

            const text = result.response.text();
            try {
                jsonResponse = JSON.parse(text);
            } catch {
                jsonResponse = {
                    reply: text,
                    system_action: { ui_navigation: "none" }
                };
            }
        } else {
            jsonResponse = await callGroq(safeMessage, safeConversationId);
        }

        res.json(jsonResponse);
        console.log(`[CHAT] ${new Date().toISOString()} | response sent`);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            reply: "System busy, please try again.",
            system_action: { ui_navigation: "none" }
        });
    }
});

// =========================
app.listen(PORT, () => {
    console.log(`DripTea running on http://localhost:${PORT}`);
    console.log(`[Startup] Groq key configured: ${hasGroqKey}`);
    console.log(`[Startup] Gemini key configured: ${hasGeminiKey}`);
    console.log(`[Startup] Chat language mode: ${USE_MATCHED_LANGUAGE ? "match" : "english"}`);
    console.log(`[Startup] AI health check: http://localhost:${PORT}/health/ai`);
});