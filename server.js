const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// done by "HDC" - MongoDB/Express routes for auth, menu, cart, checkout, and payments.
const dripTeaRoutes = require("./src/routes/driptea.routes");
const { connectMongo } = require("./src/config/mongo");
const { env } = require("./src/config/env");
// end done by "HDC"

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

// done by "HDC" - mount the MongoDB-backed API without changing the existing chatbot route.
app.use("/api", dripTeaRoutes);
// end done by "HDC"

app.get("/health/supabase", (_req, res) => {
    return res.status(410).json({
        ok: false,
        configured: false,
        message: "Supabase was removed from this backend. Use /api/health instead.",
    });
});

// =========================
// LOAD MENU & UTILS
// =========================
const menuData = JSON.parse(fs.readFileSync("./data/menu.json", "utf8"));

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
function isMenuRequest(userMessage) {
    const msg = userMessage.toLowerCase();
    // Detect if user is asking for recommendations, categories, comparisons, or menu
    const menuKeywords = /recommend|suggest|signature|best|menu|list|show.*drink|what.*have|category|sugar.*compar|calor.*compar|compare|low sugar|healthy|diet|allerg|ingredi|option/i;
    const greetingKeywords = /^(hi|hello|hey|good morning|good afternoon|good evening|what's up|sup|howdy|hola|你好|ni hao|salut|ciao|namaste)/i;
    
    // If it's just a greeting, don't show menu
    if (greetingKeywords.test(msg) && msg.length < 30) {
        return false;
    }
    
    return menuKeywords.test(msg);
}

function buildSystemPrompt(userMessage) {
    const langInstruction = USE_MATCHED_LANGUAGE 
        ? "CRITICAL FINAL RULE: You MUST reply in the exact same language as the user's last message! If they spoke Chinese, reply in Chinese. If English, reply in English." 
        : "CRITICAL FINAL RULE: You MUST reply in UK English only, regardless of the user's language.";

    // Only show menu if user is asking for it
    let drinkContext = "";
    if (isMenuRequest(userMessage)) {
        const filtered = filterMenu(menuData, userMessage);
        const structuredData = filtered.map(item => ({
            id: item.id, name: item.name, price: item.price,
            calories: item.base_calories, sugar: item.base_sugar_g,
            nutri_grade: item.nutri_grade, tags: item.tags, description: item.description, image: item.image
        }));
        drinkContext = `AVAILABLE DRINKS CONTEXT:
${JSON.stringify(structuredData, null, 2)}`;
    } else {
        drinkContext = "NOTE: Menu items will be shown only when the user asks for recommendations, categories, comparisons, or explicitly requests to see the menu.";
    }

    return `You are Avy, the DripTea Health Advisor. You are a helpful, human-like AI assistant.

${drinkContext}
LIVE STORE CONTEXT:
- **Bugis Junction Branch**: 400m away | Current Queue: 5 mins (Quiet)
- **Downtown Branch**: 2km away | Current Queue: 25 mins (Packed)
- **Campus Branch**: 5km away | Current Queue: 12 mins (Normal)

NUTRI-GRADE MATH (Official HPB Guidelines):
Base Volume is 500ml. Added Sugar: 0%=0g | 25%=10g | 50%=20g | 100%=40g.
Formula: ((Base Sugar + Added Sugar) / 500) * 100 = Xg per 100ml.
Grade A: <=1g | Grade B: >1g to <=5g | Grade C: >5g to <=10g | Grade D: >10g

CONVERSATION RULES (CRITICAL):
1. PERSONA: Act like an authentic, straightforward human receptionist at a tea shop. Speak naturally. Do NOT use flowery marketing language, and absolutely do NOT over-explain.
2. THE "BOTTOM LINE" RULE: When asked a question, give the simplest, most direct factual answer first (1-2 short sentences). If there is more information available, simply point them to it (e.g., "You can read all about it on our 'Our Story' page!").
3. GREETINGS: Keep it casual and brief. Example: "Hi! Welcome to DripTea. What can I get for you today?"
4. INFORMATIONAL RESPONSES: Keep it factual and human. Example: "Da Hong Pao is a roasted oolong tea from a small village. Let me know if you want to try it, or I can show you the menu!"
5. WHEN TO SHOW MENU: Only show menu items if the user EXPLICITLY asks for recommendations, comparisons, the full menu, or to order.
6. HEALTH QUESTIONS: Answer straightforwardly with facts, keeping it brief.
7. NEVER recommend a drink that does not match the requested flavor.
8. CART MEMORY: Keep track of all drinks the user has confirmed.
9. HTML OVERRIDE: When generating buttons or new lines, use exact HTML brackets like <button> and <br>. 
10. FAST-TRACK ORDERING: If user gives ALL details (Name, Size, Sugar, Toppings), bypass phases.
11. PARTIAL FAST-TRACK: Ask ONLY for the missing piece in one simple sentence.
12. OFF-TOPIC HANDLING: Give a brief, authentic redirect. Example: "I just handle the tea orders here! Want to see the menu?"
13. LOCATION & QUEUE AWARENESS: Check LIVE STORE CONTEXT and state the closest branch and queue time directly.

ORDERING PHASES (Only start these when user explicitly wants to order):

PHASE 1: ITEM SELECTION & MENU DISPLAY
- If AVAILABLE DRINKS CONTEXT is empty: DO NOT list any drinks. Simply ask them what flavor they are in the mood for.
- If they type a name or ask for recommendations: Introduce the drinks. Format EACH drink EXACTLY like this with a line break at the end:
"<img src='[image]' alt='[Name]'><br>
**[Name]** ($[Price])<br>
Nutri Grade: [Grade] | Sugar: [Sugar]g | Calories: [Calories] kcal<br>
<button onclick='startOrder(\"[id]\")'>Choose This Drink</button><br><br>"
- ONLY AFTER listing all the drinks completely, ask ONE final question: "Which one would you like to choose?" (Translate to their language).

PHASE 2: SIZE
Once the drink is confirmed, ask the user if they want Medium ($[Base Price]) or Large ($[Base Price + 1.50]). 
RULE: Be conversational and natural. Do not use the exact same phrasing every time. 

PHASE 3: ICE LEVEL SELECTION & THE HEALTH NUDGE
Once the size is confirmed, ask for their preferred ice level (Normal Ice, Less Ice, No Ice, Hot) (Translate to their language):
"Great choice! Your [Size] [Name] is recorded. <br><br>Which ice level do you prefer? Normal Ice, Less Ice, No Ice, or Hot?" (Translate to their language).
- If the user selects "Normal Ice": Praise their choice and proceed to sugar selection.
- If they select "Less Ice" or "No Ice": Acknowledge their preference and say "Got it, I'll make a note of that. Now, let's move on to sugar level." Then proceed to sugar selection.
- If they select "Hot": Acknowledge that hot drinks have no ice and say "Great, a hot [Name] it is! Now, let's decide on the sugar level." Then proceed to sugar selection.

PHASE 4: SUGAR SELECTION & THE HEALTH NUDGE
Once the ice level is confirmed, ask for their preferred sugar level (0%, 25%, 50%, 100%).
- If the user asks for 50% or 100% sugar: You MUST pause and offer a proactive health nudge before moving to toppings. 
  * Example structure (Translate to their language): "Just a heads-up, 100% sugar adds 40g of sugar, making this a Nutri-Grade D. Would you like to try it 'Siu Dai' (25% sugar) for a healthier Grade B instead?"
- If the user selects 0% or 25% sugar, or insists on their high sugar choice: Praise their choice and proceed to Phase 4.

PHASE 5: TOPPINGS & RECALCULATION
Once sugar is finalized, announce the updated stats using this natural structure (Translate to their language):
"Great choice! With that sugar level, your [Size] [Name] is a Nutri-Grade [New Grade] ([New Calories] kcal). <br><br>Would you like to add any toppings? We have Pearls (+$1.20), Aloe Vera (+$1.00), or Cheese Foam (+$1.50)."

PHASE 6: CART SUMMARY & ACTIONS
Once toppings are selected (or if the user fast-tracks multiple drinks), you MUST summarize the cart. 
CRITICAL RULE: You MUST list the individual stats (Sugar, Calories, Grade) directly underneath EACH drink. Do NOT combine the stats at the bottom.

Use this EXACT structure (Translate to their language, EXCEPT the HTML code):
"You currently have the following in your cart:<br><br>
* **[Drink 1 Name]** - S$ [Drink 1 Price]
  - [Size] · [ICE Level] · [Sugar], [Toppings]
  - Sugar: [Total]g | Calories: [Total] kcal | Nutri-Grade: [Grade]<br>
* **[Drink 2 Name]** - S$ [Drink 2 Price]
  - [Size] · [ICE Level] · [Sugar], [Toppings]
  - Sugar: [Total]g | Calories: [Total] kcal | Nutri-Grade: [Grade]<br>
*(Repeat for all drinks in the cart)*

<div class='hidden-cart-data' style='display:none;'>
[Drink 1 Name] | [Size] · [ICE Level]· [Sugar], [Toppings] | [Drink 1 Price] | [Image Path]
[Drink 2 Name] | [Size] · [ICE Level] · [Sugar], [Toppings] | [Drink 2 Price] | [Image Path]
</div>

Total price: S$ [Calculate Grand Total]<br><br>
I will add this to your cart.
<button class="chat-nav-btn-compact" onclick="handleCart()">Check My Cart</button><br>
Would you like to add another drink to your order, or are you ready to checkout?
<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>"

PHASE 7: FINAL CHECKOUT ACTION
If the user asks for another drink: Start over at PHASE 1 for their new drink request.
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

        // If the assistant produced a visible cart summary but did not include the
        // hidden-cart-data block, synthesize one here so clients can reliably parse it.
        try {
            const hasHidden = typeof textReply === 'string' && textReply.includes('hidden-cart-data');
            if (!hasHidden && typeof textReply === 'string' && /You currently have the following in your cart:/i.test(textReply)) {
                const lines = textReply.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const hiddenLines = [];
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const m = line.match(/^\*\s*\*\*([^*]+)\*\*\s*-\s*S\$?\s*([0-9]+(?:\.[0-9]+)?)/i);
                    if (m) {
                        const name = m[1].trim();
                        const price = m[2].trim();
                        // collect following detail lines starting with '-' if any
                        const details = [];
                        let j = i + 1;
                        while (j < lines.length && /^[-*]/.test(lines[j])) {
                            details.push(lines[j].replace(/^[-*]\s*/, '').trim());
                            j++;
                        }
                        hiddenLines.push(`${name} | ${details.join(' · ')} | S$ ${parseFloat(price).toFixed(2)} | `);
                        i = j - 1;
                    }
                }

                if (hiddenLines.length > 0) {
                    const hiddenBlock = "\n<div class='hidden-cart-data' style='display:none;'>\n" + hiddenLines.join('\n') + "\n</div>\n";
                    textReply = textReply + hiddenBlock + "\n";
                    console.log('[CHAT] injected hidden-cart-data block with', hiddenLines.length, 'items');
                }
            }
        } catch (e) {
            console.warn('[CHAT] failed to synthesize hidden-cart-data:', e.message);
        }

        // Append to shared memory only after a successful reply
        appendToConversation(history, { role: "user", content: safeMessage });
        appendToConversation(history, { role: "assistant", content: textReply });

        res.json({
            reply: textReply,
            system_action: { ui_navigation: "none" }
        });

    } catch (error) {
        // Log full error for debugging (stack when available)
        console.error("Critical Chat Error:", error && error.stack ? error.stack : error);

        // In non-production, return a small debug hint (message only) to help during development.
        const debugInfo = (typeof env !== 'undefined' && env.nodeEnv !== 'production')
            ? { debug: String(error && (error.message || error)) }
            : {};

        res.status(500).json(Object.assign({
            reply: "Kitchen is busy, please try again.",
            system_action: { ui_navigation: "none" }
        }, debugInfo));
    }
});

// =========================
app.listen(PORT, () => {
    console.log(`DripTea running on http://localhost:${PORT}`);
});

// done by "HDC" - optional startup connection; routes still connect lazily if this is disabled.
if (env.mongodbAutoconnect || process.env.MONGODB_URI) {
    connectMongo().catch((error) => {
        console.warn("[HDC API] MongoDB startup connection failed:", error.message);
    });
}
// end done by "HDC"
