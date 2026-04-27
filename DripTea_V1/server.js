const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// =========================
// FRONTEND
// =========================
app.use(express.static(path.join(__dirname, "frontend")));

// =========================
// LOAD MENU
// =========================
const menuDataPath = path.join(__dirname, "data/menu.json");
const menuData = JSON.parse(fs.readFileSync(menuDataPath, "utf8"));

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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
    }
});

// =========================
// GROQ (TEXT BRAIN & MEMORY)
// =========================
let conversationHistory = []; 

async function callGroq(userMessage) {
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

    conversationHistory.push({ role: "user", content: userMessage });

    const systemPrompt = `
You are the DripTea Health Advisor. Your tone is warm, friendly, and human. 

MULTILINGUAL RULE (STRICT & CRITICAL):
You MUST detect the language of the user's LATEST message and reply in that EXACT SAME language. If English, reply in English. 

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
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                temperature: 0.1,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...conversationHistory.slice(-10), 
                    { 
                        role: "system", 
                        content: "CRITICAL OVERRIDE: Look at the user's latest message. You MUST reply in the exact same language they just used. If they spoke English, you must speak English. Also, NEVER invent stats. Read the Base Sugar exactly as it appears in the JSON." 
                    }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const textReply = response.data.choices[0].message.content;
        conversationHistory.push({ role: "assistant", content: textReply });

        return {
            reply: textReply,
            system_action: { ui_navigation: "none" }
        };

    } catch (err) {
        console.error("Groq Error:", err.message);
        return {
            reply: "I'm having a little trouble connecting to the kitchen. Give me a second!",
            system_action: { ui_navigation: "none" }
        };
    }
}

// =========================
// MAIN ROUTE
// =========================
app.post("/chat", async (req, res) => {
    try {
        const { message, image } = req.body;
        let jsonResponse;
        const safeMessage = typeof message === "string" ? message : "";

        console.log(
            `[CHAT] ${new Date().toISOString()} | message="${safeMessage.slice(0, 80)}" | hasImage=${Boolean(image)}`
        );

        if (image) {
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
            jsonResponse = await callGroq(message);
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
app.listen(3000, () => {
    console.log("DripTea running on http://localhost:3000");
});