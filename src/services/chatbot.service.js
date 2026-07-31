const {
    extractBeverageId,
} = require("../utils/chatIntent.util");

const aiClient = require("../ai/aiClient");
const ChatbotSession = require("../models/chatbotSession.model");

const { buildSystemPrompt, USE_MATCHED_LANGUAGE } = require("./prompt.service");
const CartItem = require("../models/cartItem.model");
const MenuItem = require("../models/menuItem.model");
const Payment = require("../models/payment.model");
const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");
const Feedback = require("../models/feedback.model");
const Voucher = require("../models/voucher.model");
const Store = require("../models/store.model");
const { deriveCurrentStatus } = require("../utils/orderProgress.util");

// Show outlet image in chatbot when customer ask about it
const STORE_OUTLET_IMAGES = {
    "DripTea Jurong East": "/img/Jem_Mall.jpg",
    "DripTea Orchard": "/img/313somerset.webp",
};

// Common functions for most features
// Resolves a menu item from free text: exact name match, substring match, then alias lookup.
async function findDrinkByName(message) {
    const msg = String(message || "").toLowerCase();

    const drinks = await MenuItem.find({
    status: "active",
    }).lean();

    // Primary: When customer type the exact drink names
    const primary = drinks.find((drink) =>
        msg.includes(String(drink.name || "").toLowerCase())
    );
    if (primary) return primary;

    // Secondary: drink name contains the search term
    const secondary = drinks.find((drink) =>
        String(drink.name || "").toLowerCase().includes(msg)
    );
    if (secondary) return secondary;

    // Fallback: resolve through the alias table, so a renamed drink still matches
    // the name it used to have ("Da Hong Bao Milk Tea" → "Da Hong Pao Milk Tea").
    const aliasName = resolveDrinkNameFromMessage(msg);
    if (aliasName) {
        return drinks.find((drink) =>
            String(drink.name || "").toLowerCase() === aliasName.toLowerCase()
        ) || null;
    }

    return null;
}

// #29 - As a customer, I want the chatbot to inform me when my chosen drink has a high sugar level so that I can reconsider my selection.
// #31 - As a customer, I want the chatbot to show me the nutritional grading of each beverage so that I can choose the suitable option.
// Reads baseSugarG and baseCalories from menu_items -> applies sugar/topping adjustments -> calculates Nutri-Grade
function calculateNutrition(drink, sugarLevel, toppings = []) {
    // Sugar level scales the drink's base sugar proportionally (0% = none, 100% = the full base
    // value)
    // "Normal Sweet" and any unrecognised/missing level default to the full base sugar (×1)
    const sugarMultiplier = {
        "0% Sugar": 0,
        "25% Sugar": 0.25,
        "50% Sugar": 0.5,
        "100% Sugar": 1,
        "Normal Sweet": 1,
    };

    const nutrition = drink.nutritionInfo || {};

    let sugar = Math.round(
        Number(nutrition.baseSugarG ?? drink.base_sugar_g ?? 0) *
        (sugarMultiplier[sugarLevel] ?? 1)
    );

    let calories =
        Number(nutrition.baseCalories ?? drink.base_calories ?? 0);

    if (toppings.includes("Tapioca Pearls") || toppings.includes("Pearls")) {
        sugar += 8;
        calories += 60;
    }

    if (toppings.includes("Brown Sugar")) {
        sugar += 12;
        calories += 70;
    }

    if (toppings.includes("Cheese Foam")) {
        sugar += 10;
        calories += 90;
    }

    // Nutri-Grade calculation based on sugar per 100ml
    const sugarPer100ml = (sugar / 500) * 100;

    let grade = "A";

    if (sugarPer100ml > 1) grade = "B";
    if (sugarPer100ml > 5) grade = "C";
    if (sugarPer100ml > 10) grade = "D";

    return {
        sugar,
        calories,
        sugarPer100ml: Number(sugarPer100ml.toFixed(2)),
        grade,
    };
}
// End of User Story #29

// #31 - As a customer, I want the chatbot to show me the nutritional grading of each beverage so that I can choose the suitable option.
// Detect queries that customers are asking about nutri grade.
function isNutriGradeQuestion(message) {
    const msg = String(message || "").toLowerCase();

    return (
        msg.includes("nutri grade") ||
        msg.includes("nutri-grade") ||
        msg.includes("nutrition grade")
    );
}
// End of User Story #31

// Detects a factual nutrition question about a specific drink — "how much sugar is in X",
// "how many calories in the matcha latte", "what's the sugar content of classic milk tea"
function isNutritionFactQuestion(message) {
    const msg = String(message || "").toLowerCase();

    // Ordering/customization phrasing ("I want X with less sugar") never contains these,
    // so this stays clear of the order flow.
    return (
        msg.includes("how much sugar") ||
        msg.includes("how many calories") ||
        msg.includes("how much calorie") ||
        msg.includes("how many calorie") ||
        msg.includes("sugar content") ||
        msg.includes("calorie content") ||
        msg.includes("how many kcal") ||
        msg.includes("how much kcal") ||
        (/\b(sugar|calorie|calories|kcal)\b/.test(msg) &&
            /\b(how much|how many|what is the|what's the|amount of|content|level of)\b/.test(msg))
    );
}

// Detects queries browsing drinks by a specific Nutri-Grade letter, e.g. "I want a B grade drink", "show me grade C drinks"
function isGradeFilterRequest(message) {
    const msg = String(message || "").toLowerCase();
    return /\b[abcd][\s-]?grade\b/.test(msg) || /\bgrade[\s-]?[abcd]\b/.test(msg);
}

// Pulls the requested grade letter (A-D) out of a grade-filter message.
function extractRequestedGrade(message) {
    const msg = String(message || "").toLowerCase();
    const match = msg.match(/\b([abcd])[\s-]?grade\b/) || msg.match(/\bgrade[\s-]?([abcd])\b/);
    return match ? match[1].toUpperCase() : null;
}

// Detects queries asking which drinks have low/high sugar or low/high calories.
function isHealthRankingQuery(message) {
    // Normalise hyphens to spaces so "low-sugar"/"high-calorie" match the same phrase checks as
    // "low sugar"/"high calorie" below — otherwise a hyphenated phrasing silently fails every
    // check here and falls through to the generic recommendation search instead.
    const msg = String(message || "").toLowerCase().replace(/-/g, " ");

    // "less sugar" / "less sweet" used as an order customization — not a health ranking query.
    // e.g. "Can I have matcha latte, less sugar" should go to the ordering path.
    const hasOrderIntent =
        msg.includes("can i have") || msg.includes("can i get") || msg.includes("can i order") ||
        msg.includes("i want") || msg.includes("i'd like") || msg.includes("i would like") ||
        msg.includes("i'll have") || msg.includes("i'll take") || msg.includes("give me") ||
        msg.includes("i like to have") || msg.includes("i like to order") ||
        msg.includes("i would like to have") || msg.includes("i'd like to have");

    // Also treat "add … to cart" as ordering, so "add a Jasmine Green Tea with less sugar to my
    // cart" reaches the add-to-cart handler instead of being read as a "lowest sugar" ranking query.
    const isAddingToCart = /\badd\b/.test(msg) && (msg.includes("cart") || msg.includes("basket"));
    if ((hasOrderIntent || isAddingToCart) && (msg.includes("less sugar") || msg.includes("less sweet") || msg.includes("no sugar"))) {
        return false;
    }

    const hasSugar = msg.includes("sugar");
    const hasCalorie = msg.includes("calorie") || msg.includes("calories") || msg.includes("cal");
    const hasHealthy = msg.includes("healthy") || msg.includes("healthier") || msg.includes("healthiest");

    // "which one" / "these" / "them" / "both" cover follow-up comparisons that refer back to
    // drinks already shown earlier in the conversation, without naming them again —
    // e.g. "Between these, which one has lesser sugar?" after the bot listed some drinks.
    const hasDrinkRef =
        msg.includes("which drink") || msg.includes("which beverage") || msg.includes("which one") ||
        msg.includes("drinks") || msg.includes("beverages") ||
        /\b(these|them|both|those|either)\b/.test(msg);
    return (
        (msg.includes("low sugar") || msg.includes("lower sugar") || msg.includes("least sugar") || msg.includes("lowest sugar") || msg.includes("less sugar") || msg.includes("lesser sugar")) ||
        (msg.includes("high sugar") || msg.includes("higher sugar") || msg.includes("most sugar") || msg.includes("highest sugar")) ||
        (msg.includes("low calorie") || msg.includes("lower calorie") || msg.includes("least calorie") || msg.includes("lowest calorie") || msg.includes("low cal") || msg.includes("lesser calorie")) ||
        (msg.includes("high calorie") || msg.includes("higher calorie") || msg.includes("most calorie") || msg.includes("highest calorie")) ||
        (msg.includes("healthiest") || msg.includes("healthier option") || msg.includes("healthier choice") || msg.includes("healthier drink")) ||
        (hasDrinkRef && (hasSugar || hasCalorie || hasHealthy))
    );
}

// Localised strings for buildHealthRankingReply — this path is fully rule-based (no Gemini call),
// so unlike the AI-generated replies elsewhere, it has to translate itself explicitly.
const HEALTH_RANKING_STRINGS = {
    noData: {
        en: "I don't have nutritional data for our drinks right now. Please ask our staff for details!",
        zh: "抱歉，目前没有饮品的营养数据，请咨询我们的店员了解详情！",
        ms: "Maaf, kami tiada data pemakanan untuk minuman kami sekarang. Sila tanya kakitangan kami untuk maklumat lanjut!",
        ta: "தற்போது எங்கள் பானங்களுக்கான ஊட்டச்சத்து தரவு இல்லை. விவரங்களுக்கு எங்கள் ஊழியர்களிடம் கேளுங்கள்!",
    },
    rankIntro: {
        en: (wantHigh, rankByCalorie) => `Here are our drinks with the ${wantHigh ? "highest" : "lowest"} base ${rankByCalorie ? "calories" : "sugar"}:`,
        zh: (wantHigh, rankByCalorie) => `以下是${rankByCalorie ? "卡路里" : "糖分"}${wantHigh ? "最高" : "最少"}的饮品：`,
        ms: (wantHigh, rankByCalorie) => `Berikut adalah minuman kami dengan ${rankByCalorie ? "kalori" : "gula"} asas ${wantHigh ? "tertinggi" : "terendah"}:`,
        ta: (wantHigh, rankByCalorie) => `எங்கள் பானங்களில் அடிப்படை ${rankByCalorie ? "கலோரி" : "சர்க்கரை"} ${wantHigh ? "அதிகமாக" : "குறைவாக"} உள்ளவை:`,
    },
    same: {
        en: (a, b, rankByCalorie, val, unit) => `${a} and ${b} both have about the same ${rankByCalorie ? "calories" : "sugar"} — ${val}${unit} each.`,
        zh: (a, b, rankByCalorie, val, unit) => `${a}和${b}的${rankByCalorie ? "卡路里" : "糖分"}差不多，都是${val}${unit}。`,
        ms: (a, b, rankByCalorie, val, unit) => `${a} dan ${b} mempunyai ${rankByCalorie ? "kalori" : "gula"} yang hampir sama — ${val}${unit} setiap satu.`,
        ta: (a, b, rankByCalorie, val, unit) => `${a} மற்றும் ${b} இரண்டிற்கும் ஏறக்குறைய ஒரே அளவு ${rankByCalorie ? "கலோரி" : "சர்க்கரை"} உள்ளது — ஒவ்வொன்றும் ${val}${unit}.`,
    },
    compare: {
        en: (winner, loser, wantHigh, rankByCalorie, winnerValue, loserValue, unit) =>
            `${winner} has ${wantHigh ? "more" : "less"} ${rankByCalorie ? "calories" : "sugar"} than ${loser} — ${winner} has ${winnerValue}${unit}, while ${loser} has ${loserValue}${unit}.`,
        zh: (winner, loser, wantHigh, rankByCalorie, winnerValue, loserValue, unit) =>
            `${winner}的${rankByCalorie ? "卡路里" : "糖分"}比${loser}${wantHigh ? "多" : "少"}——${winner}为${winnerValue}${unit}，${loser}为${loserValue}${unit}。`,
        ms: (winner, loser, wantHigh, rankByCalorie, winnerValue, loserValue, unit) =>
            `${winner} mempunyai ${rankByCalorie ? "kalori" : "gula"} yang ${wantHigh ? "lebih tinggi" : "lebih rendah"} daripada ${loser} — ${winner} ialah ${winnerValue}${unit}, manakala ${loser} ialah ${loserValue}${unit}.`,
        ta: (winner, loser, wantHigh, rankByCalorie, winnerValue, loserValue, unit) =>
            `${winner}க்கு ${loser}ஐ விட ${wantHigh ? "அதிக" : "குறைவான"} ${rankByCalorie ? "கலோரி" : "சர்க்கரை"} உள்ளது — ${winner}: ${winnerValue}${unit}, ${loser}: ${loserValue}${unit}.`,
    },
};

// Reuses the same negation vocabulary as MenuItem.recommendByMessage ("without milk", "no dairy",
// "non-dairy", "excluding pearls") so a ranking query can exclude drinks matching the negated
// attribute — e.g. "lowest sugar drink without milk" should rank only among non-milk drinks
// instead of the whole menu.
const HEALTH_RANKING_NEGATION_TRIGGERS = ["without", "no", "non", "excluding", "except"];
const HEALTH_RANKING_NEGATION_SYNONYMS = { fruity: "fruit", fruits: "fruit", creamy: "milk", milky: "milk", dairy: "milk", chocolatey: "chocolate", nutty: "taro" };

function extractNegatedAttributes(message) {
    const rawWords = String(message || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const negated = [];
    for (let i = 0; i < rawWords.length; i++) {
        if (HEALTH_RANKING_NEGATION_TRIGGERS.includes(rawWords[i]) && rawWords[i + 1]) {
            negated.push(HEALTH_RANKING_NEGATION_SYNONYMS[rawWords[i + 1]] || rawWords[i + 1]);
            i++; // consume the negated word too, so it isn't also treated as unrelated text
        }
    }
    return negated;
}

// True if any negated attribute word appears in the drink's name, category, description, tags,
// or ingredients — the same fields MenuItem.recommendByMessage checks for its own $nor exclusion.
function drinkMatchesNegatedAttribute(drink, negatedWords) {
    return negatedWords.some((word) => {
        const re = new RegExp(word, "i");
        return (
            re.test(drink.name || "") ||
            re.test(drink.category || "") ||
            re.test(drink.description || "") ||
            (Array.isArray(drink.tags) && drink.tags.some((t) => re.test(t))) ||
            (Array.isArray(drink.drinkInfo?.ingredients) && drink.drinkInfo.ingredients.some((ing) => re.test(ing)))
        );
    });
}

// Builds the reply + drink cards for a health-ranking query ("lowest sugar drink", "healthiest
// option", "A vs B — which has less sugar"). Extracted out of the inline handler branch so the
// same logic can be reused by the "recommend + navigate" compound-intent branch below without
// duplicating the sort/comparison logic. detectedLang localises this path's own reply text since
// it never goes through Gemini (no system-prompt language instruction applies here).
async function buildHealthRankingReply(intentMessage, recentHistory, detectedLang = 'en') {
    const tr = (key) => HEALTH_RANKING_STRINGS[key]?.[detectedLang] || HEALTH_RANKING_STRINGS[key].en;
    // Same hyphen normalisation as isHealthRankingQuery, so "low-sugar" is recognised consistently
    // between the detector and the reply builder.
    const msg = intentMessage.toLowerCase().replace(/-/g, " ");
    const wantHigh =
        msg.includes("high sugar") || msg.includes("higher sugar") || msg.includes("most sugar") || msg.includes("highest sugar") ||
        msg.includes("high calorie") || msg.includes("higher calorie") || msg.includes("most calorie") || msg.includes("highest calorie");
    const rankByCalorie =
        msg.includes("calorie") || msg.includes("calories") || msg.includes("cal");

    const allDrinks = await MenuItem.find({ status: "active" }).lean();

    let mentionedDrinks = findMentionedDrinks(intentMessage, allDrinks);

    if (mentionedDrinks.length < 2 && /\b(these|them|both|those|either)\b/.test(msg)) {
        const historyText = recentHistory
            .map((h) => String(h.content || "").replace(/<[^>]*>/g, " "))
            .join(" ");
        mentionedDrinks = findMentionedDrinks(historyText, allDrinks);
    }

    if (mentionedDrinks.length >= 2) {
        const [first, second] = mentionedDrinks;
        const unit = rankByCalorie ? "kcal" : "g";
        const getValue = (d) => Number((d.nutritionInfo || {})[rankByCalorie ? "baseCalories" : "baseSugarG"] ?? 0);
        const firstValue = getValue(first);
        const secondValue = getValue(second);

        let reply;
        if (firstValue === secondValue) {
            reply = tr("same")(first.name, second.name, rankByCalorie, firstValue, unit);
        } else {
            const winner = wantHigh === (firstValue > secondValue) ? first : second;
            const loser = winner === first ? second : first;
            const winnerValue = winner === first ? firstValue : secondValue;
            const loserValue = loser === first ? firstValue : secondValue;
            reply = tr("compare")(winner.name, loser.name, wantHigh, rankByCalorie, winnerValue, loserValue, unit);
        }

        return { reply, recommendedDrinks: formatDrinkCards(mentionedDrinks.slice(0, 2)) };
    }

    const withNutrition = allDrinks.filter((d) => {
        const n = d.nutritionInfo || {};
        return n.baseSugarG != null || n.baseCalories != null;
    });

    if (withNutrition.length === 0) {
        return {
            reply: tr("noData"),
            recommendedDrinks: [],
        };
    }

    // "…lowest sugar and without milk" / "…least calories, no dairy" — narrow the ranking pool to
    // drinks that don't match the negated attribute. Falls back to the unfiltered pool if nothing
    // survives the filter, rather than dead-ending on a strict but empty result.
    const negatedAttributes = extractNegatedAttributes(msg);
    const filteredPool = negatedAttributes.length
        ? withNutrition.filter((d) => !drinkMatchesNegatedAttribute(d, negatedAttributes))
        : withNutrition;
    const rankingPool = filteredPool.length > 0 ? filteredPool : withNutrition;

    const sorted = [...rankingPool].sort((a, b) => {
        const nA = a.nutritionInfo || {};
        const nB = b.nutritionInfo || {};
        const valA = rankByCalorie ? Number(nA.baseCalories ?? 9999) : Number(nA.baseSugarG ?? 9999);
        const valB = rankByCalorie ? Number(nB.baseCalories ?? 9999) : Number(nB.baseSugarG ?? 9999);
        return wantHigh ? valB - valA : valA - valB;
    });

    const top = sorted.slice(0, 5);
    const reply = tr("rankIntro")(wantHigh, rankByCalorie);

    return { reply, recommendedDrinks: formatDrinkCards(top) };
}

// Detects rating-ranking queries: "which beverage has the highest rating?", "best rated drink",
// "top rated drink", "most stars", etc. — requires both a rating word and a ranking word so it
function isHighestRatedRequest(message) {
    const msg = String(message || "").toLowerCase();

    const hasRatingWord = msg.includes("rating") || msg.includes("rated") || msg.includes("star");
    const hasRankWord = msg.includes("highest") || msg.includes("best") || msg.includes("top") || msg.includes("most");

    return hasRatingWord && hasRankWord;
}

// #25 - As a customer, I want to chat with the AI chatbot so that I can get help with ordering and menu questions
// (flu, sore throat, indigestion, fatigue, stress) so that I can pick something comforting.
const SYMPTOM_CATEGORIES = [
    {
        key: "cold_flu",
        keywords: [
            "flu", "cold", "sore throat", "cough", "coughing", "stuffy nose", "runny nose",
            "blocked nose", "fever", "under the weather", "feeling sick", "feel sick",
            "feeling unwell", "not feeling well", "phlegm",
        ],
        itemIds: ["b012", "b016", "b013", "b004"],
        intro: "Sorry to hear you're not feeling well! These soothing, vitamin C-rich picks might help you feel a little better:",
    },
    {
        key: "digestion",
        keywords: [
            "constipation", "constipated", "bloated", "bloating", "indigestion",
            "stomach ache", "stomachache", "upset stomach", "digestion", "digestive",
            "can't poop", "cant poop", "trouble pooping",
        ],
        itemIds: ["b003", "b005", "b002", "b015"],
        intro: "These teas are often enjoyed to help with digestion:",
    },
    {
        key: "fatigue",
        keywords: [
            "fatigue", "fatigued", "low energy", "sleepy", "exhausted",
            "no energy", "need energy", "need a boost", "feeling drained", "worn out",
            "so tired", "very tired", "really tired", "feeling tired",
        ],
        itemIds: ["b006", "b005", "b003", "b001"],
        intro: "Feeling low on energy? These caffeine-forward picks should help perk you up:",
    },
    {
        key: "stress",
        keywords: [
            "stressed", "stressed out", "feeling stressed", "anxious", "anxiety",
            "can't sleep", "cant sleep", "cannot sleep", "trouble sleeping", "insomnia",
            "need to relax", "feeling overwhelmed", "need to unwind", "overwhelmed",
        ],
        itemIds: ["b004", "b002", "b015"],
        intro: "Here are some lighter, calming picks to help you unwind:",
    },
];

const SYMPTOM_DISCLAIMER =
    "These are comfort picks, not medical advice — please see a doctor if your symptoms persist.";

const HEALTH_CONDITION_KEYWORDS = [
    "diabetic", "diabetes", "blood sugar", "insulin", "glucose",
    "high blood pressure", "hypertension", "blood pressure",
    "pregnant", "pregnancy", "breastfeeding", "nursing",
    "allergy", "allergic", "intolerance", "lactose intolerant",
    "heart condition", "kidney", "medication",
];
const SUGAR_SENSITIVE_KEYWORDS = ["diabetic", "diabetes", "blood sugar", "insulin", "glucose"];
const HEALTH_CONDITION_DISCLAIMER =
    "I'm not a medical professional, so this isn't medical advice — please check with your doctor or a healthcare provider about what's right for your condition.";

// Body parts/organs and health topics named in ingredient-safety questions that don't match a
// fixed HEALTH_CONDITION_KEYWORDS phrase, e.g. "is caffeine bad for my heart?".
const BODY_HEALTH_NOUNS = [
    "heart", "liver", "kidney", "kidneys", "stomach", "digestive system",
    "cholesterol", "nerves", "bones", "teeth", "skin", "brain",
];

function isMedicalSafetyQuestion(message) {
    const msg = String(message || "").toLowerCase();
    const hasSafetyPhrase = /\b(bad for|safe for|safe to (?:drink|have|take)|harmful (?:to|for)|good for|ok(?:ay)? for|dangerous for|risky for|affects? my|worsens? my|triggers? my)\b/.test(msg);
    if (!hasSafetyPhrase) return false;
    return BODY_HEALTH_NOUNS.some((n) => msg.includes(n)) || HEALTH_CONDITION_KEYWORDS.some((k) => msg.includes(k));
}

// True if the message names a health condition keyword or an ingredient-safety question.
function isHealthConditionRequest(message) {
    const msg = String(message || "").toLowerCase();
    return HEALTH_CONDITION_KEYWORDS.some((k) => msg.includes(k)) || isMedicalSafetyQuestion(msg);
}

// Matches the message against SYMPTOM_CATEGORIES keyword lists, returns the first hit.
function detectSymptomCategory(message) {
    const msg = String(message || "").toLowerCase();
    for (const category of SYMPTOM_CATEGORIES) {
        if (category.keywords.some((kw) => msg.includes(kw))) return category;
    }
    return null;
}

// True if the message mentions a recognised symptom (flu, fatigue, stress, etc.).
function isSymptomRequest(message) {
    return detectSymptomCategory(message) !== null;
}

const ORDER_CUSTOMIZATION_WORDS = [
    "regular", "large", "small",
    "no ice", "less ice", "normal ice", "more ice", "extra ice",
    "0%", "25%", "50%", "100%", "no sugar", "less sweet", "less sugar", "full sweet",
    "0 percent", "25 percent", "50 percent", "100 percent",
    "zero percent", "twenty five percent", "twenty-five percent", "fifty percent", "hundred percent",
    "brown sugar", "pearl", "boba", "cheese foam", "tapioca", "no topping",
];

// Parses sugar level from natural language — handles both numeric (50%) and spoken (fifty percent) forms.
// Uses \b word boundaries so "0%" never falsely matches inside "50%" or "100%".
function parseSugarLevel(text) {
    const m = String(text || "").toLowerCase();
    // Word forms first (spoken input like "fifty percent sugar")
    if (/\b(a\s+)?hundred\s+percent\b|\bone\s+hundred\s+percent\b|\bfull\s*(sweet|sugar)\b/.test(m)) return "100% Sugar";
    if (/\bfifty\s+percent\b|\bhalf\s+(sweet|sugar|percent)\b/.test(m)) return "50% Sugar";
    if (/\btwenty[- ]?five\s+percent\b|\bless\s+sweet\b|\bless\s+sugar\b/.test(m)) return "25% Sugar";
    if (/\bzero\s+percent\b|\bno\s+sugar\b|\bunsweetened\b/.test(m)) return "0% Sugar";
    if (/\b100\s*(?:%|percent\b)/.test(m)) return "100% Sugar";
    if (/\b70\s*%/.test(m)) return "70% Sugar";
    if (/\b50\s*(?:%|percent\b)/.test(m)) return "50% Sugar";
    if (/\b25\s*(?:%|percent\b)/.test(m)) return "25% Sugar";
    if (/\b0\s*(?:%|percent\b)/.test(m)) return "0% Sugar";
    return null;
}

const VALID_SUGAR_PERCENTS = new Set([0, 25, 50, 100]);

function findInvalidSugarPercent(message) {
    const msg = String(message || "").toLowerCase();
    // Scans every number+%/percent in the message, not just the first — a cart-edit message
    // like "why is it 50%? change to 33% please" names a valid level before the invalid one.
    for (const match of msg.matchAll(/\b(\d{1,3})\s*(?:%|percent\b)/g)) {
        const value = Number(match[1]);
        if (!VALID_SUGAR_PERCENTS.has(value)) return value;
    }
    return null;
}

// "change the sugar from 50 to 25" — restores the % sign customers drop.
function normalizeSugarPercents(message) {
    const msg = String(message || "");
    if (!/\b(sugar|sweet|sweetness)\b/i.test(msg)) return msg;
    return msg.replace(/\b(0|25|50|100)\b(?!\s*%)/g, "$1%");
}

// "50% Sugar" → "50%", for display on the health card.
function formatSugarLevel(sugar) {
    const level = String(sugar || "").trim().replace(/\s*sugar$/i, "");
    return /^\d+%$/.test(level) ? level : null;
}

// True if the message contains a size/ice/sugar/topping customization word.
function hasCustomizationWords(msg) {
    return ORDER_CUSTOMIZATION_WORDS.some((w) => msg.includes(w));
}

// True if the message is a direct order ("I want X", "add X", quantity + drink, etc.).
function hasExplicitOrderIntent(message) {
    const msg = String(message || "").toLowerCase();

    // Named drink + a concrete customization detail ("large", "less sugar", "no ice"...) is
    // always an explicit order, regardless of any preceding rambling/emotional context.
    if (hasCustomizationWords(msg)) return true;

    // "give me one X" / "one matcha latte" / "2 taro slush" — quantity-based direct order.
    if (/\bgive me\s+(one|two|three|four|five|\d+)\b/i.test(msg)) return true;
    if (/^(one|two|three|four|five|six|\d+)\s+\w/i.test(msg.trim())) return true;

    // Direct ordering verbs — "i want X", "i need X", "get me X", "give me X", "order me X", etc.
    if (/\b(i want|i need|i like to have|i would like|i'd like|i'll have|i'll take|can i have|can i get|can i order|give me|get me|order me)\s+(?:a\s+|an\s+)?\w/i.test(msg)) return true;

    // "add [drink]" / "add a X to my cart" — add-to-cart phrasing.
    if (/\badd\s+(?!one\s+more\b|another\b)/i.test(msg)) return true;

    // "order the/a/an X (for me)" — explicit order verb naming a specific item.
    if (/\border\s+(?:the|a|an)\s+\w/i.test(msg)) return true;

    return false;
}

// Detects Chinese/Tamil by script, Malay by keyword hits; defaults to English.
function detectMessageLanguage(message) {
    const msg = String(message || "");
    if (/[一-鿿]/.test(msg)) return "zh";
    if (/[஀-௿]/.test(msg)) return "ta";
    if (/\b(nak|satu|dua|mahu|boleh|saya|aku|dengan|yang|dan|tak|ada|tolong|bagi|beli|letak|tambah|kurang|tanpa|besar|biasa|ais|gula|saiz|dan|keju|mutiara)\b/i.test(msg)) return "ms";
    return "en";
}

// 
const gibberishStreak = new Map();
const HANDOFF_OFFER =
    "It looks like I'm having trouble understanding you. Would you like to speak to a real person? " +
    "You can reach our team at **yiyuanzhuan@driptea.com** or WhatsApp **+6123 4567**. " +
    "Otherwise, just tell me a flavour you like (fruity, milky, or matcha) and I'll suggest something!";

// True if a token is a repeated-letter run or has too few vowels to be a real word.
function tokenLooksGibberish(token) {
    const letters = token.replace(/[^a-z]/g, "");
    if (letters.length < 3) return false;
    if (/^(.{1,3})\1+$/.test(letters)) return true;
    const vowelCount = (letters.match(/[aeiou]/g) || []).length;
    return vowelCount / letters.length <= 0.2;
}

// True if every evaluable word in the message looks like gibberish.
function looksUnintelligible(message) {
    const msg = String(message || "").trim().toLowerCase();
    if (!msg) return false;
    if (/\d/.test(msg)) return false;
    if (/[一-鿿]/.test(msg)) return false; // Chinese
    if (/[஀-௿]/.test(msg)) return false; // Tamil

    const evaluableTokens = msg
        .split(/\s+/)
        .filter((t) => t.replace(/[^a-z]/g, "").length >= 3);

    if (evaluableTokens.length < 2) return false;

    return evaluableTokens.every(tokenLooksGibberish);
}

// Make sure they are in their ordering flow and continue it
function hasActiveOrderFlow(recentHistory) {
    for (let i = recentHistory.length - 1; i >= 0; i--) {
        const h = recentHistory[i];
        if (h.role !== "assistant") continue;
        const c = String(h.content || "").toLowerCase();
        return /what size|which size|ice level|sugar level|preferred ice|how would you like your ice|any toppings|would you like any toppings|regular \(s\$|large \(\+s\$/.test(c);
    }
    return false;
}

// Extracts size/ice/sugar/toppings from a message, defaulting anything unmentioned.
function parseCustomizationFromMessage(message) {
    const msg = String(message || "").toLowerCase();

    let size = "Regular";
    if (msg.includes("large")) size = "Large";
    else if (msg.includes("small")) size = "Small";

    let ice = "Normal Ice";
    if (msg.includes("no ice")) ice = "No Ice";
    else if (msg.includes("less ice")) ice = "Less Ice";
    else if (msg.includes("more ice") || msg.includes("extra ice")) ice = "More Ice";

    const sugar = parseSugarLevel(msg) || "Normal Sweet";

    const toppings = [];
    if (!msg.includes("no topping")) {
        if (msg.includes("brown sugar")) toppings.push("Brown Sugar");
        if (msg.includes("pearl") || msg.includes("boba") || msg.includes("tapioca")) toppings.push("Tapioca Pearls");
        if (msg.includes("cheese")) toppings.push("Cheese Foam");
    }

    return { size, ice, sugar, toppings };
}

// True if toppings were actually addressed (named, or explicitly "no toppings") — distinct from
// not mentioning them, which parseCustomizationFromMessage can't tell apart on its own.
function mentionsToppings(message) {
    const msg = String(message || "").toLowerCase();
    return (
        msg.includes("no topping") ||
        msg.includes("brown sugar") ||
        msg.includes("pearl") || msg.includes("boba") || msg.includes("tapioca") ||
        msg.includes("cheese")
    );
}

// Null when size isn't mentioned, unlike parseCustomizationFromMessage's "Regular" default.
function parseSizeMention(message) {
    const msg = String(message || "").toLowerCase();
    if (/\b(large|big)\b/.test(msg)) return "Large";
    if (/\b(regular|medium)\b/.test(msg)) return "Regular";
    return null;
}

// Same idea as parseSizeMention, for ice level.
function parseIceMention(message) {
    const msg = String(message || "").toLowerCase();
    if (/\bno\s*ice\b|\bwithout\s*ice\b/.test(msg)) return "No Ice";
    if (/\bless\s*ice\b|\blittle\s*ice\b/.test(msg)) return "Less Ice";
    if (/\bhot\b|\bwarm\b/.test(msg)) return "Hot";
    if (/\bnormal\s*ice\b|\bregular\s*ice\b/.test(msg)) return "Normal Ice";
    return null;
}
// End of health advice QNA

// #32 - As a customer, I want to get the recommendations from chatbot so that I can complete my order.
// Detects recommendation intent keywords -> queries menu_items -> injects results into AI prompt.
// All drink name associations — any of these words in a message signals a drink-related browse request
const DRINK_ASSOCIATION_WORDS = [
    "matcha", "jasmine", "oolong", "osmanthus", "da hong pao", "da hong bao",
    "milk tea", "milktea", "latte",
    "strawberry", "cranberry",
    "ice blended", "peach", "mango",
    "lemon", "lychee", "grapefruit", "watermelon",
    "fruit tea",
];

// Standalone, unambiguous "does this message ask for a recommendation" check — deliberately
// narrower than isRecommendationRequest below (no "give me"/"show me" catch-alls, which are too
// generic and would misfire on e.g. "show my vouchers"). Used only to detect compound requests
// like "recommend a fruity drink and show my vouchers", where isRecommendationRequest itself
// would return false (it defers to isVoucherRequest), so the recommendation half is never lost.
function mentionsRecommendationCue(message) {
    const msg = String(message || "").toLowerCase();

    if (
        msg.includes("recommend") ||
        msg.includes("suggest") ||
        msg.includes("surprise me") ||
        msg.includes("推荐") || msg.includes("建议") ||
        msg.includes("cadangan") || msg.includes("boleh rekomen")
    ) return true;

    return (
        /\b(something|anything|a drink that('?s| is)?)\b/.test(msg) &&
        /\b(fruity|fruit|refreshing|sweet|citrus(y)?|floral|creamy|milky|chocolate(y)?|nutty|tangy|sour|light|icy|cold)\b/.test(msg)
    );
}

// Main recommendation-intent detector: rules out other intents first, then checks
// recommendation keywords/phrasing.
function isRecommendationRequest(message) {
    const msg = String(message || "").toLowerCase();

    // Check if customer is ask for ongoing order first
    if (isTrackOrderRequest(msg)) return false;

    // Detect the requirement
    if (
        isVoucherRequest(msg) ||
        isStoreInfoRequest(msg) ||
        isTaxQuestion(msg) ||
        isDiscountNegotiation(msg) ||
        isPurchaseHistory(msg) ||
        isReorderPurchaseHistoryRequest(msg)
    ) return false;

    // Explicit recommendation keywords always win, even if order-intent phrases are present
    // e.g. "I would like to have matcha today, any recommendations?"
    if (
        msg.includes("any recommendations") ||
        msg.includes("any recommendation") ||
        msg.includes("what do you recommend") ||
        msg.includes("any suggestions") ||
        msg.includes("what would you suggest") ||
        // Chinese recommendation phrases
        msg.includes("推荐") || msg.includes("建议") ||
        msg.includes("什么好喝") || msg.includes("帮我选") ||
        // Malay recommendation phrases
        msg.includes("cadangan") || msg.includes("apa yang sedap") ||
        msg.includes("yang mana sedap") || msg.includes("nak cuba apa") ||
        msg.includes("ada apa yang") || msg.includes("boleh rekomen")
    ) return true;

    // Vague flavour/vibe descriptions are recommendations, not direct orders — even when phrased
    // with "I want" ("I want something fruity", "anything refreshing", "a drink that's sweet and
    // cold"). Anchored on "something/anything/a drink that" so it never catches a real named order
    // like "I want a refreshing Ice Lemon Tea". Must run before the "I want X" order guard below,
    // otherwise these fall through to the model, which then fabricates drink data.
    if (
        /\b(something|anything|a drink that('?s| is)?)\b/.test(msg) &&
        /\b(fruity|fruit|refreshing|sweet|citrus(y)?|floral|creamy|milky|chocolate(y)?|nutty|tangy|sour|light|icy|cold)\b/.test(msg)
    ) return true;

    // Specific order with customization details → not a recommendation
    if (hasCustomizationWords(msg)) return false;

    // "give me one X" / "give me 2 X" = quantity-based order, not a browse request
    if (/\bgive me\s+(one|two|three|four|five|\d+)\b/i.test(msg)) return false;

    // "one matcha latte" / "two taro slush" / "1 milo" = direct order with quantity
    if (/^(one|two|three|four|five|six|\d+)\s+\w/i.test(msg.trim())) return false;

    // "i want X" / "i need X" / "can i have X" / "i'd like X" / "give me X" = direct order intent (with or without article)
    if (/\b(i want|i need|i like to have|i would like|i'd like|i'll have|i'll take|can i have|can i get|can i order|give me)\s+(?:a\s+|an\s+)?\w/i.test(msg)) return false;

    // "show me my cart" / "show me what is inside my cart"
    if (/\bshow me\b/i.test(msg) && (msg.includes("cart") || msg.includes("in my order"))) return false;
    
    // "add [drink]" / "can add [drink]" / "want to add [drink]" / "can i add [drink]" = add-to-cart intent
    if (/\badd\s+(?!one\s+more\b|another\b)/i.test(msg)) return false;

    // "the second strawberry" / "the first matcha" / "third one" = cart item disambiguation reply
    if (/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b/i.test(msg)) return false;

    // "add one more X" / "add another X" / "increase X" = cart quantity edit, not a recommendation
    if (msg.includes("add one more") || msg.includes("add another")) return false;
    if (msg.includes("increase") || msg.includes("decrease") || msg.includes("reduce")) return false;
    if (msg.includes("remove") || msg.includes("delete")) return false;

    return (
        msg.includes("recommend") ||
        msg.includes("recommendation") ||
        msg.includes("suggest") ||
        msg.includes("what should i") ||
        msg.includes("what should i drink") ||
        msg.includes("what's good") ||
        msg.includes("whats good") ||
        msg.includes("help me choose") ||
        msg.includes("help me pick") ||
        msg.includes("not sure what") ||
        msg.includes("first time") ||
        msg.includes("surprise me") ||
        msg.includes("give me") ||
        msg.includes("show me") ||
        msg.includes("i'm in the mood") ||
        msg.includes("im in the mood") ||
        msg.includes("i feel like") ||
        msg.includes("looking for") ||
        msg.includes("craving") ||
        msg.includes("any good") ||
        msg.includes("any drinks") ||
        msg.includes("any recommendations") ||
        msg.includes("what do you have") ||
        // Make sure the prompt is not misleading
        (
            /^(maybe|perhaps|how about|what about|something)\b/i.test(msg) &&
            (
                DRINK_ASSOCIATION_WORDS.some((w) => msg.includes(w)) ||
                /\b(fruity|fruit|refreshing|sweet|citrus(y)?|floral|creamy|milky|chocolate(y)?|nutty|tangy|sour|light|icy|cold|tea|drink)\b/.test(msg)
            )
        )
    );
}

// Detects when the user wants to learn more about specific drinks (not just order or browse).
function isInfoRequest(message) {
    const msg = String(message || "").toLowerCase();
    return (
        msg.includes("tell me about") ||
        msg.includes("more about") ||
        msg.includes("know more") ||
        msg.includes("learn about") ||
        msg.includes("i want to know") ||
        msg.includes("i want to understand") ||
        msg.includes("what is") ||
        msg.includes("explain") ||
        msg.includes("describe") ||
        msg.includes("information about") ||
        msg.includes("more information") ||
        msg.includes("getting more") ||
        msg.includes("tell me more")
    );
}

const DRINK_TAGLINES = {
    b001: "Our signature premium black tea blended with rich milk",
    b002: "Light and refreshing jasmine green tea with subtle floral aroma",
    b003: "Smooth oolong tea with a roasted aroma blended with milk",
    b004: "Fragrant osmanthus-infused milk tea with a floral finish",
    b005: "Premium Da Hong Pao oolong tea with deep, complex flavor",
    b006: "Ceremonial grade Uji matcha layered with fresh milk",
    b007: "Fresh strawberry purée layered with premium matcha",
    b008: "Tangy cranberry paired with smooth matcha",
    b009: "Floral jasmine tea blended with rich matcha",
    b010: "Refreshing ice-blended green tea with sweet peach flavour",
    b011: "Tropical mango blended with green tea over ice",
    b012: "Refreshing black tea with lemon flavour, served chilled",
    b013: "Refreshing green tea with sweet peach flavour",
    b014: "Tropical mango tea with a sweet and refreshing fruit flavour",
    b015: "Light green tea with sweet lychee flavour",
    b016: "Citrus grapefruit green tea, refreshing and light",
    b017: "Rich watermelon flavour for a light and refreshing drink",
};

// Maps raw menu-item docs into the drink-card shape the frontend expects.
function formatDrinkCards(drinks) {
    return drinks.map((drink) => {
        const nutrition = drink.nutritionInfo || {};
        return {
            id: drink.itemId,
            name: drink.name,
            category: drink.category,
            price: drink.price,
            description: drink.description || DRINK_TAGLINES[drink.itemId] || "",
            image: drink.image || (/^b\d{3}$/.test(drink.itemId) ? `/img/bubble_teas/${drink.itemId}.jpg` : "/img/bubble_teas/b001.jpg"),
            tags: drink.tags || [],
            nutri_grade: nutrition.nutriGrade || null,
            base_sugar_g: nutrition.baseSugarG ?? null,
            base_calories: nutrition.baseCalories ?? null,
            rating: drink.rating ?? 0,
        };
    });
}

// Fetches active menu items by itemId, preserving the requested order 
async function getDrinksByItemIds(itemIds) {
    const drinks = await MenuItem.find({ itemId: { $in: itemIds }, status: "active" }).lean();
    const byId = new Map(drinks.map((d) => [d.itemId, d]));
    return itemIds.map((id) => byId.get(id)).filter(Boolean);
}
// End of User Story #32

// Light, targeted normalization for order/delivery-tracking intent matching only —
// NOT applied to the message shown to the user or sent to Gemini. Fixes the small
// set of contractions and single-letter-drop typos ("wheres", "oder", "staus")
// that were otherwise slipping past the keyword classifiers below and falling
// through to Gemini's general chat path with zero real order data (risking a
// fabricated/hallucinated reply instead of the live status card).
function normalizeForOrderIntent(msg) {
    return msg
        .replace(/\bwheres\b/g, "where is")
        .replace(/\bhows\b/g, "how is")
        .replace(/\bwhats\b/g, "what is")
        .replace(/\boder\b/g, "order")
        .replace(/\bordr\b/g, "order")
        .replace(/\bstaus\b/g, "status")
        .replace(/\bsatus\b/g, "status")
        .replace(/\bdeliverry\b/g, "delivery")
        .replace(/\bdelivry\b/g, "delivery");
}

// #198 - As a customer, I want to browse my purchase history through the chatbot so that I can review my previous orders conveniently.
// Detects history-related keywords -> calls Payment.getPurchaseHistory() -> joins orders and order_items.
function isPurchaseHistory(message) {
    const msg = normalizeForOrderIntent(String(message || "").toLowerCase());

    // Live-tracking phrasings are not history requests, even though they contain
    // "my order" / "what...order". Without this guard, natural phrasing like "what
    // is my order status", "where is my order", or "how's my order going" got
    // swallowed by the broad "my order" / "what...my...order" checks below and
    // answered with the purchase-history card instead of the live orderStatusCard.
    const isStatusPhrasing = /\border\s+status\b|\bstatus\s+of\s+(my\s+)?order\b|\bis\s+my\s+order\s+ready\b|\bwhere\s+is\s+my\s+(order|delivery)\b|\btrack\s+my\s+(order|delivery)\b|\bwhen\s+will\s+my\s+order\b|\bhas\s+my\s+order\b|\bcheck\s+my\s+order\b|\bwhat\s+happened\s+to\s+my\s+order\b|\bhow'?s\s+my\s+order\b|\bupdate\s+on\s+my\s+order\b/i.test(msg);

    return (
        msg.includes("purchase history") ||
        msg.includes("order history") ||
        // A receipt/invoice request is about an order already placed — without this it
        // fell through to the recommendation branch and came back as drink suggestions.
        /\b(receipt|invoice)\b/i.test(msg) ||
        msg.includes("latest order") ||
        msg.includes("last order") ||
        msg.includes("recent order") ||
        msg.includes("last purchase") ||
        msg.includes("latest purchase") ||
        msg.includes("recent purchase") ||
        msg.includes("my purchases") ||
        msg.includes("my purchase") ||
        msg.includes("my orders") ||
        (msg.includes("my order") && !isStatusPhrasing) ||
        msg.includes("past order") ||
        msg.includes("previous order") ||
        msg.includes("other order") ||
        (/what.*my.*order/i.test(msg) && !isStatusPhrasing) ||
        (/what.*i.*order/i.test(msg) && !isStatusPhrasing) ||
        /did.*i.*order/i.test(msg) ||
        /what.*i.*buy/i.test(msg) ||
        /what.*i.*bought/i.test(msg) ||
        /order.*\bon\b.*\d/i.test(msg) ||
        /order.*\bon\s+[a-z]+/i.test(msg) ||
        /order.*\bin\s+[a-z]+/i.test(msg) ||
        /order.*\bfrom\s+[a-z0-9]/i.test(msg) ||
        /bought.*\bon\b/i.test(msg) ||
        /bought.*\bin\b/i.test(msg) ||
        /purchased.*\bon\b/i.test(msg) ||
        /show.*order/i.test(msg) ||
        /yesterday|last week|last month|this month/i.test(msg) && /order|buy|bought|purchase/i.test(msg)
    );
}

// Get purchase history of certain date
// Parses a date reference like "14 June", "June 14", "14th of July" from a message.
// Returns { day, month } (month is 0-indexed) or null if no date found.
function extractDateFromMessage(message) {
    const msg = String(message || "").toLowerCase();
    const now = new Date();

    const monthNames = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11,
    };

    // Relative: "yesterday"
    if (msg.includes("yesterday")) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
    }

    // Relative: "last week" → return the week range (use startOf/endOf)
    if (msg.includes("last week")) {
        const startOfLastWeek = new Date(now);
        startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
        startOfLastWeek.setHours(0, 0, 0, 0);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        endOfLastWeek.setHours(23, 59, 59, 999);
        return { rangeStart: startOfLastWeek, rangeEnd: endOfLastWeek, label: "last week" };
    }

    // Relative: "this month" / "last month"
    if (msg.includes("this month")) {
        return { monthOnly: true, month: now.getMonth(), year: now.getFullYear(), label: "this month" };
    }
    if (msg.includes("last month")) {
        const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return { monthOnly: true, month: m, year: y, label: "last month" };
    }

    // Numeric: "15/6", "15/06", "6/15" (day/month or month/day — try both, prefer day <= 12 for month)
    const numeric = msg.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (numeric) {
        let a = parseInt(numeric[1]);
        let b = parseInt(numeric[2]);
        const year = numeric[3] ? (numeric[3].length === 2 ? 2000 + parseInt(numeric[3]) : parseInt(numeric[3])) : null;
        // Treat as day/month (common in SG)
        if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
            return { day: a, month: b - 1, ...(year ? { year } : {}) };
        }
        // Fallback: month/day
        if (b >= 1 && b <= 31 && a >= 1 && a <= 12) {
            return { day: b, month: a - 1, ...(year ? { year } : {}) };
        }
    }

    // "14 june", "14th june", "14th of june"
    const dayFirst = msg.match(/(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([a-z]+)(?:\s+(\d{4}))?/);
    if (dayFirst) {
        const day = parseInt(dayFirst[1]);
        const monthStr = dayFirst[2];
        const year = dayFirst[3] ? parseInt(dayFirst[3]) : null;
        if (monthNames[monthStr] !== undefined && day >= 1 && day <= 31) {
            return { day, month: monthNames[monthStr], ...(year ? { year } : {}) };
        }
    }

    // "june 14", "june 14th", "june 2024"
    const monthFirst = msg.match(/\b([a-z]+)\s+(\d{1,4})(?:st|nd|rd|th)?\b/);
    if (monthFirst) {
        const monthStr = monthFirst[1];
        const num = parseInt(monthFirst[2]);
        if (monthNames[monthStr] !== undefined) {
            if (num >= 1 && num <= 31) {
                return { day: num, month: monthNames[monthStr] };
            }
            if (num >= 2000 && num <= 2099) {
                return { monthOnly: true, month: monthNames[monthStr], year: num, label: `${monthStr} ${num}` };
            }
        }
    }

    // Month name only: "in june", "from june", "june orders"
    for (const [name, idx] of Object.entries(monthNames)) {
        if (msg.includes(name)) {
            return { monthOnly: true, month: idx, label: name };
        }
    }

    return null;
}

// True if the message asks to re-add past-purchase items to the cart.
function isReorderPurchaseHistoryRequest(message) {
    const msg = String(message || "").toLowerCase();

    const hasReorderIntent =
        msg.includes("reorder") ||
        msg.includes("order again") ||
        msg.includes("buy again") ||
        msg.includes("add previous order") ||
        msg.includes("add past order") ||
        msg.includes("add my order") ||
        msg.includes("add purchased items") ||
        msg.includes("add what i bought") ||
        msg.includes("add items from purchase history") ||
        msg.includes("add items from order history");

    const hasHistoryRef =
        msg.includes("purchase history") ||
        msg.includes("order history") ||
        msg.includes("previous order") ||
        msg.includes("past order") ||
        msg.includes("purchased") ||
        msg.includes("bought") ||
        msg.includes("order");

    const hasCartRef =
        msg.includes("cart") ||
        msg.includes("basket");

    return hasReorderIntent || (hasHistoryRef && hasCartRef && msg.includes("add"));
}

// Filters orders by a parsed date query (range, month-only, or exact day/month/year).
function findOrdersByDateQuery(allOrders, dateQuery) {
    if (!dateQuery) {
        return [allOrders[0]].filter(Boolean);
    }

    const currentYear = new Date().getFullYear();

    if (dateQuery.rangeStart && dateQuery.rangeEnd) {
        return allOrders.filter((order) => {
            const d = new Date(order.createdAt || order.orderDate);
            return d >= dateQuery.rangeStart && d <= dateQuery.rangeEnd;
        });
    }

    if (dateQuery.monthOnly) {
        const targetYear = dateQuery.year || null;

        return allOrders.filter((order) => {
            const d = new Date(order.createdAt || order.orderDate);
            const monthMatch = d.getMonth() === dateQuery.month;
            return targetYear
                ? monthMatch && d.getFullYear() === targetYear
                : monthMatch;
        });
    }

    if (dateQuery.day != null && dateQuery.month != null) {
        if (dateQuery.year) {
            return allOrders.filter((order) => {
                const d = new Date(order.createdAt || order.orderDate);
                return (
                    d.getDate() === dateQuery.day &&
                    d.getMonth() === dateQuery.month &&
                    d.getFullYear() === dateQuery.year
                );
            });
        }

        for (const year of [currentYear, currentYear - 1]) {
            const matched = allOrders.filter((order) => {
                const d = new Date(order.createdAt || order.orderDate);
                return (
                    d.getDate() === dateQuery.day &&
                    d.getMonth() === dateQuery.month &&
                    d.getFullYear() === year
                );
            });

            if (matched.length > 0) return matched;
        }
    }

    return [];
}
// End of #198


// #203 - As a customer, I want to track my order status through the chatbot.
// #304 - As a customer, I want to view my delivery and order status via the chatbot so that I can get quick, automated updates.
const ORDER_NUMBER_RE = /(?:\border\b\s*(?:number|no\.?|#)?\s*|#\s*)(\d{3,6})\b/i;

// True if the message asks about the status/whereabouts of a live order or delivery.
function isTrackOrderRequest(message) {
    const msg = normalizeForOrderIntent(String(message || "").toLowerCase());

    // Make sure customer is not asking other questions
    if (isTaxQuestion(msg) || isDiscountNegotiation(msg) || isVoucherRequest(msg)) return false;

    return (
        msg.includes("track my order") ||
        msg.includes("where is my order") ||
        msg.includes("order status") ||
        msg.includes("status of my order") ||
        msg.includes("is my order ready") ||
        msg.includes("has my order") ||
        msg.includes("when will my order") ||
        msg.includes("my order") ||
        msg.includes("check my order") ||
        msg.includes("what happened to my order") ||
        msg.includes("other order") ||
        msg.includes("any other order") ||
        msg.includes("all my orders") ||
        msg.includes("other orders") ||
        msg.includes("how many orders") ||
        msg.includes("do i have any orders") ||
        // Delivery-specific phrasing — customers often say "delivery" instead of "order".
        msg.includes("where is my delivery") ||
        msg.includes("track my delivery") ||
        msg.includes("delivery status") ||
        msg.includes("status of my delivery") ||
        msg.includes("when will my delivery") ||
        msg.includes("has my delivery") ||
        msg.includes("is my delivery on the way") ||
        msg.includes("check my delivery") ||
        // Colloquial phrasing — customers often say "drink" instead of "order"/"delivery".
        msg.includes("where is my drink") ||
        msg.includes("track my drink") ||
        msg.includes("is my drink ready") ||
        msg.includes("has my drink") ||
        msg.includes("when will my drink") ||
        /\bdrink\b.*\bready\b/i.test(msg) ||
        /\bdrink\b.*\bstatus\b/i.test(msg) ||
        /\bdrink\b.*\bdeliver/i.test(msg) ||
        /\border\b.*\bready\b/i.test(msg) ||
        /\border\b.*\bstatus\b/i.test(msg) ||
        /\bdelivery\b.*\bstatus\b/i.test(msg) ||
        /\bdelivery\b.*\barriv/i.test(msg) ||

        ORDER_NUMBER_RE.test(msg)
    );
}

// #203 - Track Order Status via Chatbot
// Pulls a 3-6 digit order number out of the message, zero-padded to 4 digits.
function extractOrderNoFromMessage(message) {
    const match = String(message || "").match(ORDER_NUMBER_RE);
    return match ? match[1].padStart(4, "0") : null;
}

// Loads the requested order (or the 3 most recent) with its line items attached.
async function getOrderStatus(userId, orderId) {
    const orders = orderId
        ? await Order.find({ userId, orderNo: orderId }).lean()
        : await Order.find({ userId }, null, { sort: { createdAt: -1 }, limit: 3 }).lean();

    return Promise.all(orders.map(async (order) => {
        // The tracking page advances status client-side on a timer, which only
        // runs while that page is open. A customer who checks the chatbot
        // instead would otherwise see a stuck "pending" order forever, even
        // though the drink has actually finished preparing — so derive (and
        // persist) the up-to-date status here too, from the same timers.
        const liveStatus = deriveCurrentStatus(order);
        if (liveStatus !== order.status) {
            await Order.updateOne({ _id: order._id }, { $set: { status: liveStatus } });
            order = { ...order, status: liveStatus };
        }

        const items = await OrderItem.find({ orderId: order._id }).lean();
        return { ...order, items };
    }));
}
// End of User Story #203

// #202 Customers check available vouchers
function isVoucherRequest(message) {
    const msg = String(message || "").toLowerCase();
    return (
        msg.includes("voucher") ||
        msg.includes("vouchers") ||
        msg.includes("promo code") ||
        msg.includes("promo codes") ||
        msg.includes("discount code") ||
        msg.includes("coupon") ||
        msg.includes("any discount") ||
        msg.includes("any deals") ||
        msg.includes("any promotion") ||
        msg.includes("promo") ||
        msg.includes("promotion")
    );
}

// "speak to a real person" — the customer wants out of the bot, not another answer.
function isHumanAgentRequest(message) {
    const msg = String(message || "").toLowerCase();
    return /\b(real|human|actual|live)\s+(person|agent|human|staff|someone)\b/.test(msg) ||
        /\b(speak|talk|chat)\s+(to|with)\s+(a\s+|an\s+)?(real|human|live)?\s*(person|human|agent|staff|someone|manager)\b/.test(msg) ||
        /\b(customer service|customer support|human support|live agent)\b/.test(msg);
}

// Cancelling an order that has already been placed. The cart-clearing phrases
// ("cancel my order" with items still in the cart) are handled by isClearCartRequest.
function isOrderCancellationRequest(message) {
    const msg = String(message || "").toLowerCase();
    return /\b(cancel|refund)\b/.test(msg) &&
        /\b(order|purchase|delivery|pickup)\b/.test(msg) &&
        !/\bcart\b/.test(msg);
}

// Delivery coverage/fee/time and accepted payment methods.
function isDeliveryOrPaymentQuestion(message) {
    const msg = String(message || "").toLowerCase();

    // "where is my delivery", "check my delivery status" etc. are asking to track a
    // specific order, not asking general delivery-service FAQ info (coverage areas,
    // fees, how long delivery normally takes) — this check runs before
    // isTrackOrderRequest, and without this guard "delivery" + "where"/"can you"
    // alone was enough to win, so personal tracking questions never reached it.
    const isPersonalOrderTracking =
        /\bmy\s+(order|delivery|drink)\b[^.!?]*\b(status|ready|track)\b/i.test(msg) ||
        /\b(status|ready|track)\b[^.!?]*\bmy\s+(order|delivery|drink)\b/i.test(msg) ||
        /\bwhere\s+is\s+my\s+(order|delivery|drink)\b/i.test(msg) ||
        /\bcheck\s+my\s+(order|delivery)\s+status\b/i.test(msg);
    if (isPersonalOrderTracking) return false;

    const asksDelivery = /\b(deliver|delivery|delivered|send it|ship)\b/.test(msg) &&
        /\b(to|area|areas|where|fee|cost|charge|how long|time|available|do you|can you)\b/.test(msg);
    const asksPayment = /\b(payment|pay|paying|card|credit card|debit|paynow|cash|wallet)\b/.test(msg) &&
        /\b(method|methods|options|accept|accepted|take|use|can i|do you|how)\b/.test(msg);
    return asksDelivery || asksPayment;
}

// Detects a request to negotiate a custom discount
function isDiscountNegotiation(message) {
    const msg = String(message || "").toLowerCase();
    return /\b(discount|cheaper|% off|percent off|lower the price|reduce the price|make it cheaper|price down|give me a deal)\b/.test(msg);
}

// Detects tax / GST / service-charge questions
function isTaxQuestion(message) {
    const msg = String(message || "").toLowerCase();
    return /\b(gst|tax|taxes|service charge|inclusive of tax|tax included|tax inclusive)\b/.test(msg);
}

// Narrows the live store list down to whichever specific outlet(s) the customer named
function filterStoresByMention(stores, message) {
    const msg = String(message || "").toLowerCase();
    const matched = stores.filter((s) => {
        const suffix = s.name.toLowerCase().replace(/\bdriptea\b/g, "").trim();
        return suffix && msg.includes(suffix);
    });
    return matched.length > 0 ? matched : stores;
}

// Store location/hours — matches questions about outlets, addresses, or opening times.
// isNavigationRequest (checked earlier) already claims "where is the store page" style phrasing,
// so it's safe here to match on any store/outlet word paired with an info-seeking word.
const STORE_WORD_RE = /\b(store|stores|outlet|outlets|orchard|jurong east)\b/;
const STORE_INFO_WORD_RE = /\b(available|list|where|which|what|any|all|how many|nearest|hours|location|locations|address|open|close|opens|closes|opening|info|details)\b/;

// True if the message asks about an outlet's hours, address, or location.
function isStoreInfoRequest(message) {
    const msg = String(message || "").toLowerCase();
    if (
        msg.includes("what time do you open") ||
        msg.includes("what time do you close") ||
        msg.includes("when do you open") ||
        msg.includes("when do you close") ||
        msg.includes("what time you open") ||
        msg.includes("what time you close")
    ) return true;

    return STORE_WORD_RE.test(msg) && STORE_INFO_WORD_RE.test(msg);
}

// Queries Voucher collection for vouchers the customer can still redeem
async function getAvailableVouchers(userId) {
    const now = new Date();

    const activeVouchers = await Voucher.find({
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
    }).sort({ createdAt: 1 }).lean();

    const usedOrders = await Order.find({ userId, voucherCode: { $ne: null } })
        .select("voucherCode")
        .lean();
    const usedCodes = new Set(usedOrders.map((order) => order.voucherCode));

    return activeVouchers.filter((voucher) => !usedCodes.has(voucher.code));
}
// End of User Story #202


// #199 - As a customer, I want to add beverages into my cart through the chatbot so that I can prepare my order conveniently.
// Detects order/add-to-cart intent → resolves drink by name → calls CartItem.addToCart() → writes to cart_items.
function isAddToCartRequest(message) {
    const msg = String(message || "").toLowerCase();

    // "add one more X" / "add another X" = quantity increase on existing cart item
    if (msg.includes("add one more") || msg.includes("add another")) return false;

    if (
        /add.*cart/.test(msg) ||
        /put.*cart/.test(msg) ||
        /order.*this/.test(msg) ||
        /add\s+[a-z]\d{3}/i.test(msg) ||
        msg.includes("add one") ||
        msg.includes("help me to add") ||
        msg.includes("help me add")
    ) return true;

    // "i want / i need / i'd like / give me / can i get / i'll have / i like to have" + customization words → specific order
    const hasOrderIntent = (
        msg.includes("i want") ||
        msg.includes("i need") ||
        msg.includes("i'd like") ||
        msg.includes("i would like") ||
        msg.includes("i like to have") ||
        msg.includes("i like to order") ||
        msg.includes("i would like to have") ||
        msg.includes("i'd like to have") ||
        msg.includes("give me") ||
        msg.includes("can i get") ||
        msg.includes("can i have") ||
        msg.includes("can i order") ||
        msg.includes("i'll have") ||
        msg.includes("i'll take") ||
        msg.includes("order a") ||
        msg.includes("order the")
    );

    return hasOrderIntent && hasCustomizationWords(msg);
}

// #201 - Converts ordinal words ("first"/"1st" … "tenth"/"10th") to a 0-based cart index
// so "change third drink" reliably targets cartItems[2] instead of defaulting to the first item.
function extractOrdinalIndex(message) {
    const msg = String(message || "").toLowerCase();
    const ordinals = [
        ["first", "1st", "one of"],
        ["second", "2nd"],
        ["third", "3rd"],
        ["fourth", "4th"],
        ["fifth", "5th"],
        ["sixth", "6th"],
        ["seventh", "7th"],
        ["eighth", "8th"],
        ["ninth", "9th"],
        ["tenth", "10th"],
    ];
    for (let i = 0; i < ordinals.length; i++) {
        if (ordinals[i].some(w => new RegExp(`\\b${w}\\b`, "i").test(msg))) {
            return i; // 0-based cart index
        }
    }
    return -1;
}

// Find matched drinks
const DRINK_NAME_ALIAS_PAIRS = [
    [["da hong bao", "da hong pao"], "Da Hong Pao Milk Tea"],
    [["osmanthus"], "Osmanthus Milk Tea"],
    [["oolong"], "Oolong Milk Tea"],
    [["jasmine matcha"], "Jasmine Matcha Tea"],
    [["strawberry matcha"], "Strawberry Matcha Tea"],
    [["cranberry matcha"], "Cranberry Matcha Tea"],
    [["matcha latte"], "Matcha Latte"],
    [["classic milk tea"], "Classic Milk Tea"],
    [["peach green tea ice blended"], "Peach Green Tea Ice Blended"],
    [["mango green tea ice blended"], "Mango Green Tea Ice Blended"],
    [["ice lemon tea", "lemon tea"], "Ice Lemon Tea"],
    [["peach green tea"], "Peach Green Tea"],
    [["mango fruit tea"], "Mango Fruit Tea"],
    [["lychee green tea", "lychee green"], "Lychee Green Tea"],
    [["grapefruit green tea"], "Grapefruit Green Tea"],
    [["watermelon fruit tea"], "Watermelon Fruit Tea"],
    [["jasmine green"], "Jasmine Green Tea"],
    [["matcha"], "Matcha Latte"],
    [["strawberry"], "Strawberry Matcha Tea"],
    [["cranberry"], "Cranberry Matcha Tea"],
    [["jasmine"], "Jasmine Green Tea"],
    [["milk tea"], "Classic Milk Tea"],
    [["watermelon"], "Watermelon Fruit Tea"],
    [["grapefruit"], "Grapefruit Green Tea"],
    [["lychee"], "Lychee Green Tea"],
    [["lemon"], "Ice Lemon Tea"],
    [["mango"], "Mango Fruit Tea"],
    [["peach"], "Peach Green Tea"],
    [["ice blended"], "Peach Green Tea Ice Blended"],
];

// Maps a keyword/alias in the message to its canonical menu drink name.
function resolveDrinkNameFromMessage(message) {
    const msg = String(message || "").toLowerCase();
    for (const [keywords, name] of DRINK_NAME_ALIAS_PAIRS) {
        if (keywords.some((kw) => msg.includes(kw))) return name;
    }
    return null;
}

// For beverage comparisons
function findMentionedDrinks(message, drinks) {
    const msg = String(message || "").toLowerCase();
    const matches = [];
    const matchedIds = new Set();

    for (const drink of drinks) {
        const name = String(drink.name || "").toLowerCase();
        if (name && msg.includes(name)) {
            matches.push({ drink, index: msg.indexOf(name) });
            matchedIds.add(String(drink._id));
        }
    }

    if (matches.length < 2) {
        for (const [keywords, canonicalName] of DRINK_NAME_ALIAS_PAIRS) {
            const keyword = keywords.find((kw) => msg.includes(kw));
            if (!keyword) continue;
            const drink = drinks.find((d) => String(d.name || "").toLowerCase() === canonicalName.toLowerCase());
            if (drink && !matchedIds.has(String(drink._id))) {
                matches.push({ drink, index: msg.indexOf(keyword) });
                matchedIds.add(String(drink._id));
            }
        }
    }

    return matches.sort((a, b) => a.index - b.index).map((m) => m.drink);
}

// Resolves a menu itemId from a message via direct extraction, name lookup, then alias/keyword search.
async function resolveBeverageId(message) {
    let beverageId = extractBeverageId(message);

    if (!beverageId) {
        const drink = await findDrinkByName(message);
        if (drink) beverageId = drink.itemId;
    }

    if (!beverageId) {
        const resolvedName = resolveDrinkNameFromMessage(message);
        if (resolvedName) {
            const drink = await findDrinkByName(resolvedName);
            if (drink) beverageId = drink.itemId;

            // Fallback A: full resolved-name regex search (e.g. /Milo Dinosaur/i)
            if (!beverageId) {
                const results = await MenuItem.searchBeverage(resolvedName);
                if (results.length > 0) beverageId = results[0].itemId;
            }

            // Fallback B: individual keyword search — handles DB names that differ from
            // the hardcoded alias (e.g. DB name "Milo" would be missed by "Milo Dinosaur" regex
            // but caught by searching "milo" alone).
            if (!beverageId) {
                for (const keyword of resolvedName.split(/\s+/)) {
                    if (keyword.length < 3) continue;
                    const results = await MenuItem.searchBeverage(keyword);
                    if (results.length > 0) {
                        beverageId = results[0].itemId;
                        break;
                    }
                }
            }
        }
    }

    return beverageId;
}

// Detects when the customer named a drink generically enough to match MULTIPLE real menu items
const GENERIC_DRINK_PHRASES = [
    "green tea ice blended", "green tea", "milk tea", "fruit tea", "matcha tea", "ice blended",
];

// Returns the matching drink names if a generic phrase ("green tea") matches 2+ real items.
async function findAmbiguousMenuMatches(message) {
    const msg = String(message || "").toLowerCase();

    for (const phrase of GENERIC_DRINK_PHRASES) {
        if (!msg.includes(phrase)) continue;

        const allDrinks = await MenuItem.find({ status: "active" }).lean();
        const matches = allDrinks.filter((d) => String(d.name || "").toLowerCase().includes(phrase));

        // 2+ real matches for this phrase = genuinely ambiguous, ask which one.
        // 0 or 1 match means the normal resolution path already handles it (or correctly fails).
        return matches.length >= 2 ? matches.map((d) => d.name) : null;
    }

    return null;
}

// Finds the most recently referenced drink name by scanning assistant messages backwards.
function resolveLastDrinkFromHistory(history) {
    if (!Array.isArray(history)) return null;

    // Pass 1: structured data in assistant messages (most authoritative — added by the backend itself)
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role !== "assistant") continue;
        const content = String(msg.content || "");
        const cartMatch = content.match(/<div class=['"]hidden-cart-data['"][^>]*>([\s\S]*?)<\/div>/i);
        if (cartMatch) {
            const name = cartMatch[1].split("|")[0].trim();
            if (name) return name;
        }
        const summaryMatch = content.match(/Here is your order summary:(?:<br>)?\s*([^<\n\-]+?)\s*-\s*S\$/i);
        if (summaryMatch) {
            const name = summaryMatch[1].trim();
            if (name) return name;
        }
    }

    // Pass 2: most recent assistant message that mentions a drink name.
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role !== "assistant") continue;
        const name = resolveDrinkNameFromMessage(String(msg.content || ""));
        if (name) return name;
    }

    // Pass 3: last resort — scan user messages (may surface stale drink names from old turns)
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role !== "user") continue;
        const name = resolveDrinkNameFromMessage(msg.content);
        if (name) return name;
    }

    return null;
}

// Finds the most recently mentioned sugar level by scanning history backwards.
function resolveLastSugarFromHistory(history) {
    if (!Array.isArray(history)) return null;
    for (let i = history.length - 1; i >= 0; i--) {
        const val = parseSugarLevel(history[i].content);
        if (val) return val;
    }
    return null;
}

// Parse the order details from Gemini's Phase 6 reply text when it outputs a
// summary ("Berikut adalah ringkasan pesanan anda: …") but no hidden-cart-data.
function extractPhase6OrderFromReply(reply) {
    const text = String(reply || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');

    const PHASE6 = [
        /berikut adalah ringkasan pesanan/i,
        /ringkasan pesanan anda/i,
        /here is your order summary/i,
        /order summary/i,
        /pesanan anda:/i,
        /以下是您的订单摘要/i,
        /您的订单摘要/i,
    ];
    if (!PHASE6.some(p => p.test(text))) return null;

    const drinkMatch = text.match(/([A-Z][A-Za-z ]{2,40})\s*[-–—]\s*S\$\s*([\d.]+)/);
    if (!drinkMatch) return null;

    const drinkName = drinkMatch[1].trim();

    // Customization line: contains · separator AND a size or ice keyword in any language
    const lines = text.split(/[\n\r]/).map(l => l.trim()).filter(Boolean);
    let customStr = null;
    for (const line of lines) {
        if (
            /[·•]/.test(line) &&
            /(large|regular|besar|biasa|大杯|中杯|less ice|no ice|normal ice|kurang ais|tanpa ais|ais normal|少冰|去冰|正常冰|hot|panas|热饮)/i.test(line)
        ) {
            customStr = line;
            break;
        }
    }

    return { drinkName, customStr };
}

// Extract size/ice/sugar from the most recent Phase 5 assistant message
// (Phase 5 always lists topping options, so that's our anchor).
function resolveCustomizationFromHistory(history) {
    if (!Array.isArray(history)) return null;
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role !== 'assistant') continue;
        const content = String(msg.content || '');
        if (!/tapioca|brown sugar|cheese foam|mutiara|busa keju|gula perang|珍珠|黑糖|芝士泡沫|tanpa topping|no topping/i.test(content)) continue;

        let size = 'Regular';
        if (/\b(large|besar|大杯)\b/i.test(content)) size = 'Large';

        let ice = 'Normal Ice';
        if (/\b(no ice|tanpa ais|去冰)\b/i.test(content))       ice = 'No Ice';
        else if (/\b(less ice|kurang ais|少冰)\b/i.test(content)) ice = 'Less Ice';
        else if (/\b(hot|panas|热饮)\b/i.test(content))          ice = 'Hot';

        let sugar = 'Normal Sweet';
        const pctMatch = content.match(/\b(0|25|50|100)\s*%/i);
        if (pctMatch) sugar = `${pctMatch[1]}% Sugar`;

        // Detect lang from the Phase 5 content so the Cart page can translate labels
        const hasMs = /besar|biasa|kurang ais|tanpa ais|ais normal|panas|mutiara|busa keju|gula perang|tanpa topping/i.test(content);
        const hasZh = /大杯|中杯|少冰|去冰|正常冰|热饮|珍珠|黑糖|芝士泡沫|不加配料/.test(content);
        const hasTa = /[஀-௿]/.test(content);
        const lang = hasMs ? 'ms' : hasZh ? 'zh' : hasTa ? 'ta' : 'en';

        return { size, ice, sugar, lang };
    }
    return null;
}

// Maps a raw topping string (any supported language) to its canonical topping name.
function normalizeToppingName(raw) {
    const t = String(raw || '').toLowerCase().trim().replace(/\s*\(\+s\$[\d.]+\)/i, '');
    if (/pearl|mutiara|珍珠|tapioca|boba/.test(t)) return 'Tapioca Pearls';
    if (/brown sugar|gula perang|黑糖/.test(t))    return 'Brown Sugar';
    if (/cheese|busa keju|芝士/.test(t))           return 'Cheese Foam';
    return null; // no toppings
}

// Adds a topping to the last-ordered drink, reusing its size/ice/sugar from history.
async function addToppingToCartFromHistory(toppingText, history, userId) {
    const drinkName = resolveLastDrinkFromHistory(history);
    if (!drinkName) return [];
    const drink = await findDrinkByName(drinkName);
    if (!drink) return [];

    const base = resolveCustomizationFromHistory(history) || { size: 'Regular', ice: 'Normal Ice', sugar: 'Normal Sweet', lang: 'en' };
    const topping = normalizeToppingName(toppingText);
    const customization = { size: base.size, ice: base.ice, sugar: base.sugar, toppings: topping ? [topping] : [], lang: base.lang };

    const cartItem = await CartItem.addToCart(userId, drink.itemId, { quantity: 1, customization });
    cartItem.drinkInfo = drink;
    cartItem.menuItemCode = drink.itemId;
    return [cartItem];
}

// Persists the drinks Gemini staged in its hidden-cart-data block to the real cart.
async function addHiddenCartItemsToDatabase(hiddenCartItems, userId) {
    const addedItems = [];

    for (const hiddenItem of hiddenCartItems) {
    const drink = await findDrinkByName(hiddenItem.name);

    if (!drink) {
        console.warn("[ChatbotService] Hidden cart drink not found:", hiddenItem.name);
        continue;
    }

    const customization = parseCustomization(hiddenItem.details);

    const cartItem = await CartItem.addToCart(userId, drink.itemId, {
        quantity: 1,
        customization,
    });

    cartItem.drinkInfo = drink;
    cartItem.menuItemCode = drink.itemId;

    addedItems.push(cartItem);
    }

    return addedItems;
}
// End of User Story #199

// #200 - As a customer, I want to view my cart through the chatbot so that I can review my selected beverages before checkout.
function isViewCartRequest(message) {
    const msg = String(message || "").toLowerCase().replace(/['']/g, "'");

    // A mutation intent (add / remove / clear / update a cart item) must never be swallowed
    if (/\b(add|remove|delete|clear|empty|update|edit)\b/.test(msg)) return false;

    return (
        msg.includes("view cart") ||
        msg.includes("check cart") ||
        msg.includes("show cart") ||
        msg.includes("my cart") ||
        msg.includes("the cart") ||
        msg.includes("current cart") ||
        msg.includes("cart items") ||
        msg.includes("in my cart") ||
        msg.includes("in the cart") ||
        /what('?s| is) in (my |the |my current |the current )?cart/i.test(msg) ||
        /what (do i have|have i got|is|are) in (my |the )?cart/i.test(msg) ||
        msg.includes("my current order") ||
        msg.includes("my order") ||
        /what('?s| is) my (current )?order/i.test(msg)
    );
}

// Builds the cart's line-by-line HTML summary plus total, with per-item nutrition info.
async function buildCartSummary(userId) {
    const cartItems = await CartItem.getCart(userId);

    const cartTotal = cartItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
    );

    const lines = await Promise.all(cartItems.map(async (item, index) => {
        const c = item.customization || {};
        const toppings = Array.isArray(c.toppings) && c.toppings.length > 0
            ? c.toppings.map((t) => t.replace(/\s*\(\+S\$[\d.]+\)/g, "").trim()).join(", ")
            : "No toppings";
        const customStr = `${c.size || "Regular"} | ${c.ice || "Normal Ice"} | ${c.sugar || "Normal Sweet"} | ${toppings}`;

        let nutritionLine = "";
        const menuItem = item.menuItemId
            ? await MenuItem.findById(item.menuItemId).lean()
            : await MenuItem.findOne({ itemId: item.menuItemCode }).lean();
        if (menuItem) {
            const sugarG = menuItem.base_sugar_g ?? menuItem.nutritionInfo?.baseSugarG ?? 0;
            const calKcal = menuItem.base_calories ?? menuItem.nutritionInfo?.baseCalories ?? 0;
            const grade = (menuItem.nutritionInfo?.nutriGrade || menuItem.nutri_grade || "").toUpperCase().trim();
            const gradeText = grade ? ` | Grade ${grade}` : "";
            nutritionLine = `<br>Dietary Info: Sugar: ${sugarG}g | Cal: ${calKcal} kcal${gradeText}`;
        }

        return (
            `${index + 1}. <strong>${item.name}</strong><br>` +
            `Qty: ${item.quantity}  ·  S$ ${Number(item.lineTotal || 0).toFixed(2)}<br>` +
            `Customization: ${customStr}` +
            nutritionLine
        );
    }));

    const cartSummaryHtml = lines.join("<br><br>");

    return {
        cartItems,
        cartSummaryHtml,
        cartTotal,
    };
}
// End of User Story #200

// #201 - As a customer, I want to edit items in my cart through the chatbot so that I can modify my order before payment.
function isClearCartRequest(message) {
    const msg = String(message || "").toLowerCase().replace(/['']/g, "'");
    return (
        msg.includes("remove my order") ||
        msg.includes("remove the order") ||
        msg.includes("remove my current order") ||
        msg.includes("remove the current order") ||
        msg.includes("remove all") ||
        msg.includes("clear my cart") ||
        msg.includes("clear the cart") ||
        msg.includes("empty my cart") ||
        msg.includes("empty the cart") ||
        msg.includes("delete my cart") ||
        msg.includes("delete all") ||
        msg.includes("cancel my order") ||
        msg.includes("cancel the order") ||
        /remove (everything|all items|all drinks)/i.test(msg)
    );
}

// True if the message edits an existing cart line (remove/change/ordinal reference), not a new order.
function isCartUpdateRequest(message) {
    const msg = normalizeSugarPercents(String(message || "").toLowerCase());

    // Ordering-flow step responses — no drink name, no ordinal = Gemini ordering option, not a cart edit
    if (/^(change to \d+%\s*sugar|remain at \d+%\s*sugar)$/i.test(msg.trim())) return false;
    // "Change to Brown Sugar" / "Switch to Tapioca Pearls" at topping step
    if (
        /^(change to|switch to)\s+\w/i.test(msg.trim()) &&
        !resolveDrinkNameFromMessage(msg) &&
        !/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th)\b/i.test(msg)
    ) return false;
    // "add one more X but with [different customization]" = new item, not a quantity bump
    if ((msg.includes("add one more") || msg.includes("add another")) && hasCustomizationWords(msg)) return false;

    const hasEditVerb = (
        msg.includes("remove") ||
        msg.includes("delete") ||
        msg.includes("increase") ||
        msg.includes("decrease") ||
        msg.includes("reduce") ||
        msg.includes("add one more") ||
        msg.includes("add another") ||
        msg.includes("minus one") ||
        msg.includes("change") ||
        msg.includes("edit") ||
        msg.includes("update") ||
        msg.includes("make it") ||
        msg.includes("switch")
    );

    const hasDrinkOrCartRef = (
        msg.includes("cart") ||
        msg.includes("drink") ||
        msg.includes("item") ||
        msg.includes("milk tea") ||
        msg.includes("milo") ||
        msg.includes("frappe") ||
        msg.includes("matcha") ||
        msg.includes("taro") ||
        msg.includes("latte") ||
        msg.includes("slush") ||
        msg.includes("dinosaur") ||
        hasCustomizationWords(msg) ||
        resolveDrinkNameFromMessage(msg) !== null
    );

    // "advice on selecting my first drink" / "help me choose my first drink" — advice-seeking
    // language, not a reference to an existing cart line, even though it pairs an ordinal with
    // "drink". Without this guard the ordinal check below misfires as a cart-edit request.
    const hasAdviceIntent = /\b(advice|recommend|suggest|suggestion|choose|choosing|select|selecting|pick|picking)\b/i.test(msg);

    // "second drink" / "the first item" / "the first one" / "the first strawberry" — ordinal targeting
    // without a verb still means cart intent. Also catches any drink keyword so "the first strawberry"
    // / "the first strawberry matcha tea" routes back here, not Gemini.
    const hasOrdinalItemRef =
        !hasAdviceIntent &&
        /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b/i.test(msg) &&
        (msg.includes("drink") || msg.includes("item") || /\bone\b/i.test(msg) || hasDrinkOrCartRef);

    return (hasEditVerb && hasDrinkOrCartRef) || hasOrdinalItemRef;
}

// Parses a cart-edit message into { action, targetName, targetCustomization, newCustomization, quantityDelta }.
function getCartUpdateIntent(message) {
    const msg = normalizeSugarPercents(String(message || "").toLowerCase());

    const intent = {
        action: "updateCustomization",
        targetName: null,
        targetCustomization: {},
        newCustomization: {},
        quantityDelta: 0,
    };

    // "remove pearls" / "remove the pearls from my matcha latte" — a single-topping edit, not a
    // whole-item removal. Must be detected before the generic remove/delete branch below, otherwise
    // "remove" alone deletes the entire cart line instead of just dropping that topping. Returns
    // early so the changeText-based parsing further down never runs — that logic would otherwise
    // read "pearl" out of the same message and ADD pearls back via intent.newCustomization.toppings.
    const TOPPING_NAME_MAP = [
        ["Tapioca Pearls", /\b(pearl|pearls|tapioca|boba)\b/],
        ["Brown Sugar", /\bbrown sugar\b/],
        ["Cheese Foam", /\bcheese(\s*foam)?\b/],
    ];
    const mentionedToppings = TOPPING_NAME_MAP.filter(([, re]) => re.test(msg)).map(([name]) => name);
    const isWholeItemRemoval = /\bremove\s+(the\s+|my\s+)?(whole\s+)?(drink|item|order)\b/.test(msg);

    if ((msg.includes("remove") || msg.includes("delete")) && mentionedToppings.length > 0 && !isWholeItemRemoval) {
        intent.action = "updateCustomization";
        intent.removeToppings = mentionedToppings;
        intent.targetName = resolveDrinkNameFromMessage(msg);
        return intent;
    }

    if (msg.includes("remove one") || /remove\s+\d+/.test(msg)) {
        intent.action = "decrease";
        intent.quantityDelta = -1;
    } else if (msg.includes("remove") || msg.includes("delete")) {
        intent.action = "remove";
    } else if (msg.includes("increase") || msg.includes("add one more") || msg.includes("add another") || msg.includes("plus one")) {
        intent.action = "increase";
        intent.quantityDelta = 1;
    } else if (msg.includes("decrease") || msg.includes("minus one") || msg.includes("reduce")) {
        intent.action = "decrease";
        intent.quantityDelta = -1;
    }

    intent.targetName = resolveDrinkNameFromMessage(msg);

    // Split on "change to / update to / make it", or fall back to last " to " in the sentence
    const parts = msg.split(/\bchange to\b|\bupdate to\b|\bmake it\b|\binto\b|\bto\b/);
    let targetText = parts[0] || msg;
    let changeText = parts[1] || "";

    if (!changeText) {
        const toIdx = msg.lastIndexOf(" to ");
        if (toIdx > -1) {
            targetText = msg.substring(0, toIdx);
            changeText = msg.substring(toIdx + 4);
        }
    }
    if (!changeText) changeText = msg;

    // Match sugar values against what parseCustomizationFromMessage stores
    const targetSugar = parseSugarLevel(targetText) || (/normal sweet/.test(targetText) ? "Normal Sweet" : null);
    if (targetSugar) intent.targetCustomization.sugar = targetSugar;

    const changeSugar = parseSugarLevel(changeText) || (/normal sweet/.test(changeText) ? "Normal Sweet" : null);
    if (changeSugar) intent.newCustomization.sugar = changeSugar;

    if (changeText.includes("no toppings") || changeText.includes("no topping")) {
        intent.newCustomization.toppings = [];
    } else if (changeText.includes("pearl") || changeText.includes("pearls")) {
        intent.newCustomization.toppings = ["Tapioca Pearls"];
    } else if (changeText.includes("brown sugar")) {
        intent.newCustomization.toppings = ["Brown Sugar"];
    } else if (changeText.includes("cheese")) {
        intent.newCustomization.toppings = ["Cheese Foam"];
    }

    if (changeText.includes("large")) intent.newCustomization.size = "Large";
    else if (changeText.includes("regular")) intent.newCustomization.size = "Regular";

    if (changeText.includes("no ice")) intent.newCustomization.ice = "No Ice";
    else if (changeText.includes("less ice")) intent.newCustomization.ice = "Less Ice";
    else if (changeText.includes("normal ice")) intent.newCustomization.ice = "Normal Ice";
    else if (changeText.includes("hot")) intent.newCustomization.ice = "Hot";

    // "reduce 25% to 0% for oolong milk tea" is a sugar change, not one drink fewer.
    // The quantity verbs ("reduce", "decrease") only mean quantity when the message
    // names no new size, ice, sugar or topping — otherwise this deleted the drink.
    const changesCustomization = Object.keys(intent.newCustomization).length > 0;
    const namesQuantity = /\b(remove|minus|add)\s+(one|1|another)\b|\bone\s+(less|fewer|more)\b|\bplus one\b/.test(msg);
    if (changesCustomization && !namesQuantity && (intent.action === "decrease" || intent.action === "increase")) {
        intent.action = "updateCustomization";
        intent.quantityDelta = 0;
    }

    return intent;
}

// Narrows the cart down to items matching the parsed intent's drink name/sugar level.
function findTargetCartItem(cartItems, intent) {
    let matches = cartItems;

    if (intent.targetName) {
        matches = matches.filter(
            item =>
                String(item.name || "").toLowerCase() ===
                intent.targetName.toLowerCase()
        );
    }

    if (intent.targetCustomization?.sugar) {
        matches = matches.filter(
            item =>
                item.customization?.sugar ===
                intent.targetCustomization.sugar
        );
    }

    return matches;
}

// Update cart item price after editing
function calculateCartUnitPrice(basePrice, customization = {}) {
    let price = Number(basePrice || 0);

    if (customization.size === "Large") price += 1.5;

    const toppings = Array.isArray(customization.toppings)
        ? customization.toppings
        : [];

    toppings.forEach((topping) => {
        const name = String(topping).toLowerCase();

        if (name.includes("pearl")) price += 1.2;
        else if (name.includes("brown sugar")) price += 1.0;
        else if (name.includes("cheese")) price += 1.5;
    });

    return price;
}

// Reads the last cart item id the assistant stashed in a hidden marker in history.
function resolveLastCartItemIdFromHistory(history) {
    if (!Array.isArray(history)) return null;

    for (let i = history.length - 1; i >= 0; i--) {
        const content = String(history[i]?.content || "");
        const match = content.match(
            /<div class=["']hidden-last-cart-item["'][^>]*>(.*?)<\/div>/i
        );

        if (match?.[1]) return match[1].trim();
    }

    return null;
}

// #308 - As a customer, I want to provide feedback via the chatbot so that I can share my experience conveniently.
function isFeedbackRequest(message) {
    const msg = String(message || "").toLowerCase();

    return (
        msg.includes("feedback") ||
        msg.includes("review") ||
        msg.includes("rate my drink") ||
        msg.includes("rate my order") ||
        msg.includes("give rating")
    );
}
// End of Feedback

// Shapes the cart state sent to the frontend after any cart-mutating reply.
function buildCartUpdatePayload(cartItems, message) {
    const total = cartItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    return {
        message,
        cartItems: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            customization: item.customization || {},
            lineTotal: item.lineTotal,
        })),
        total,
    };
}

// Parses the `|`-delimited drink lines out of Gemini's hidden-cart-data block.
function extractHiddenCartData(reply) {
    const match = String(reply || "").match(
    /<div class=['"]hidden-cart-data['"][^>]*>([\s\S]*?)<\/div>/i
    );

    if (!match) return [];

    return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
        const parts = line.split("|").map((part) => part.trim());

        return {
        name: parts[0],
        details: parts[1],
        price: parts[2],
        image: parts[3],
        };
    })
    .filter((item) => item.name);
    }

// Parses a "·"-separated customization string (any supported language) into size/ice/sugar/toppings.
function parseCustomization(details) {
    const text = String(details || "");

    const parts = text
        .split("·")
        .map((part) => part.trim())
        .filter(Boolean);

    // Detect ordering language from Malay/Chinese/Tamil keywords so Cart can translate labels back
    const hasMs = /besar|biasa|kurang ais|tanpa ais|ais normal|panas|mutiara|busa keju|gula perang|tanpa topping/i.test(text);
    const hasZh = /大杯|中杯|少冰|去冰|正常冰|热饮|珍珠|黑糖|芝士泡沫|不加配料/.test(text);
    const hasTa = /[஀-௿]/.test(text);
    const lang = hasMs ? "ms" : hasZh ? "zh" : hasTa ? "ta" : "en";

    // --- SIZE ---
    const sizePart = parts.find((p) =>
        /\b(large|besar|大杯|regular|medium|biasa|中杯)\b/i.test(p)
    );
    let size = "Regular";
    if (sizePart && /\b(large|besar|大杯)\b/i.test(sizePart)) size = "Large";

    // --- ICE ---
    const icePart = parts.find((p) =>
        /no ice|less ice|normal ice|hot|tanpa ais|kurang ais|ais normal|panas|去冰|少冰|正常冰|热饮/i.test(p)
    );
    let ice = "Normal Ice";
    if (icePart) {
        const ip = icePart.toLowerCase();
        if (/no ice|tanpa ais|去冰/.test(ip))    ice = "No Ice";
        else if (/less ice|kurang ais|少冰/.test(ip)) ice = "Less Ice";
        else if (/hot|panas|热饮/.test(ip))      ice = "Hot";
        else                                      ice = "Normal Ice";
    }

    // --- SUGAR ---
    // Use \b before the number only (no trailing \b) — "25% Sugar" needs \b before "25", not after "%".
    // Prefer an explicit percentage over "Normal Sweet" when both appear (Gemini sometimes outputs both).
    const sugarPercentPart = parts.find((p) => /\b(0|25|50|100)\s*%/i.test(p));
    const sugarNormalPart  = parts.find((p) => /normal sweet|normal manis|正常甜/i.test(p));
    const sugarPart = sugarPercentPart || sugarNormalPart;
    let sugar = "Normal Sweet";
    if (sugarPart) {
        if (/\b0\s*%/.test(sugarPart))    sugar = "0% Sugar";
        else if (/\b25\s*%/.test(sugarPart)) sugar = "25% Sugar";
        else if (/\b50\s*%/.test(sugarPart)) sugar = "50% Sugar";
        else if (/\b100\s*%/.test(sugarPart)) sugar = "100% Sugar";
        else                               sugar = "Normal Sweet";
    }

    // --- TOPPINGS --- normalize Malay/Chinese topping names → English
    // Sugar filter uses same \b(n)\s*% pattern so "25% Sugar" is excluded from toppings
    const isNotTopping = (p) =>
        /\b(large|besar|大杯|regular|medium|biasa|中杯)\b/i.test(p) ||
        /no ice|less ice|normal ice|hot|tanpa ais|kurang ais|ais normal|panas|去冰|少冰|正常冰|热饮/i.test(p) ||
        /\b(0|25|50|100)\s*%|normal sweet|normal manis|正常甜/i.test(p) ||
        /no toppings|tanpa topping|不加配料/i.test(p);

    const toppings = parts
        .filter((p) => !isNotTopping(p))
        .map((t) => {
            const clean = t.replace(/\s*\(\+S\$[\d.]+\)/g, "").trim();
            if (/pearl|mutiara|珍珠|boba|tapioca/i.test(clean)) return "Tapioca Pearls";
            if (/brown sugar|gula perang|黑糖/i.test(clean))     return "Brown Sugar";
            if (/cheese|busa keju|芝士/i.test(clean))            return "Cheese Foam";
            return clean;
        })
        .filter(Boolean);

    return { size, ice, sugar, toppings, lang };
}

// Parses size/ice/sugar/toppings straight from a free-text order message.
function parseOrderDetails(message) {
    const msg = String(message || "").toLowerCase();

    let size = null;
    if (/\b(large|big|l)\b/.test(msg)) size = "Large";
    else if (/\b(medium|regular|normal|m)\b/.test(msg)) size = "Regular";

    let ice = null;
    if (/no ice|without ice/.test(msg)) ice = "No Ice";
    else if (/less ice|little ice/.test(msg)) ice = "Less Ice";
    else if (/hot|warm/.test(msg)) ice = "Hot";
    else if (/normal ice|regular ice/.test(msg)) ice = "Normal Ice";

    let sugar = parseSugarLevel(msg);

    let toppings = null;
    if (/no topping|no toppings|none|without topping/.test(msg)) toppings = [];
    else {
    const found = [];
        if (/pearl|pearls|tapioca/.test(msg)) found.push("Tapioca Pearls");
        if (/brown sugar/.test(msg)) found.push("Brown Sugar");
        if (/cheese foam|foam/.test(msg)) found.push("Cheese Foam");
        if (found.length > 0) toppings = found;
        }

    return { size, ice, sugar, toppings };
}

// Strips the hidden-cart-data block and tidies bullet/dash formatting from a Gemini reply.
function cleanAiReply(reply) {
    return String(reply || "")
    .replace(/<div class=['"]hidden-cart-data['"][^>]*>[\s\S]*?<\/div>/i, "")
    // Strip leading hyphens used as bullet points (e.g. "- Regular" → "Regular")
    .replace(/(^|<br\s*\/?>)\s*-\s+/gi, "$1")
    // Replace em dashes (—) with a comma+space for natural reading
    .replace(/\s*—\s*/g, ", ")
    .trim();
}

// Patches known spots where Gemini's reply text runs sections together without a line break.
function fixMissingLineBreaks(reply) {
    return String(reply || "")
        .replace(/Here is your order summary:/gi, "Here is your order summary:<br>")
        .replace(/(summary:)([A-Z])/gi, "$1<br>$2")
        .replace(/(S\$[0-9.]+)(Regular|Large)/gi, "$1<br>$2")
        .replace(/(No toppings|Cheese Foam|Brown Sugar|Pearls)(sugar:)/gi, "$1<br>$2")
        .replace(/(Nutri-Grade:\s*[A-D])(Total Price:)/gi, "$1<br>$2")
        .replace(/(Total Price:\s*S\$[0-9.]+)(Added to your cart)/gi, "$1<br><br>$2")
        .replace(/(successfully\.)(Your current cart:)/gi, "$1<br><br>$2")
        .replace(/(current cart:)([A-Z])/gi, "$1<br>$2")
        .replace(/(x\s*\d+\s*-\s*S\$\s*[0-9.]+)([A-Z])/g, "$1<br>$2")
        .replace(/(Total:\s*S\$\s*[0-9.]+)/gi, "<br>$1")
        .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
        // fix "?Regular" → "?<br><br>Regular"
        .replace(/\?(Regular|Large)/gi, "?<br><br>$1")
        // fix "Large (+S$1.50)Please" → "Large (+S$1.50)<br><br>Please"
        .replace(/(\+S\$[0-9.]+\))(Please|Let|Kindly)/gi, "$1<br><br>$2")
        // fix "Updated Nutri-Grade: CJust" → "Updated Nutri-Grade: C<br><br>Just"
        .replace(/(Updated Nutri-Grade:\s*[A-D])([A-Za-z])/g, "$1<br><br>$2")
        // fix missing space after sentence-ending punctuation before a capitalised word
        .replace(/([.!?])([A-Z])/g, "$1 $2")
        .trim();
}

// Handles quick-prompt button clicks: fetches the relevant drinks from the DB,
// injects them as context, and lets Gemini write a natural response.
// The drink cards are returned alongside the AI reply for the frontend to render.
async function handleQuickPromptWithGemini({ safeMessage, activeConversationId, userId, history: recentHistory }) {
    const msg = safeMessage.toLowerCase();
    const rankByCalorie = msg.includes('calorie') || msg.includes('calories') || msg.includes('cal');
    const wantLow = msg.includes('low') || msg.includes('least') || msg.includes('lowest') || msg.includes('healthier') || msg.includes('healthy');

    let drinks = [];

    if (msg.includes('sugar') || rankByCalorie || msg.includes('healthy') || msg.includes('healthier')) {
        // Health-ranked query — sort by the relevant metric ascending
        const allDrinks = await MenuItem.find({ status: 'active' }).lean();
        const withNutrition = allDrinks.filter(d => {
            const n = d.nutritionInfo || {};
            return n.baseSugarG != null || n.baseCalories != null;
        });
        drinks = [...withNutrition].sort((a, b) => {
            const nA = a.nutritionInfo || {};
            const nB = b.nutritionInfo || {};
            const valA = rankByCalorie ? Number(nA.baseCalories ?? 9999) : Number(nA.baseSugarG ?? 9999);
            const valB = rankByCalorie ? Number(nB.baseCalories ?? 9999) : Number(nB.baseSugarG ?? 9999);
            return wantLow ? valA - valB : valB - valA;
        }).slice(0, 5);
    } else {
        // General recommendation — top rated across the menu
        drinks = await MenuItem.recommendByMessage(safeMessage);
        if (drinks.length === 0) {
            const allDrinks = await MenuItem.find({ status: 'active' }).lean();
            drinks = allDrinks.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
        }
    }

    const cards = formatDrinkCards(drinks);

    const drinkLines = cards.map((d, i) => {
        const sugar = d.base_sugar_g != null ? `${d.base_sugar_g}g sugar` : null;
        const cal = d.base_calories != null ? `${d.base_calories} kcal` : null;
        const grade = d.nutri_grade ? `Grade ${d.nutri_grade.toUpperCase()}` : null;
        const stats = [sugar, cal, grade].filter(Boolean).join(', ');
        return `${i + 1}. ${d.name} — S$${Number(d.price).toFixed(2)}${stats ? ` (${stats})` : ''}`;
    }).join('\n');

    const drinkContext = `
DRINKS TO RECOMMEND (these will be shown as visual cards — do NOT list their details):
${drinkLines}

Write a warm, natural 1–2 sentence intro for these recommendations. Reference the selection briefly but do not enumerate every drink — the cards handle the details. Speak as Avy, the friendly DripTea assistant.`;

    const systemPrompt = await buildSystemPrompt(safeMessage, drinkContext, detectMessageLanguage(safeMessage));
    let reply = await aiClient.generateText(safeMessage, recentHistory, systemPrompt)
    reply = fixMissingLineBreaks(reply);

    await ChatbotSession.appendToConversation(activeConversationId, userId, { role: 'user', content: safeMessage });
    await ChatbotSession.appendToConversation(activeConversationId, userId, { role: 'assistant', content: reply });

    return { reply, recommendedDrinks: cards, system_action: { ui_navigation: 'none' } };
}

// #199 - Parses an explicit quantity from natural language.
// "two large milo" -> 2 | "3 taro slush" -> 3 | anything else -> 1
function parseQuantityFromMessage(message) {
    const msg = String(message || "").toLowerCase();
    const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const wordMatch = msg.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/);
    if (wordMatch) return wordMap[wordMatch[1]];
    const numMatch = msg.match(/\b([2-9]|10)\b/);
    if (numMatch) return parseInt(numMatch[1]);
    return 1;
}

// #199 - Detects messages that order multiple distinct drinks in one request.
// Matches: "and another X", "and have another X", "plus another X", "and also X",
//          "and one/two/[n] X" (quantity-style), "both X and Y" shared-customization orders,
//          "and a/an [size] X" or "and a/an [drink-keyword] X" natural phrasing.
const MULTI_ORDER_DRINK_KEYWORDS = [
    'regular', 'large', 'small',
    'matcha', 'jasmine', 'oolong', 'osmanthus', 'classic', 'strawberry', 'cranberry',
    'milk\\s+tea', 'latte', 'lemon', 'mango', 'peach', 'lychee',
    'grapefruit', 'watermelon', 'ice\\s+blended', 'da\\s+hong\\s+bao',
    // "Ice Lemon Tea" is the only menu item whose first word ("ice") isn't otherwise
    // covered here — without this, "and a ice lemon tea" never matches the "and a/an
    // [drink]" pattern below, so a second drink named this way is silently dropped
    // instead of being added as a separate item.
    'ice\\s+lemon\\s+tea',
];
const MULTI_ORDER_AND_A_RE = new RegExp(
    `\\band\\s+an?\\s+(?:${MULTI_ORDER_DRINK_KEYWORDS.join('|')})\\b`, 'i'
);

// True if the message orders more than one distinct drink in a single request.
function isMultiItemOrder(message) {
    const msg = String(message || "").toLowerCase();
    return (
        /\band\s+(?:have\s+)?another\s+\w/i.test(msg) ||
        /\bplus\s+(?:a\s+|an\s+|another\s+|one\s+more\s+)\w/i.test(msg) ||
        /\band\s+also\s+(?:(?:a|an|one)\s+)?\w/i.test(msg) ||
        // "and one/two/three/[n] [drink]" — excludes "and one more" / "and one of"
        /\band\s+(?:one|two|three|four|five|\d+)\s+(?!more\b|of\b)\w/i.test(msg) ||
        // "and a/an [size or drink keyword]" — e.g. "and a regular classic milk tea"
        MULTI_ORDER_AND_A_RE.test(msg)
    );
}

// #199 - Splits a multi-item order message into individual item segments.
// e.g. "one jasmine matcha tea and one matcha latte, both regular, less ice"
//   → ["one jasmine matcha tea", "matcha latte, both regular, less ice"]
// The split consumes the connector phrase; a lookahead is used for "and a/an [size/drink]"
// so the size/drink keyword is preserved in the second segment for customization parsing.
const MULTI_ORDER_AND_A_SPLIT_RE = new RegExp(
    `\\s+and\\s+an?\\s+(?=(?:${MULTI_ORDER_DRINK_KEYWORDS.join('|')})\\b)`, 'gi'
);

// Splits a multi-item order message into one segment per drink.
function splitMultiItemOrder(message) {
    // Replace "and a/an [size/drink]" connectors with a placeholder first, then split on all connectors.
    const normalized = message.replace(MULTI_ORDER_AND_A_SPLIT_RE, ' __SPLIT__ ');
    const parts = normalized.split(
        /\s*__SPLIT__\s*|\s+(?:and\s+(?:have\s+)?another|plus\s+(?:a|an|another|one\s+more)|and\s+also\s+(?:a|an|one)?|and\s+(?:one|two|three|four|five|\d+)(?=\s+(?!more\b|of\b)))\s+/gi
    );
    return parts.map(p => p.trim()).filter(Boolean);
}

// #199 - Extracts customization specified after "both" for shared-customization orders.
// e.g. "...both regular, less ice, less sugar" → { size: "Regular", ice: "Less Ice", sugar: "25% Sugar", toppings: [] }
function extractBothCustomization(message) {
    const msg = String(message || "").toLowerCase();
    const bothIdx = msg.indexOf("both ");
    if (bothIdx === -1) return null;
    return parseCustomizationFromMessage(message.substring(bothIdx + 5));
}

// #26 - As a customer, I want the chatbot to navigate me to a page on the website so that I can find what I need quickly.
const PAGE_DIRECTORY = [
    { key: "home", route: "/", aliases: ["home page", "homepage", "main page", "landing page", "home"],
        labels: { en: "Home", ms: "Laman Utama", zh: "首页", ta: "முகப்பு" } },
    // Route is /buy-driptea, not /menu — /menu is a dead stub that just redirects to /order-type.
    // /buy-driptea itself redirects to /order-type if no pickup/delivery choice is stored yet, so this is safe either way.
    { key: "menu", route: "/buy-driptea", aliases: ["menu page", "beverage menu", "drinks menu", "drink menu", "menu"],
        labels: { en: "Menu", ms: "Menu", zh: "菜单", ta: "மெனு" } },
    { key: "cart", route: "/cart", aliases: ["cart page", "shopping cart", "basket page", "cart", "basket"],
        labels: { en: "Cart", ms: "Troli", zh: "购物车", ta: "கார்ட்" } },
    { key: "checkout", route: "/checkout", aliases: ["checkout page", "payment page", "checkout"],
        labels: { en: "Checkout", ms: "Daftar Keluar", zh: "结账", ta: "செக்அவுட்" } },
    { key: "purchase-history", route: "/purchase-history", aliases: ["purchase history page", "purchase history", "order history page", "order history", "my orders page", "my orders"],
        labels: { en: "Purchase History", ms: "Sejarah Pembelian", zh: "购买记录", ta: "கொள்முதல் வரலாறு" } },
    { key: "order-status", route: "/order-status", aliases: ["order status page", "order status", "track order page", "track my order", "tracking page"],
        labels: { en: "Order Status", ms: "Status Pesanan", zh: "订单状态", ta: "ஆர்டர் நிலை" } },
    { key: "profile", route: "/profile", aliases: ["profile page", "my profile", "account page", "account settings", "profile"],
        labels: { en: "Profile", ms: "Profil", zh: "个人资料", ta: "சுயவிவரம்" } },
    { key: "vouchers", route: "/vouchers", aliases: ["rewards page", "reward page", "vouchers page", "voucher page", "coupons page", "coupon page", "rewards", "reward", "vouchers", "voucher", "coupons", "coupon"],
        labels: { en: "Vouchers", ms: "Baucar", zh: "优惠券", ta: "வவுச்சர்" } },
    { key: "our-story", route: "/our-story", aliases: ["our story page", "our story", "about us page", "about page", "about us"],
        labels: { en: "Our Story", ms: "Kisah Kami", zh: "我们的故事", ta: "எங்கள் கதை" } },
    { key: "contact", route: "/contact", aliases: ["contact us page", "contact page", "contact us", "contact"],
        labels: { en: "Contact Us", ms: "Hubungi Kami", zh: "联系我们", ta: "எங்களை தொடர்பு கொள்ளுங்கள்" } },
    { key: "global-stores", route: "/global-stores", aliases: ["store locator", "stores page", "store locations", "outlets page", "nearby stores", "find a store"],
        labels: { en: "Store Locator", ms: "Lokasi Kedai", zh: "门店位置", ta: "கடை இருப்பிடங்கள்" } },
    // No standalone /delivery route exists — choosing "Delivery" happens on /order-type,
    // which then drops the customer straight into /buy-driptea with delivery mode active.
    { key: "delivery", route: "/order-type", aliases: ["delivery page", "delivery", "order delivery", "get delivery"],
        labels: { en: "Delivery", ms: "Penghantaran", zh: "外送", ta: "டெலிவரி" } },
    { key: "login", route: "/login", aliases: ["login page", "log in page", "sign in page", "log in", "login"],
        labels: { en: "Login", ms: "Log Masuk", zh: "登录", ta: "உள்நுழைவு" } },
    { key: "register", route: "/register", aliases: ["register page", "sign up page", "registration page", "sign up", "register"],
        labels: { en: "Register", ms: "Daftar", zh: "注册", ta: "பதிவு" } },
];

const NAV_STRONG_TRIGGER_RE = /\b(lead me to|guide me to|take me to|bring me to|navigate to|direct me to|redirect me to|switch to the)\b/i;
const NAV_WEAK_TRIGGER_RE = /\b(go to|open|jump to|where is|where's|where are)\b/i;
const NAV_SOFT_SHOW_TRIGGER_RE = /\b(show me|give me|bring up|pull up|display|let me see|can i see|can you show me|could you show me|i want to see|i'd like to see)\b/i;
const NAV_PAGE_WORD_RE = /\bpage\b/i;

const NAV_SOFT_SHOW_EXCLUDED_KEYS = new Set(["cart", "vouchers", "purchase-history", "order-status"]);

// True if the message asks to be taken to a page (strong verb, weak verb + "page", or soft-show + alias).
function isNavigationRequest(message) {
    const msg = String(message || "").toLowerCase();
    if (NAV_STRONG_TRIGGER_RE.test(msg)) return true;
    if (NAV_WEAK_TRIGGER_RE.test(msg) && NAV_PAGE_WORD_RE.test(msg)) return true;

    // "show me the menu" / "give me the store locator" / "pull up my profile" — a soft trigger verb
    // plus an actual page-directory alias. Without this, these fell through to
    // isRecommendationRequest's own "show me"/"give me" catch-all, found no drink by that name, and
    // dead-ended on "couldn't find a drink matching that."
    if (NAV_SOFT_SHOW_TRIGGER_RE.test(msg)) {
        const matched = matchPageFromMessage(msg);
        if (matched && !NAV_SOFT_SHOW_EXCLUDED_KEYS.has(matched.key)) return true;
    }

    return false;
}

// Finds the destination whose alias is the longest match found in the message —
// longer aliases are more specific ("order history" beats a bare "order").
function matchPageFromMessage(message) {
    const msg = String(message || "").toLowerCase();
    let best = null;
    let bestLen = 0;
    for (const page of PAGE_DIRECTORY) {
        for (const alias of page.aliases) {
            if (alias.length > bestLen && msg.includes(alias)) {
                best = page;
                bestLen = alias.length;
            }
        }
    }
    return best;
}

// Sequence: ChatbotGUI → POST /chat → ChatbotService.generateNavigationResponse(prompt) → Gemini API → systemAction.
// Keyword matching handles the vast majority of requests instantly and for free; Gemini is only
// consulted when the customer clearly wants to navigate (isNavigationRequest passed) but phrased
// the destination in a way no alias covers (e.g. "bring me back to where I can see what I bought").
async function generateNavigationResponse(intentMessage) {
    const matched = matchPageFromMessage(intentMessage);
    if (matched) return matched;

    try {
        const pageKeys = PAGE_DIRECTORY.map((p) => p.key).join(", ");
        const prompt =
            `The customer wants to navigate to a page on our bubble tea ordering website. ` +
            `Available page keys: ${pageKeys}. Customer message: "${intentMessage}". ` +
            `Reply with ONLY the single best matching page key from the list, or reply with NONE if nothing matches well.`;

        const raw = await aiClient.generateText(
            prompt,
            [],
            "You are a strict page-name classifier for a website chatbot. Respond with exactly one word: a page key or NONE. No punctuation, no explanation."
        );

        const key = String(raw || "").trim().toLowerCase().replace(/[^a-z-]/g, "");
        return PAGE_DIRECTORY.find((p) => p.key === key) || null;
    } catch (error) {
        console.warn("[ChatbotService] generateNavigationResponse Gemini fallback failed:", error.message);
        return null;
    }
}

const NAV_REPLY_TEMPLATES = {
    en: (label) => `Sure! Taking you to the ${label} page now.`,
    ms: (label) => `Baiklah! Membawa anda ke halaman ${label} sekarang.`,
    zh: (label) => `好的！马上带您前往${label}页面。`,
    ta: (label) => `சரி! இப்போது உங்களை ${label} பக்கத்திற்கு அழைத்துச் செல்கிறேன்.`,
};

const NAV_STEPS_HEADING_TEMPLATES = {
    en: (label) => `To head to the ${label} page manually:`,
    ms: (label) => `Untuk ke halaman ${label} secara manual:`,
    zh: (label) => `手动前往${label}页面的方法：`,
    ta: (label) => `${label} பக்கத்திற்கு கைமுறையாகச் செல்ல:`,
};

// Manual click-paths, verified against the actual UI (Header.tsx, Cart.tsx, PurchaseHistory.tsx, login/page.tsx).
// Only pages with a real, reachable path are listed here — e.g. /contact has no link anywhere in the app,
// so it's deliberately omitted rather than inventing a path that doesn't exist.
const PAGE_MANUAL_STEPS = {
    home: {
        en: "1. Click the DripTea logo at the top of any page.",
        ms: "1. Klik logo DripTea di bahagian atas mana-mana halaman.",
        zh: "1. 点击任意页面顶部的 DripTea 标志。",
        ta: "1. எந்தப் பக்கத்தின் மேற்பகுதியிலும் உள்ள DripTea லோகோவைக் கிளிக் செய்யவும்.",
    },
    menu: {
        en: "1. Click \"BUY DRIPTEA\" in the top menu.\n2. Choose Pickup or Delivery.",
        ms: "1. Klik \"BUY DRIPTEA\" pada menu atas.\n2. Pilih Pickup atau Delivery.",
        zh: "1. 点击顶部菜单中的“BUY DRIPTEA”。\n2. 选择自取或外送。",
        ta: "1. மேல் மெனுவில் \"BUY DRIPTEA\" என்பதைக் கிளிக் செய்யவும்.\n2. Pickup அல்லது Delivery-ஐத் தேர்ந்தெடுக்கவும்.",
    },
    cart: {
        en: "1. Click \"Cart\" at the top right of any page.",
        ms: "1. Klik \"Cart\" di penjuru kanan atas mana-mana halaman.",
        zh: "1. 点击任意页面右上角的“Cart”。",
        ta: "1. எந்தப் பக்கத்தின் வலது மேல் மூலையில் உள்ள \"Cart\" ஐக் கிளிக் செய்யவும்.",
    },
    checkout: {
        en: "1. Go to your Cart.\n2. Click \"Proceed to Checkout\" — works for both Pickup and Delivery orders.",
        ms: "1. Pergi ke Troli anda.\n2. Klik \"Proceed to Checkout\" — untuk pesanan Pickup dan Delivery.",
        zh: "1. 前往您的购物车。\n2. 点击“Proceed to Checkout”——自取和外送订单皆适用。",
        ta: "1. உங்கள் கார்ட்டிற்குச் செல்லவும்.\n2. \"Proceed to Checkout\" ஐக் கிளிக் செய்யவும் — Pickup மற்றும் Delivery ஆர்டர்கள் இரண்டிற்கும் பொருந்தும்.",
    },
    "purchase-history": {
        en: "1. At the main page, click your profile photo.\n2. Click Purchase History.",
        ms: "1. Di halaman utama, klik gambar profil anda.\n2. Klik Purchase History.",
        zh: "1. 在主页面，点击您的个人头像。\n2. 点击 Purchase History。",
        ta: "1. முதன்மைப் பக்கத்தில், உங்கள் சுயவிவரப் படத்தைக் கிளிக் செய்யவும்.\n2. Purchase History ஐக் கிளிக் செய்யவும்.",
    },
    "order-status": {
        en: "1. Click your profile photo, then Purchase History.\n2. Click \"Track Order\" or \"Collect\" on your order.",
        ms: "1. Klik gambar profil anda, kemudian Purchase History.\n2. Klik \"Track Order\" atau \"Collect\" pada pesanan anda.",
        zh: "1. 点击您的个人头像，然后点击 Purchase History。\n2. 在您的订单上点击“Track Order”或“Collect”。",
        ta: "1. உங்கள் சுயவிவரப் படத்தைக் கிளிக் செய்து, பின்னர் Purchase History ஐக் கிளிக் செய்யவும்.\n2. உங்கள் ஆர்டரில் \"Track Order\" அல்லது \"Collect\" ஐக் கிளிக் செய்யவும்.",
    },
    profile: {
        en: "1. Click your profile photo.\n2. Click Settings.",
        ms: "1. Klik gambar profil anda.\n2. Klik Settings.",
        zh: "1. 点击您的个人头像。\n2. 点击 Settings。",
        ta: "1. உங்கள் சுயவிவரப் படத்தைக் கிளிக் செய்யவும்.\n2. Settings ஐக் கிளிக் செய்யவும்.",
    },
    vouchers: {
        en: "1. Click your profile photo.\n2. Click Vouchers.",
        ms: "1. Klik gambar profil anda.\n2. Klik Vouchers.",
        zh: "1. 点击您的个人头像。\n2. 点击 Vouchers。",
        ta: "1. உங்கள் சுயவிவரப் படத்தைக் கிளிக் செய்யவும்.\n2. Vouchers ஐக் கிளிக் செய்யவும்.",
    },
    "our-story": {
        en: "1. Click \"OUR STORY\" in the top menu.",
        ms: "1. Klik \"OUR STORY\" pada menu atas.",
        zh: "1. 点击顶部菜单中的“OUR STORY”。",
        ta: "1. மேல் மெனுவில் \"OUR STORY\" என்பதைக் கிளிக் செய்யவும்.",
    },
    "global-stores": {
        en: "1. Click \"STORES\" in the top menu.",
        ms: "1. Klik \"STORES\" pada menu atas.",
        zh: "1. 点击顶部菜单中的“STORES”。",
        ta: "1. மேல் மெனுவில் \"STORES\" என்பதைக் கிளிக் செய்யவும்.",
    },
    delivery: {
        en: "1. Click \"BUY DRIPTEA\" in the top menu.\n2. Choose Delivery.\n3. Add items to your cart, then click \"Proceed to Checkout\" and enter your delivery address there.",
        ms: "1. Klik \"BUY DRIPTEA\" pada menu atas.\n2. Pilih Delivery.\n3. Tambah barang ke troli anda, kemudian klik \"Proceed to Checkout\" dan masukkan alamat penghantaran anda di situ.",
        zh: "1. 点击顶部菜单中的“BUY DRIPTEA”。\n2. 选择外送 (Delivery)。\n3. 将商品加入购物车，然后点击“Proceed to Checkout”，在结账页面填写配送地址。",
        ta: "1. மேல் மெனுவில் \"BUY DRIPTEA\" என்பதைக் கிளிக் செய்யவும்.\n2. Delivery-ஐத் தேர்ந்தெடுக்கவும்.\n3. பொருட்களை கார்ட்டில் சேர்த்து, \"Proceed to Checkout\" ஐக் கிளிக் செய்து, அங்கு உங்கள் டெலிவரி முகவரியை உள்ளிடவும்.",
    },
    login: {
        en: "1. Click \"Log in\" at the top right of any page.",
        ms: "1. Klik \"Log in\" di penjuru kanan atas mana-mana halaman.",
        zh: "1. 点击任意页面右上角的“Log in”。",
        ta: "1. எந்தப் பக்கத்தின் வலது மேல் மூலையில் உள்ள \"Log in\" ஐக் கிளிக் செய்யவும்.",
    },
    register: {
        en: "1. Click \"Log in\" at the top right.\n2. Click \"Register for free\".",
        ms: "1. Klik \"Log in\" di penjuru kanan atas.\n2. Klik \"Register for free\".",
        zh: "1. 点击右上角的“Log in”。\n2. 点击“Register for free”。",
        ta: "1. வலது மேல் மூலையில் உள்ள \"Log in\" ஐக் கிளிக் செய்யவும்.\n2. \"Register for free\" ஐக் கிளிக் செய்யவும்.",
    },
};
// End of User Story #26

// Multilingual short reply strings for hardcoded (non-Gemini) response paths.
// Gemini-based paths are already localised via the language instruction in the system prompt.
const REPLY_STRINGS = {
    loginForCart: {
        en: "You'll need to log in to see your cart. Go ahead and log in and I'll show you what's in there!",
        zh: "请先登录以查看您的购物车！",
        ms: "Sila log masuk untuk melihat troli anda!",
        ta: "உங்கள் கார்ட்டைப் பார்க்க முதலில் உள்நுழையுங்கள்!",
    },
    emptyCart: {
        en: "Your cart is empty.",
        zh: "您的购物车是空的。",
        ms: "Troli anda kosong.",
        ta: "உங்கள் கார்ட் காலியாக உள்ளது.",
    },
    viewCart: {
        en: "Here's your current cart:",
        zh: "以下是您目前的购物车：",
        ms: "Ini adalah troli semasa anda:",
        ta: "இது உங்கள் தற்போதைய கார்ட்:",
    },
    cartCleared: {
        en: "Your cart has been cleared.",
        zh: "您的购物车已清空。",
        ms: "Troli anda telah dikosongkan.",
        ta: "உங்கள் கார்ட் அழிக்கப்பட்டது.",
    },
    cartUpdated: {
        en: "Done! Your cart has been updated.",
        zh: "完成！您的购物车已更新。",
        ms: "Selesai! Troli anda telah dikemaskini.",
        ta: "முடிந்தது! உங்கள் கார்ட் புதுப்பிக்கப்பட்டது.",
    },
    purchaseRecentTitle: {
        en: "Your Most Recent Order",
        zh: "您最近的订单",
        ms: "Pesanan Terbaru Anda",
        ta: "உங்கள் சமீபத்திய ஆர்டர்",
    },
    purchaseRecent: {
        en: "Here's your most recent order.",
        zh: "以下是您最近的订单。",
        ms: "Ini adalah pesanan terbaru anda.",
        ta: "இது உங்கள் சமீபத்திய ஆர்டர்.",
    },
    loginForHistory: {
        en: "You'll need to be logged in to see your purchase history. Log in and I'll pull it up for you!",
        zh: "请先登录以查看购买记录！",
        ms: "Sila log masuk untuk melihat sejarah pembelian anda!",
        ta: "கொள்முதல் வரலாற்றைப் பார்க்க உள்நுழையுங்கள்!",
    },
    noHistory: {
        en: "Looks like you haven't placed an order with us yet — but there's always a first time! 😊",
        zh: "您还没有下过订单，期待您的光临！",
        ms: "Nampaknya anda belum membuat pesanan — datanglah mencuba!",
        ta: "நீங்கள் இன்னும் ஆர்டர் செய்யவில்லை — வாருங்கள் முயற்சிக்கலாம்!",
    },
    loginForFeedback: {
        en: "Please log in first before leaving feedback.",
        zh: "请先登录后再提交反馈。",
        ms: "Sila log masuk dahulu sebelum meninggalkan maklum balas.",
        ta: "கருத்து தெரிவிக்க முதலில் உள்நுழையுங்கள்.",
    },
    collectFirst: {
        en: "Please collect your order first. After collection, you can leave feedback for your drinks.",
        zh: "请先取餐，取餐后即可为您的饮品留下评价。",
        ms: "Sila ambil pesanan anda dahulu sebelum meninggalkan maklum balas.",
        ta: "முதலில் ஆர்டரை வாங்குங்கள். பின்னர் கருத்து தெரிவிக்கலாம்.",
    },
    feedbackAlready: {
        en: "Thanks! You have already submitted feedback for your latest collected order.",
        zh: "谢谢！您已经为最近的订单提交了反馈。",
        ms: "Terima kasih! Anda telah menghantar maklum balas untuk pesanan terbaru.",
        ta: "நன்றி! ஏற்கனவே கருத்து சமர்ப்பிக்கப்பட்டது.",
    },
    feedbackPrompt: {
        en: "We'd love to hear what you thought about our drinks. Your feedback helps us improve and serve you better.",
        zh: "我们很想听听您对饮品的评价，您的反馈将帮助我们持续改进。",
        ms: "Kami ingin mendengar pendapat anda tentang minuman kami. Maklum balas anda amat dihargai.",
        ta: "உங்கள் பானங்களைப் பற்றிய கருத்தை தெரிந்துகொள்ள விரும்புகிறோம். உங்கள் கருத்து மிகவும் பயனுள்ளது.",
    },
    loginForCart2: {
        en: "You'll need to log in before I can add that to your cart — shouldn't take a second!",
        zh: "请先登录后，我才能将商品加入您的购物车！",
        ms: "Sila log masuk sebelum saya dapat menambah ke troli anda!",
        ta: "கார்ட்டில் சேர்க்க முதலில் உள்நுழையுங்கள்!",
    },
    loginForCartMulti: {
        en: "You'll need to log in before I can add items to your cart!",
        zh: "请先登录后，我才能将商品加入您的购物车！",
        ms: "Sila log masuk sebelum saya boleh menambah item ke troli anda!",
        ta: "கார்ட்டில் சேர்க்க முதலில் உள்நுழையுங்கள்!",
    },
    loginForCartEdit: {
        en: "Please log in first before editing your cart.",
        zh: "请先登录后再编辑购物车。",
        ms: "Sila log masuk dahulu sebelum mengedit troli anda.",
        ta: "கார்ட்டை திருத்த முதலில் உள்நுழையுங்கள்.",
    },
    loginForCartClear: {
        en: "You'll need to log in to manage your cart!",
        zh: "请先登录以管理您的购物车！",
        ms: "Sila log masuk untuk mengurus troli anda!",
        ta: "கார்ட்டை நிர்வகிக்க உள்நுழையுங்கள்!",
    },
    loginForReorder: {
        en: "You'll need to log in before I can reorder your previous items.",
        zh: "请先登录后，我才能重新订购您之前的商品。",
        ms: "Sila log masuk sebelum saya boleh membuat semula pesanan anda.",
        ta: "முந்தைய ஆர்டரை மீண்டும் செய்ய உள்நுழையுங்கள்.",
    },
    navigationNotFound: {
        en: "Sorry, I couldn't find that page. You can ask me to take you to the Menu, Cart, Checkout, Purchase History, Order Status, Profile, or Contact Us page.",
        zh: "抱歉，我找不到该页面。您可以让我带您前往菜单、购物车、结账、购买记录、订单状态、个人资料或联系我们页面。",
        ms: "Maaf, saya tidak dapat menemui halaman itu. Anda boleh minta saya bawa anda ke halaman Menu, Troli, Daftar Keluar, Sejarah Pembelian, Status Pesanan, Profil, atau Hubungi Kami.",
        ta: "மன்னிக்கவும், அந்தப் பக்கத்தை என்னால் கண்டுபிடிக்க முடியவில்லை. மெனு, கார்ட், செக்அவுட், கொள்முதல் வரலாறு, ஆர்டர் நிலை, சுயவிவரம் அல்லது எங்களை தொடர்பு கொள்ளுங்கள் பக்கத்திற்கு அழைத்துச் செல்லும்படி என்னிடம் கேட்கலாம்.",
    },
    loginForVouchers: {
        en: "Please log in to check your available vouchers.",
        zh: "请先登录以查看您可用的优惠券。",
        ms: "Sila log masuk untuk menyemak baucar yang tersedia untuk anda.",
        ta: "உங்களிடம் உள்ள வவுச்சர்களைப் பார்க்க முதலில் உள்நுழையுங்கள்.",
    },
    exploreRewardsCta: {
        en: "You can find more voucher details by exploring our Vouchers page!",
        zh: "欢迎前往我们的优惠券页面，了解更多优惠券详情！",
        ms: "Anda boleh mendapatkan lebih banyak butiran baucar dengan meneroka halaman Vouchers kami!",
        ta: "மேலும் வவுச்சர் விவரங்களை எங்கள் Vouchers பக்கத்தில் காணலாம்!",
    },
    exploreRewardsBtn: {
        en: "Explore Vouchers",
        zh: "探索优惠券",
        ms: "Terokai Baucar",
        ta: "வவுச்சர்களை ஆராயுங்கள்",
    },
    orderStatusStep1: {
        en: "Order sent",
        zh: "订单已发送",
        ms: "Pesanan dihantar",
        ta: "ஆர்டர் அனுப்பப்பட்டது",
    },
    orderStatusStep2: {
        en: "Drinks in Progress",
        zh: "饮品制作中",
        ms: "Minuman Sedang Disediakan",
        ta: "பானம் தயாராகிறது",
    },
    orderStatusStep3: {
        en: "Collection!",
        zh: "待取餐！",
        ms: "Pengambilan!",
        ta: "சேகரிப்பு!",
    },
    orderStatusPhase1Msg: {
        en: "Please wait for your drink to be prepared and collected at the pickup counter.",
        zh: "请耐心等待，您的饮品制作完成后可在取餐柜台领取。",
        ms: "Sila tunggu minuman anda disediakan dan diambil di kaunter pengambilan.",
        ta: "உங்கள் பானம் தயாராகி, பிக்கப் கவுன்டரில் பெறப்படும் வரை காத்திருக்கவும்.",
    },
    orderStatusPhase2Msg: {
        en: "Your drink is in progress! Please keep a lookout.",
        zh: "您的饮品正在制作中！请留意通知。",
        ms: "Minuman anda sedang disediakan! Sila perhatikan.",
        ta: "உங்கள் பானம் தயாராகி வருகிறது! கவனமாக இருங்கள்.",
    },
    orderStatusPhase3Msg: {
        en: "Your drink is ready for collection! Please head to the pickup counter.",
        zh: "您的饮品已准备好，请前往取餐柜台领取！",
        ms: "Minuman anda sudah sedia untuk diambil! Sila ke kaunter pengambilan.",
        ta: "உங்கள் பானம் தயார்! பிக்கப் கவுன்டருக்குச் செல்லவும்.",
    },
    // #304 Track Delivery Order Status via Chatbot — 4-phase widget matching the order-status tracking page
    // (Order Confirmed / Preparing / Out for Delivery / Delivered), worded for
    // delivery orders instead of pickup's 3-phase one.
    orderStatusStepDelivery1: {
        en: "Order Confirmed",
        zh: "订单已确认",
        ms: "Pesanan Disahkan",
        ta: "ஆர்டர் உறுதி செய்யப்பட்டது",
    },
    orderStatusStepDelivery2: {
        en: "Preparing",
        zh: "制作中",
        ms: "Sedang Disediakan",
        ta: "தயாராகிறது",
    },
    orderStatusStepDelivery3: {
        en: "Out for Delivery",
        zh: "配送中",
        ms: "Dalam Penghantaran",
        ta: "டெலிவரிக்குச் சென்றது",
    },
    orderStatusStepDelivery4: {
        en: "Delivered",
        zh: "已送达",
        ms: "Telah Dihantar",
        ta: "டெலிவரி செய்யப்பட்டது",
    },
    orderStatusPhaseDelivery1Msg: {
        en: "Please wait while we confirm and start preparing your delivery order.",
        zh: "请稍候，我们正在确认并准备您的配送订单。",
        ms: "Sila tunggu, kami sedang mengesahkan dan menyediakan pesanan penghantaran anda.",
        ta: "உங்கள் டெலிவரி ஆர்டரை உறுதிசெய்து தயார் செய்கிறோம், சற்று காத்திருக்கவும்.",
    },
    orderStatusPhaseDelivery2Msg: {
        en: "Your drink is being prepared! It'll be handed to the rider soon.",
        zh: "您的饮品正在制作中！很快将交给配送员。",
        ms: "Minuman anda sedang disediakan! Ia akan diserahkan kepada penghantar tidak lama lagi.",
        ta: "உங்கள் பானம் தயாராகி வருகிறது! விரைவில் டெலிவரி நபரிடம் ஒப்படைக்கப்படும்.",
    },
    orderStatusPhaseDelivery3Msg: {
        en: "Your drink is out for delivery! The rider is on the way to you.",
        zh: "您的饮品正在配送途中！配送员正在赶来。",
        ms: "Minuman anda dalam penghantaran! Penghantar sedang dalam perjalanan.",
        ta: "உங்கள் பானம் டெலிவரிக்குச் சென்றுள்ளது! நபர் உங்களை நோக்கி வருகிறார்.",
    },
    voucherCardTitle: {
        en: "Here are the vouchers you can use right now:",
        zh: "以下是您目前可以使用的优惠券：",
        ms: "Berikut adalah baucar yang boleh anda gunakan sekarang:",
        ta: "இப்போது நீங்கள் பயன்படுத்தக்கூடிய வவுச்சர்கள் இதோ:",
    },
    noVouchersAvailable: {
        en: "You don't have any vouchers available right now. Check back soon for new offers!",
        zh: "您目前没有可用的优惠券，敬请留意新优惠！",
        ms: "Anda tiada baucar yang tersedia sekarang. Semak semula untuk tawaran baharu!",
        ta: "தற்போது உங்களிடம் வவுச்சர்கள் இல்லை. புதிய சலுகைகளுக்காக மீண்டும் பாருங்கள்!",
    },
    noStoresAvailable: {
        en: "Sorry, I couldn't find any store information right now. Please try again shortly.",
        zh: "抱歉，暂时无法获取门店信息，请稍后再试。",
        ms: "Maaf, maklumat kedai tidak tersedia sekarang. Sila cuba sebentar lagi.",
        ta: "மன்னிக்கவும், தற்போது கடை தகவல் கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.",
    },
};

const PHASE_BY_STATUS = { pending: 1, paid: 1, preparing: 2, ready: 3 };

// Builds the chatbot's order-status card from a live order (already run through
// deriveCurrentStatus by the caller). Pulled out of handleChatMessage so the
// live-refresh endpoint (GET /orders/:id/status-card) can build the exact same
// card shape the chat message originally showed, without duplicating the
// phase/label/translation logic.
function buildOrderStatusCard(activeOrder, detectedLang) {
    const t = (key) => REPLY_STRINGS[key]?.[detectedLang] ?? REPLY_STRINGS[key]?.en ?? key;
    const phase = PHASE_BY_STATUS[activeOrder.status];
    const isDelivery = activeOrder.orderType === "delivery";
    const phaseMessageKey = isDelivery
        ? (phase === 1 ? 'orderStatusPhaseDelivery1Msg' : phase === 2 ? 'orderStatusPhaseDelivery2Msg' : 'orderStatusPhaseDelivery3Msg')
        : (phase === 1 ? 'orderStatusPhase1Msg' : phase === 2 ? 'orderStatusPhase2Msg' : 'orderStatusPhase3Msg');

    return {
        orderId: String(activeOrder._id),
        orderNo: activeOrder.orderNo,
        phase,
        message: t(phaseMessageKey),
        stepLabels: isDelivery
            ? [t('orderStatusStepDelivery1'), t('orderStatusStepDelivery2'), t('orderStatusStepDelivery3'), t('orderStatusStepDelivery4')]
            : [t('orderStatusStep1'), t('orderStatusStep2'), t('orderStatusStep3')],
        orderType: isDelivery ? "delivery" : "pickup",
        deliveryAddress: isDelivery ? (activeOrder.deliveryDetails?.customerAddress || null) : null,
        lang: detectedLang,
    };
}

// Main chatbot message handler
// ── Multi-intent ────────────────────────────────────────────────────────────
const INTENT_SEGMENT_SPLIT_RE = new RegExp(
    [
        "[?!]+\\s+",                                   // "…do I have? where is…"
        "(?<!\\d)\\.\\s+",                             // "…my cart. take me to…"
        "\\s*[;\\n]+\\s*",                             // semicolons, line breaks
        "\\s*,\\s*(?:and\\s+|also\\s+|plus\\s+)?",     // "…cart, also where is…"
        "\\s+(?:and|then|also|plus|&)\\s+(?:also\\s+)?",
        "\\s+as\\s+well\\s+as\\s+",
        "\\s+(?:by\\s+the\\s+way|btw|another\\s+thing|additionally|lastly|finally|one\\s+more\\s+thing)\\s+",
    ].join("|"),
    "i"
);

// Splits off a trailing "...to my cart, then guide me to my cart" navigation clause from an
// otherwise single-order add-to-cart message. Only fires right before an actual nav-trigger
// phrase, so ordinary customization commas/"and"s ("no sugar and no ice") are left untouched.
const TRAILING_NAV_SPLIT_RE = /,?\s*(?:and\s+then|then|and)\s+(?=\b(?:lead me to|guide me to|take me to|bring me to|navigate to|direct me to|redirect me to|switch to the|go to)\b)/i;

// Splits a compound message into per-intent segments on ?/!/./and/also/etc.
function splitIntentSegments(message) {
    const msg = String(message || "").trim();
    if (isMultiItemOrder(msg)) return [msg];

    // A single one-shot order ("give me X, regular, normal ice, 50 percent sugar") uses commas to
    // enumerate customization details, not to chain separate requests. Splitting it would strand
    // "regular"/"50 percent sugar" in their own weakly-classified fragments, so the drink-name
    // fragment reaches the ordering logic stripped of the customization the customer just gave.
    if (isAddToCartRequest(msg)) {
        // Still split off a trailing navigation request — "add X to my cart, then guide me to my
        // cart" is an add-to-cart intent AND a navigation intent, not one order with extra commas.
        const navParts = msg.split(TRAILING_NAV_SPLIT_RE).map((p) => p.trim()).filter(Boolean);
        if (navParts.length === 2) return navParts;
        return [msg];
    }

    // "which drink has the lowest sugar and without milk" — the "and without milk" clause narrows
    // the ranking query itself (buildHealthRankingReply filters it out), it isn't a second request.
    // Splitting on "and" here would strand "without milk" as its own unclassifiable fragment and
    // rank the whole menu instead of just the non-milk drinks.
    if (isHealthRankingQuery(msg) && extractNegatedAttributes(msg).length > 0) return [msg];

    return msg
        .split(INTENT_SEGMENT_SPLIT_RE)
        .map((part) => String(part || "").trim())
        .filter((part) => part.length > 2);
}

// The intent family a segment belongs to; falls back to "general" (AI reply) if nothing specific matches.
function classifyIntentSegment(segment) {
    if (isHumanAgentRequest(segment)) return "human";
    if (isOrderCancellationRequest(segment)) return "cancel";
    if (isDeliveryOrPaymentQuestion(segment)) return "deliveryPayment";
    if (isNavigationRequest(segment)) return "navigation";
    if (isClearCartRequest(segment)) return "cartClear";
    if (isAddToCartRequest(segment)) return "cartAdd";
    if (isCartUpdateRequest(segment)) return "cartUpdate";
    if (isViewCartRequest(segment)) return "cartView";
    if (isVoucherRequest(segment)) return "voucher";
    if (isFeedbackRequest(segment)) return "feedback";
    if (isTrackOrderRequest(segment)) return "track";
    if (isPurchaseHistory(segment)) return "history";
    if (isStoreInfoRequest(segment)) return "store";
    if (isNutritionFactQuestion(segment) || isNutriGradeQuestion(segment)) return "nutrition";
    // "what drinks can I take as a diabetic" — no recommendation/ranking keyword, so it was
    // falling through unclassified. Left unrecognised here, a compound message like "what time
    // does X open? what drinks can I take as a diabetic?" only had one classified family
    // ("store"), so multi-intent merging never triggered and the health-condition handler's
    // early return (further down) silently swallowed the store-hours answer.
    if (isHealthConditionRequest(segment)) return "health";
    // A receipt/order/bill request is about something the customer already bought.
    // isRecommendationRequest is broad enough to claim those, which turned "show me my
    // last receipt" into a page of drink suggestions.
    if (/\b(receipt|invoice|bill)\b/i.test(segment)) return "history";
    if (isRecommendationRequest(segment) || isHealthRankingQuery(segment)) return "recommend";
    // Nothing specific recognised it, return to general topic.
    // never triggered, and the off-topic half vanished with no acknowledgement at all.
    return "general";
}

// Two actions that fight over the same cart must not both run.
const CONFLICTING_FAMILIES = [
    ["cartClear", "cartAdd"],
    ["cartClear", "cartUpdate"],
];

// True if the classified families include a pair from CONFLICTING_FAMILIES.
function hasConflictingIntents(families) {
    return CONFLICTING_FAMILIES.some(([a, b]) => families.includes(a) && families.includes(b));
}

// At most three, so a merged reply stays readable on a phone.
const MAX_MERGED_INTENTS = 3;

// Picks the last defined value for a card field. Last, not first: when one segment
// shows the cart and another changes it, the card must show the state after the change.
function lastDefined(results, key) {
    for (let i = results.length - 1; i >= 0; i--) {
        const result = results[i];
        if (result && result[key] !== undefined && result[key] !== null) return result[key];
    }
    return null;
}

// Sits between the answers to two different requests so they don't read as one
// run-on block. Styled by .chatIntentDivider in ChatbotSidebar.module.css.
const INTENT_DIVIDER = '<div class="chatIntentDivider"></div>';

// Combines per-segment handleChatMessage results into one multi-intent reply.
function mergeIntentResults(results) {
    // The voucher card already prints its own heading and list, so repeating the
    // reply text would duplicate it. A short line keeps the thread readable instead
    // and hands over to the next answer.
    const textFor = (r) => (r?.voucherCard
        ? "You can redeem any of these when you check out."
        : String(r?.reply || "").trim());

    // Cards all render above the text, so the lines belonging to a card have to come
    // first — otherwise the voucher caption ends up underneath an unrelated answer.
    const carriesCard = (r) => Boolean(
        r && (r.voucherCard || r.orderStatusCard || r.orderReceipt || r.cartUpdate || r.purchaseHistory)
    );
    const replies = [
        ...results.filter(carriesCard).map(textFor),
        ...results.filter((r) => !carriesCard(r)).map(textFor),
    ].filter(Boolean);

    const navigation = results
        .map((r) => r?.system_action?.ui_navigation)
        .find((nav) => nav && nav !== "none");

    // Each answer travels with its own cards so the UI can render them together.
    // Flattening everything into one list put a "details just below" sentence above
    // an unrelated stack of drink cards.
    const segments = results.map((result) => ({
        reply: textFor(result),
        voucherCard: result?.voucherCard ?? null,
        storeCards: result?.storeCards ?? [],
        purchaseHistory: result?.purchaseHistory ?? null,
        orderStatusCard: result?.orderStatusCard ?? null,
        cartUpdate: result?.cartUpdate ?? null,
        orderReceipt: result?.orderReceipt ?? null,
        recommendedDrinks: result?.recommendedDrinks ?? [],
        healthCard: result?.healthCard ?? null,
    })).filter((segment) => (
        segment.reply || segment.voucherCard || segment.storeCards.length ||
        segment.purchaseHistory || segment.orderStatusCard || segment.cartUpdate ||
        segment.orderReceipt || segment.recommendedDrinks.length
    ));

    const merged = {
        reply: replies.join(INTENT_DIVIDER),
        multiIntent: true,
        segments,
        system_action: { ui_navigation: navigation || "none" },
    };

    for (const key of [
        "voucherCard", "storeCards", "purchaseHistory", "orderStatusCard",
        "cartUpdate", "orderReceipt", "recommendedDrinks", "healthCard", "showViewCart",
    ]) {
        const value = lastDefined(results, key);
        if (value !== null) merged[key] = value;
    }

    const feedbackResult = results.find((r) => r && r.feedbackOrderId);
    if (feedbackResult) {
        merged.feedbackOrderId = feedbackResult.feedbackOrderId;
        merged.feedbackItems = feedbackResult.feedbackItems;
    }

    return merged;
}

// ── One-shot order slot-filling ────────────────────────────────────────────
// A one-shot order needs drink, size, ice, sugar, and an explicit toppings answer before adding to the cart.
const ORDER_FIELD_QUESTIONS = {
    size: "What size would you like?<br>Regular / Large",
    ice: "What ice level would you like?<br>No Ice / Less Ice / Normal Ice / Hot",
    sugar: "What sugar level would you like?<br>0% / 25% / 50% / 100%",
    toppings: "What toppings would you like?<br>Tapioca Pearls (+S$1.20) / Brown Sugar (+S$1.00) / Cheese Foam (+S$1.50) / No Toppings",
};

// First missing field, in the same order the guided step-by-step flow asks; null once complete.
function nextMissingOrderField(draft) {
    if (!draft.beverageId) {
        return { field: "drink", question: "Which drink would you like me to add? You can say something like 'add Classic Milk Tea to my cart'." };
    }
    if (!draft.size) return { field: "size", question: ORDER_FIELD_QUESTIONS.size };
    if (!draft.ice) return { field: "ice", question: ORDER_FIELD_QUESTIONS.ice };
    if (!draft.sugar) return { field: "sugar", question: ORDER_FIELD_QUESTIONS.sugar };
    // == null, not falsy — [] means "no toppings" was answered, not that it's missing.
    if (draft.toppings == null) return { field: "toppings", question: ORDER_FIELD_QUESTIONS.toppings };
    return null;
}

async function askForMissingOrderField(draft, missing, { activeConversationId, userId, safeMessage }) {
    await ChatbotSession.setPendingOrderDraft(activeConversationId, userId, { ...draft, awaitingField: missing.field });
    await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
    await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: missing.question });
    return { reply: missing.question, system_action: { ui_navigation: "none" } };
}

// Commits a fully-answered draft to the cart; shared by the one-shot and resumed-draft paths.
async function finalizeOrderDraft(draft, { activeConversationId, userId, safeMessage }) {
    const customization = {
        size: draft.size,
        ice: draft.ice,
        sugar: draft.sugar,
        toppings: draft.toppings || [],
    };
    const quantity = draft.quantity || 1;

    const cartItem = await CartItem.addToCart(userId, draft.beverageId, { quantity, customization });

    const allCartItems = await CartItem.getCart(userId);
    const cartTotal = allCartItems.reduce((sum, i) => sum + Number(i.lineTotal || 0), 0);

    const menuItem = await MenuItem.findOne({ itemId: draft.beverageId }).lean();
    const nutrition = menuItem ? calculateNutrition(menuItem, customization.sugar, customization.toppings) : null;

    const qtyLabel = quantity > 1 ? ` ×${quantity}` : "";
    const reply = `${cartItem.name}${qtyLabel} added to your cart.`;

    await ChatbotSession.clearPendingOrderDraft(activeConversationId);
    await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
    await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

    return {
        reply,
        system_action: { ui_navigation: "none" },
        showViewCart: true,
        orderReceipt: {
            drink: {
                name: cartItem.name,
                price: cartItem.unitPrice,
                image: cartItem.image || (/^b\d{3}$/.test(draft.beverageId) ? `/img/bubble_teas/${draft.beverageId}.jpg` : "/img/bubble_teas/b001.jpg"),
            },
            customization,
            nutrition,
            recommendedNutrition: (nutrition && (nutrition.grade === "C" || nutrition.grade === "D"))
                ? calculateNutrition(menuItem, "25% Sugar", customization.toppings || [])
                : null,
            cartItems: allCartItems.map((i) => ({ name: i.name, quantity: i.quantity, lineTotal: i.lineTotal })),
            total: cartTotal,
            lang: detectMessageLanguage(safeMessage),
        },
    };
}

// Reads a reply as the answer to draft.awaitingField; null if it doesn't look like one.
async function continueOrderDraft(draft, replyMessage, { activeConversationId, userId, safeMessage, history }) {
    const field = draft.awaitingField;

    if (field === "drink") {
        let beverageId = await resolveBeverageId(replyMessage);
        if (!beverageId) {
            // Only fall back to history if the reply itself names a drink — else "yes"/"sure" would latch onto an unrelated one.
            const lastDrinkName = resolveDrinkNameFromMessage(replyMessage) ? resolveLastDrinkFromHistory(history) : null;
            if (lastDrinkName) beverageId = await resolveBeverageId(lastDrinkName);
        }
        if (!beverageId) return null;
        draft.beverageId = beverageId;
    } else if (field === "size") {
        const size = parseSizeMention(replyMessage);
        if (!size) return null;
        draft.size = size;
    } else if (field === "ice") {
        const ice = parseIceMention(replyMessage);
        if (!ice) return null;
        draft.ice = ice;
    } else if (field === "sugar") {
        const invalidSugar = findInvalidSugarPercent(replyMessage);
        if (invalidSugar !== null) {
            const reply = `Sorry, ${invalidSugar}% sugar isn't one of our sugar level options. We offer 0%, 25%, 50%, or 100% sugar — which would you like?`;
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
            return { reply, system_action: { ui_navigation: "none" } };
        }
        const sugar = parseSugarLevel(replyMessage);
        if (!sugar) return null;
        draft.sugar = sugar;
    } else if (field === "toppings") {
        if (!mentionsToppings(replyMessage)) return null;
        draft.toppings = parseCustomizationFromMessage(replyMessage).toppings;
    } else {
        return null;
    }

    const missing = nextMissingOrderField(draft);
    if (missing) return await askForMissingOrderField(draft, missing, { activeConversationId, userId, safeMessage });
    return await finalizeOrderDraft(draft, { activeConversationId, userId, safeMessage });
}
// ── End one-shot order slot-filling ────────────────────────────────────────

// Main chatbot entry point: detects intent (or multiple intents) in one message and
// routes it to the matching handler above, falling back to the Gemini AI reply.
// Renamed to *Core because the exported handleChatMessage (below, near module.exports) wraps this
// with a final language safety gate — kept separate so the multi-intent recursion below (which
// calls itself per-segment) isn't gated on every sub-segment, only once on the merged result.
async function handleChatMessageCore({ message, conversationId, userId, isQuickPrompt = false, skipMultiIntent = false, historyOverride = null }) {
    const safeMessage = String(message || "").trim();

    if (!safeMessage) {
        return {
            reply: "Please send a message.",
            system_action: { ui_navigation: "none" },
        };
    }

    const activeConversationId = conversationId || `guest-${Date.now()}`;
    const history = historyOverride || await ChatbotSession.getConversationHistory(activeConversationId);
    const recentHistory = history.slice(-6);

    // Detect language and translate to English for intent matching.
    // All keyword-matching functions only understand English, so non-English messages are
    // translated internally before intent detection. The original safeMessage is kept for
    // Gemini (which replies in the user's language via the system prompt instruction).
    const detectedLang = detectMessageLanguage(safeMessage);
    const intentMessage = detectedLang !== 'en'
        ? await aiClient.translateToEnglish(safeMessage).catch(() => safeMessage)
        : safeMessage;

    // Shorthand for localised short replies on non-Gemini paths.
    const t = (key) => REPLY_STRINGS[key]?.[detectedLang] ?? REPLY_STRINGS[key]?.en ?? key;

    // Moved up from just before the health-ranking branch so both it AND the compound
    // "recommend + navigate" branch below (which runs earlier, before isNavigationRequest) can use it.
    // True when the customer is mid-order and just adjusting their pending drink ("actually make it
    // less sugar") — that's a customization for the order flow below, not a request to rank the menu.
    const midOrderModifier =
        hasActiveOrderFlow(recentHistory) &&
        /\b(make it|change it|actually|instead|switch to)\b/.test(intentMessage.toLowerCase()) &&
        /\b(less|more|no|extra|half|quarter|zero|normal|regular|large|small|sugar|sweet|ice)\b/.test(intentMessage.toLowerCase());

    // Quick prompt button clicks bypass all hardcoded routes and go directly to Gemini.
    // The relevant drinks are still fetched from the DB and injected as context so Gemini
    // can write a natural response, while the frontend still receives the cards to render.
    if (isQuickPrompt) {
        return await handleQuickPromptWithGemini({ safeMessage, activeConversationId, userId, history: recentHistory });
    }

    // Try this reply against a pending one-shot-order draft before the full intent chain below.
    if (userId) {
        const pendingOrderDraft = await ChatbotSession.getPendingOrderDraft(activeConversationId);
        if (pendingOrderDraft) {
            const resumed = await continueOrderDraft(pendingOrderDraft, intentMessage, { activeConversationId, userId, safeMessage, history: recentHistory });
            if (resumed) return resumed;
            await ChatbotSession.clearPendingOrderDraft(activeConversationId); // not an answer — drop the stale draft
        }
    }

    // Escape hatch: after 2 consecutive unintelligible messages, proactively offer a human handoff
    // instead of letting the customer keep hitting a wall (category-E "missing escape hatch").
    if (looksUnintelligible(safeMessage)) {
        const streak = (gibberishStreak.get(activeConversationId) || 0) + 1;
        if (streak >= 2) {
            gibberishStreak.set(activeConversationId, 0);
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: HANDOFF_OFFER });
            return { reply: HANDOFF_OFFER, system_action: { ui_navigation: "none" } };
        }
        gibberishStreak.set(activeConversationId, streak);
    } else {
        gibberishStreak.delete(activeConversationId);
    }

    // Two or three requests in one message: run each through this same chain and merge the
    // results, so an action never gets dropped because an informational branch matched first.
    // English only for now — segments are split from the translated text, and feeding an
    // English fragment back in would answer a Malay/Chinese customer in the wrong language.
    if (!skipMultiIntent && detectedLang === 'en') {
        const segments = splitIntentSegments(intentMessage);
        if (segments.length >= 2) {
            const classified = segments
                .map((segment) => ({ segment, family: classifyIntentSegment(segment) }))
                .filter((entry) => entry.family);

            const chosen = [];
            const seenFamilies = new Set();
            for (const entry of classified) {
                if (seenFamilies.has(entry.family)) continue;
                seenFamilies.add(entry.family);
                chosen.push(entry);
                if (chosen.length === MAX_MERGED_INTENTS) break;
            }

            const families = chosen.map((entry) => entry.family);
            if (families.length >= 2 && !hasConflictingIntents(families)) {
                console.log("[ChatbotService] Multi-intent:", families.join(" + "));
                const results = [];
                for (const entry of chosen) {
                    results.push(await handleChatMessageCore({
                        message: entry.segment,
                        conversationId: activeConversationId,
                        userId,
                        skipMultiIntent: true,
                        historyOverride: history,
                    }));
                }
                return mergeIntentResults(results);
            }
        }
    }

    // Multi-intent: "recommend a low-sugar drink and take me to the menu page" style compound
    // requests. isNavigationRequest is checked first in the chain below (by design, so nav phrases
    // aren't swallowed by other intents), which meant the health-ranking recommendation half was
    // silently dropped whenever a navigation phrase was also present in the same message. Detect
    // the combination up front and answer both: real ranked drinks AND the actual page navigation.
    if (isNavigationRequest(intentMessage) && isHealthRankingQuery(intentMessage) && !midOrderModifier) {
        const [page, healthResult] = await Promise.all([
            generateNavigationResponse(intentMessage),
            buildHealthRankingReply(intentMessage, recentHistory, detectedLang),
        ]);

        const replyParts = [healthResult.reply];

        if (page) {
            const label = page.labels[detectedLang] || page.labels.en;
            const templateFn = NAV_REPLY_TEMPLATES[detectedLang] || NAV_REPLY_TEMPLATES.en;
            replyParts.push(templateFn(label));
        }

        const reply = replyParts.join("<br><br>");

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return {
            reply,
            recommendedDrinks: healthResult.recommendedDrinks,
            system_action: { ui_navigation: page ? page.route : "none" },
        };
    }

    // User Story #26: Navigate Website via Chatbot
    // Checked before every other intent so phrases like "lead me to Purchase history page"
    // aren't swallowed by isPurchaseHistory/isViewCartRequest, which also match "purchase history"/"cart".
    if (isNavigationRequest(intentMessage)) {
        const page = await generateNavigationResponse(intentMessage);

        // Heading to checkout ends the ordering flow — drop any half-finished drink
        // queue so it can't resurface after the purchase.
        if (page && (page.key === "checkout" || page.key === "cart")) {
            await ChatbotSession.clearPendingDrinks(activeConversationId);
        }

        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "user",
            content: safeMessage,
        });

        if (page) {
            const label = page.labels[detectedLang] || page.labels.en;
            const templateFn = NAV_REPLY_TEMPLATES[detectedLang] || NAV_REPLY_TEMPLATES.en;
            let reply = templateFn(label);

            // Also show the manual click-path, so voice-mode customers (or anyone who wants
            // to remember it for next time) know how to get there without the auto-navigation.
            const steps = PAGE_MANUAL_STEPS[page.key]?.[detectedLang] || PAGE_MANUAL_STEPS[page.key]?.en;
            if (steps) {
                const headingFn = NAV_STEPS_HEADING_TEMPLATES[detectedLang] || NAV_STEPS_HEADING_TEMPLATES.en;
                reply += `<br><br>${headingFn(label)}<br>${steps.replace(/\n/g, "<br>")}`;
            }

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                system_action: { ui_navigation: page.route },
            };
        }

        // Iterative flow: No Result Found — Gemini couldn't match a real page, fall back to a helpful reply.
        const fallback = t("navigationNotFound");

        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "assistant",
            content: fallback,
        });

        return {
            reply: fallback,
            system_action: { ui_navigation: "none" },
        };
    }
    // End of User Story #26

    // User Story #31: Ask About Nutri-Grade via chatbot
    if (isNutriGradeQuestion(intentMessage)) {
        const drink = await findDrinkByName(intentMessage);
        const orderDetails = parseOrderDetails(safeMessage);

        if (!drink) {
            const reply =
                "I do not have official nutrition data for that drink, so I cannot calculate the exact Nutri-Grade.<br><br>" +
                "If no sugar is added, it may be a healthier choice, but the final Nutri-Grade still depends on the drink's base sugar, milk, powder, and other ingredients.";

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "user",
                content: safeMessage,
            });

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                system_action: { ui_navigation: "none" },
            };
        }

        const nutrition = calculateNutrition(
            drink,
            orderDetails.sugar || "100%",
            orderDetails.toppings || []
        );

        const reply =
            `${drink.name} with ${orderDetails.sugar || "100%"} sugar has an estimated Nutri-Grade of ${nutrition.grade}.<br>` +
            `Sugar: ${nutrition.sugar}g | Calories: ${nutrition.calories} kcal<br><br>` +
            `0% or 25% sugar is a healthier option.`;

        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "user",
            content: safeMessage,
        });

        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "assistant",
            content: reply,
        });

        return {
            reply,
            system_action: { ui_navigation: "none" },
        };
    }
    // End of User Story #31

    // User Story #31 (extension): Browse drinks by Nutri-Grade letter — "I want a B grade drink".
    // Deterministic DB filter on nutritionInfo.nutriGrade, run before isRecommendationRequest /
    // isAddToCartRequest so Gemini never free-picks a blended set of grades for this query.
    if (isGradeFilterRequest(intentMessage)) {
        const requestedGrade = extractRequestedGrade(intentMessage);
        const allDrinks = await MenuItem.find({ status: "active" }).lean();
        const gradeDrinks = allDrinks.filter(
            (d) => String(d.nutritionInfo?.nutriGrade || "").toUpperCase() === requestedGrade
        );

        const reply = gradeDrinks.length > 0
            ? `Here are our Grade ${requestedGrade} drinks:`
            : `We don't currently have any Grade ${requestedGrade} drinks on the menu.`;

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return {
            reply,
            ...(gradeDrinks.length > 0 ? { recommendedDrinks: formatDrinkCards(gradeDrinks) } : {}),
            system_action: { ui_navigation: "none" },
        };
    }

    // User Story #32 (extension): Symptom-based recommendations — "I have a flu", "feeling bloated", etc.
    // Runs before the generic recommendation/health-ranking checks since phrases like
    // "what should I drink for a cough" would otherwise be caught by isRecommendationRequest.
    // Guarded against explicit ordering language / an active order flow so a clear order embedded
    // in an otherwise rambling or emotional message ("I'm so tired... just get me a Classic Milk
    // Tea with less sugar") is placed as an order instead of being hijacked into a fatigue
    // recommendation by the incidental symptom keyword (T25 fix — see hasExplicitOrderIntent).
    if (isSymptomRequest(intentMessage) && !hasExplicitOrderIntent(intentMessage) && !hasActiveOrderFlow(recentHistory)) {
        const category = detectSymptomCategory(intentMessage);
        const drinks = await getDrinksByItemIds(category.itemIds);

        const reply = `${category.intro}<br><br>${SYMPTOM_DISCLAIMER}`;

        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "user",
            content: safeMessage,
        });

        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "assistant",
            content: reply,
        });

        return {
            reply,
            recommendedDrinks: formatDrinkCards(drinks),
            system_action: { ui_navigation: "none" },
        };
    }

    // Health-condition questions ("I'm diabetic, what should I drink?", "safe during pregnancy?").
    // Always attach the medical disclaimer and never diagnose. For sugar-sensitive conditions we
    // also surface the real lowest-sugar drinks from the DB. Checked before isRecommendationRequest
    // so "what should I drink" phrasing can't slip past the disclaimer.
    if (isHealthConditionRequest(intentMessage)) {
        const condMsg = intentMessage.toLowerCase();
        // "what is diabetic?" just asks for a definition — it isn't a request for a drink, so
        // showing a drink list there reads as non-sequitur. Only surface the actual lowest-sugar
        // drinks when the message signals the customer wants a drink/recommendation; otherwise
        // fall through to the generic disclaimer-only reply below.
        const wantsDrinkIntent = /\b(drink|drinks|beverage|beverages|order|recommend|recommendation|suggest|suggestion|take|have|should i|can i|good for me|safe for me)\b/.test(condMsg);
        const isSugarSensitive = wantsDrinkIntent && SUGAR_SENSITIVE_KEYWORDS.some((k) => condMsg.includes(k));

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });

        if (isSugarSensitive) {
            const allDrinks = await MenuItem.find({ status: "active" }).lean();
            const withNutrition = allDrinks.filter((d) => d.base_sugar_g != null || d.nutritionInfo?.baseSugarG != null);
            const sorted = [...withNutrition].sort((a, b) => {
                const sa = a.base_sugar_g ?? a.nutritionInfo?.baseSugarG ?? 9999;
                const sb = b.base_sugar_g ?? b.nutritionInfo?.baseSugarG ?? 9999;
                return sa - sb;
            });
            const top = sorted.slice(0, 5);
            const reply = `Here are our lowest-sugar drinks you might prefer:<br><br>${HEALTH_CONDITION_DISCLAIMER}`;
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
            return {
                reply,
                recommendedDrinks: formatDrinkCards(top),
                system_action: { ui_navigation: "none" },
            };
        }

        const reply = `${HEALTH_CONDITION_DISCLAIMER}<br><br>I'd be glad to help you browse our menu, or point out lower-sugar and caffeine-free options if that helps — just let me know what you're in the mood for!`;
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
        return { reply, system_action: { ui_navigation: "none" } };
    }

    // Rating ranking query: "which beverage has the highest rating?", "best rated drink", etc.
    // Deterministic DB lookup (not Gemini-generated) so the answer is always accurate.
    if (isHighestRatedRequest(intentMessage)) {
        const allDrinks = await MenuItem.find({ status: "active" }).lean();
        const ratedDrinks = allDrinks.filter((d) => Number(d.rating || 0) > 0);

        if (ratedDrinks.length === 0) {
            const reply = "None of our drinks have been rated by customers yet — check back soon!";
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
            return { reply, system_action: { ui_navigation: "none" } };
        }

        const maxRating = Math.max(...ratedDrinks.map((d) => Number(d.rating || 0)));
        const topDrinks = ratedDrinks.filter((d) => Number(d.rating || 0) === maxRating).slice(0, 5);

        const reply = topDrinks.length === 1
            ? `Our highest-rated drink right now is ${topDrinks[0].name}, with a rating of ${maxRating.toFixed(1)} ★!`
            : `Our highest-rated drinks right now are tied at ${maxRating.toFixed(1)} ★: ${topDrinks.map((d) => d.name).join(", ")}.`;

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return {
            reply,
            recommendedDrinks: formatDrinkCards(topDrinks),
            system_action: { ui_navigation: "none" },
        };
    }

    // Health ranking query: "which beverage has lower sugar?", "healthiest drink", etc.
    // Skipped when the customer is mid-order and just adjusting their pending drink ("actually make
    // it less sugar") — that's a customization applied by the order flow below, not a request to
    // rank the whole menu by sugar.
    if (isHealthRankingQuery(intentMessage) && !midOrderModifier) {
        const { reply, recommendedDrinks } = await buildHealthRankingReply(intentMessage, recentHistory, detectedLang);

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return {
            reply,
            recommendedDrinks,
            system_action: { ui_navigation: "none" },
        };
    }

    // Nutrition fact lookup for a specific drink — "how much sugar is in Classic Milk Tea"
    if (isNutritionFactQuestion(intentMessage)) {
        const drink = await findDrinkByName(intentMessage);

        if (!drink) {
            const WHICH_DRINK = {
                en: "Which drink would you like the sugar and calorie details for?",
                zh: "您想了解哪款饮品的糖分和卡路里信息呢？",
                ms: "Minuman mana yang anda ingin tahu maklumat gula dan kalorinya?",
                ta: "எந்த பானத்தின் சர்க்கரை மற்றும் கலோரி விவரங்களை நீங்கள் அறிய விரும்புகிறீர்கள்?",
            };
            const reply = WHICH_DRINK[detectedLang] || WHICH_DRINK.en;
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
            return { reply, system_action: { ui_navigation: "none" } };
        }

        const sugarG = drink.base_sugar_g ?? drink.nutritionInfo?.baseSugarG ?? 0;
        const calKcal = drink.base_calories ?? drink.nutritionInfo?.baseCalories ?? 0;
        const grade = String(drink.nutri_grade || drink.nutritionInfo?.nutriGrade || "").toUpperCase();

        // Localized templates; numbers are interpolated as-is so translation can't corrupt them
        const NUTRITION_FACT_TEMPLATES = {
            en: `${drink.name} has ${sugarG}g of sugar and ${calKcal} kcal, with a Nutri-Grade of ${grade}.`,
            zh: `${drink.name} 含有 ${sugarG} 克糖和 ${calKcal} 千卡，营养等级为 ${grade}。`,
            ms: `${drink.name} mengandungi ${sugarG}g gula dan ${calKcal} kcal, dengan Nutri-Grade ${grade}.`,
            ta: `${drink.name} இல் ${sugarG}g சர்க்கரை மற்றும் ${calKcal} கலோரி உள்ளது, Nutri-Grade ${grade}.`,
        };
        const reply = NUTRITION_FACT_TEMPLATES[detectedLang] || NUTRITION_FACT_TEMPLATES.en;

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return { reply, system_action: { ui_navigation: "none" } };
    }

    // Multi-intent: "recommend a fruity drink and show my vouchers" style compound requests.
    // The dispatcher below is a strict sequential if/return chain, and isRecommendationRequest
    // itself defers to isVoucherRequest when both are present in one message (see its guard above)
    // — so previously only the voucher half ever ran and the recommendation was silently dropped.
    // Detect the combination up front and answer both halves in a single reply.
    if (userId && mentionsRecommendationCue(intentMessage) && isVoucherRequest(intentMessage)) {
        const [drinks, vouchers] = await Promise.all([
            MenuItem.recommendByMessage(intentMessage),
            getAvailableVouchers(userId),
        ]);

        const replyParts = [];
        let recommendedDrinks = [];
        let voucherCard = null;

        if (drinks.length > 0) {
            recommendedDrinks = formatDrinkCards(drinks);
            replyParts.push("Here are a few drinks you might love:");
        }

        if (vouchers.length > 0) {
            voucherCard = {
                title: t('voucherCardTitle'),
                vouchers: vouchers.map((v) => ({
                    code: v.code,
                    title: v.title,
                    description: v.description,
                    discountType: v.discountType,
                    discountValue: v.discountValue,
                    maxDiscount: v.maxDiscount,
                    minSpend: v.minSpend,
                })),
            };
            replyParts.push(
                `${t('voucherCardTitle')}<br><br>${t('exploreRewardsCta')}<br><br>` +
                `<button class="chat-nav-btn-compact" onclick="handleVouchers()">${t('exploreRewardsBtn')}</button>`
            );
        } else {
            replyParts.push(t('noVouchersAvailable'));
        }

        if (drinks.length > 0 || vouchers.length > 0) {
            const reply = replyParts.join("<br><br>");

            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

            return {
                reply,
                recommendedDrinks,
                voucherCard,
                system_action: { ui_navigation: "none" },
            };
        }
    }

    // User Story #32: Recommend beverages based on user message
    if (isRecommendationRequest(intentMessage)) {
        // "Hot" is an ice-level choice available on any drink at ordering time, not a searchable
        // drink attribute — checked BEFORE the keyword search below, not after, because a plain
        // substring search for "hot" can accidentally match an unrelated drink whose description
        // just happens to contain the word (e.g. "...perfect for a hot day"), which would otherwise
        // recommend a cold ice-blended drink for a "hot drink" request. Only short-circuits when no
        // other real flavour/drink word is present, so "recommend a hot matcha latte" still recommends matcha normally.
        const mentionsHot = /\bhot\b/i.test(intentMessage);
        const mentionsOtherFlavour = DRINK_ASSOCIATION_WORDS.some((w) => intentMessage.toLowerCase().includes(w));
        if (mentionsHot && !mentionsOtherFlavour) {
            const allDrinks = await MenuItem.find({ status: "active" }).lean();
            const featured = allDrinks
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 3);

            const reply =
                "We don't have a separate hot drinks menu — any of our drinks can be made hot, just choose the Hot option at the ice level step when ordering!<br><br>" +
                "Here are a few customer favourites to start with:";

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "user",
                content: safeMessage,
            });
            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                recommendedDrinks: formatDrinkCards(featured),
                system_action: { ui_navigation: "none" },
            };
        }

        let drinks = await MenuItem.recommendByMessage(intentMessage);

        // For non-English queries (Chinese/Malay), recommendByMessage won't match English menu names.
        // Map common foreign-language flavor words to English keywords and retry.
        if (drinks.length === 0) {
            const FLAVOR_MAP = {
                草莓: "strawberry", 蔓越莓: "cranberry", 抹茶: "matcha",
                茉莉: "jasmine", 乌龙: "oolong", 奶茶: "milk tea",
                拿铁: "latte", 芒果: "mango", 桃子: "peach", 柠檬: "lemon",
                荔枝: "lychee", 西瓜: "watermelon", 柚子: "grapefruit",
                strawberi: "strawberry", mangga: "mango", teh: "tea",
                matcha: "matcha", oolong: "oolong",
            };
            for (const [foreign, english] of Object.entries(FLAVOR_MAP)) {
                if (safeMessage.includes(foreign)) {
                    const fallback = await MenuItem.recommendByMessage(english);
                    if (fallback.length > 0) { drinks = fallback; break; }
                }
            }
        }

        const msg = safeMessage.toLowerCase();

        if (drinks.length > 0) {
            const msg = safeMessage.toLowerCase();
            const hasChinese = /[一-鿿]/.test(safeMessage);
            const hasMalay = /\b(nak|satu|mahu|ada|boleh|apa|yang|sedap|cadangan|rekomen)\b/i.test(safeMessage);

            let intro;
            if (hasChinese) {
                if (msg.includes("草莓") || msg.includes("蔓越莓")) intro = "为您推荐以下水果味饮品：";
                else if (msg.includes("抹茶"))                       intro = "以下是我们的抹茶系列：";
                else if (msg.includes("芒果"))                       intro = "以下是我们的芒果饮品：";
                else if (msg.includes("桃子"))                       intro = "以下是我们的桃子饮品：";
                else if (msg.includes("荔枝"))                       intro = "以下是我们的荔枝饮品：";
                else if (msg.includes("西瓜"))                       intro = "以下是我们的西瓜饮品：";
                else if (msg.includes("奶茶"))                       intro = "以下是我们的奶茶系列：";
                else                                                 intro = "以下是一些您可能会喜欢的饮品：";
            } else if (hasMalay) {
                if (msg.includes("strawberi"))  intro = "Berikut adalah pilihan minuman berperisa strawberi kami:";
                else if (msg.includes("matcha")) intro = "Berikut adalah pilihan matcha kami:";
                else if (msg.includes("mangga") || msg.includes("mango")) intro = "Berikut adalah minuman berperisa mango kami:";
                else                             intro = "Berikut adalah beberapa minuman yang mungkin anda suka:";
            } else {
                if (msg.includes("matcha")) {
                    intro = "Love that choice! Here are our matcha options:";
                } else if (msg.includes("strawberry") || msg.includes("cranberry")) {
                    intro = "Something fruity — nice! Here's what we have:";
                } else if (msg.includes("lychee")) {
                    intro = "A floral favourite! Here's our lychee option:";
                } else if (msg.includes("watermelon")) {
                    intro = "Refreshing pick! Here's our watermelon option:";
                } else if (msg.includes("grapefruit")) {
                    intro = "Great citrus choice — here's our grapefruit option:";
                } else if (msg.includes("mango")) {
                    intro = "Tropical vibes! Here are our mango drinks:";
                } else if (msg.includes("peach")) {
                    intro = "Sweet and juicy — here are our peach drinks:";
                } else if (msg.includes("lemon")) {
                    intro = "Something citrusy! Here's our lemon option:";
                } else if (msg.includes("jasmine")) {
                    intro = "Lovely choice — here are our jasmine drinks:";
                } else if (msg.includes("oolong")) {
                    intro = "Great taste — here are our oolong options:";
                } else if (msg.includes("osmanthus")) {
                    intro = "A floral favourite — here's what we have:";
                } else if (msg.includes("da hong bao") || msg.includes("da hong pao")) {
                    intro = "A premium pick — here's our Da Hong Pao option:";
                } else if (msg.includes("milk tea") || msg.includes("milktea")) {
                    intro = "Classic milk tea — here's our range:";
                } else if (msg.includes("ice blended")) {
                    intro = "Something icy and refreshing — here's what we've got:";
                } else if (msg.includes("fruit tea")) {
                    intro = "Fresh and fruity — here are our fruit tea options:";
                } else if (msg.includes("latte")) {
                    intro = "Here are our latte options:";
                } else {
                    intro = "Here are some drinks you might love:";
                }
            }

            const reply = intro;

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "user",
                content: safeMessage,
            });

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                recommendedDrinks: formatDrinkCards(drinks),
                system_action: { ui_navigation: "none" },
            };
        }

        // Only dead-end when the customer actually named a flavour or drink we couldn't
        // match. A bare "recommend something" names nothing, so it falls through to the
        // top-rated list below — which was unreachable while this block always returned.
        const namedSomethingSpecific =
            Boolean(resolveDrinkNameFromMessage(msg)) ||
            DRINK_ASSOCIATION_WORDS.some((word) => msg.includes(word));

        if (namedSomethingSpecific) {
            const reply = "Hmm, I couldn't find a drink matching that. Can I help you find something else?";

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "user",
                content: safeMessage,
            });

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                recommendedDrinks: [],
                system_action: { ui_navigation: "none" },
            };
        }

        // Generic recommendation with no specific category matched (e.g. "What should I try today?")
        // → inject top-rated drinks as context and let Gemini generate a natural reply + return drink cards.
        const allDrinks = await MenuItem.find({ status: "active" }).lean();
        if (allDrinks.length > 0) {
            const featured = allDrinks
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 5);

            const drinkContext = featured.map((d) =>
                `- ${d.name} (${d.category}, S$${Number(d.price).toFixed(2)})` +
                (DRINK_TAGLINES[d.itemId] ? `: ${DRINK_TAGLINES[d.itemId]}` : "")
            ).join("\n");

            const contextPrompt = `The customer asked: "${safeMessage}"\n\nTop-rated drinks available:\n${drinkContext}\n\nRecommend 2-3 of these drinks naturally in 1-2 sentences. Do not list prices or item IDs.`;
            const systemPrompt = await buildSystemPrompt(safeMessage, "", detectedLang);
            const reply = await aiClient.generateText(contextPrompt, recentHistory, systemPrompt);

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "user",
                content: safeMessage,
            });

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                recommendedDrinks: formatDrinkCards(featured),
                system_action: { ui_navigation: "none" },
            };
        }
    }

    // User Story #203: Track current order status via chatbot
    // Multi-intent: "track my order and show my order history" style compound requests.
    // isTrackOrderRequest is checked before isPurchaseHistory below, so the history half used to
    // be silently dropped. The frontend's orderStatusCard and purchaseHistory card are mutually
    // exclusive within one message (see ChatbotSidebar.tsx), so this answers both intents through
    // a single purchaseHistory card — which already includes each order's status — plus a text
    // sentence calling out the current in-progress order, rather than trying to render two cards.
    // An explicit request for a person. HANDOFF_OFFER is not reused here — its wording
    // ("I'm having trouble understanding you") belongs to the gibberish escape hatch.
    if (isHumanAgentRequest(intentMessage)) {
        const reply =
            "Of course — our team can take it from here. " +
            "Email **yiyuanzhuan@driptea.com** or WhatsApp **+6123 4567** and someone will get back to you. " +
            "If it's about a specific order, include the order number and they'll find it faster.";
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
        return { reply, system_action: { ui_navigation: "none" } };
    }

    // Cancelling a placed order. There is no customer-facing cancel API — staff change the
    // status — so this hands over to the team instead of pretending to cancel anything.
    if (isOrderCancellationRequest(intentMessage)) {
        const reply =
            "I can't cancel an order that's already been placed — our store team handles that. " +
            "Email **yiyuanzhuan@driptea.com** or WhatsApp **+6123 4567** with your order number and they'll sort it out for you. " +
            "If you only wanted to empty your cart, just say \"clear my cart\".";
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
        return { reply, system_action: { ui_navigation: "none" } };
    }

    // Delivery coverage/fee and accepted payment methods — previously nothing matched these,
    // so they fell through to Gemini and came back as "email our team".
    if (isDeliveryOrPaymentQuestion(intentMessage)) {
        const reply =
            "We offer both <strong>pickup</strong> and <strong>delivery</strong>.<br><br>" +
            "For delivery, you pick your address at checkout and the fee is worked out from how far it is from the outlet " +
            "— S$3.00 base plus S$0.50 per km, shown before you pay. Pickup has no delivery fee.<br><br>" +
            "Payment is by card at checkout. If you need to check whether we reach a specific address, " +
            "enter it at the delivery step and the fee will appear if we can get to you.";
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
        return { reply, system_action: { ui_navigation: "none" } };
    }

    if (isTrackOrderRequest(intentMessage) && isPurchaseHistory(intentMessage) && !isFeedbackRequest(intentMessage)) {
        if (!userId) {
            return { reply: t('loginForHistory'), system_action: { ui_navigation: "none" } };
        }

        const [activeOrders, allOrders] = await Promise.all([
            getOrderStatus(userId),
            Payment.getPurchaseHistory(userId),
        ]);

        if (!allOrders.length) {
            const reply = t('noHistory');
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
            return { reply, system_action: { ui_navigation: "none" } };
        }

        const ACTIVE_STATUSES = new Set(["pending", "paid", "preparing", "ready"]);
        const activeOrder = activeOrders.find((o) => ACTIVE_STATUSES.has(o.status));

        const STATUS_PHRASES = {
            pending: "awaiting confirmation",
            paid: "queued for preparation",
            preparing: "being prepared by our baristas",
            ready: "ready for collection",
            completed: "completed",
            cancelled: "cancelled",
        };
        const DELIVERY_STATUS_PHRASES = {
            pending: "awaiting confirmation",
            paid: "queued for preparation",
            preparing: "being prepared by our baristas",
            ready: "out for delivery",
            completed: "delivered",
            cancelled: "cancelled",
        };

        const activePhrases = activeOrder?.orderType === "delivery" ? DELIVERY_STATUS_PHRASES : STATUS_PHRASES;
        const statusSentence = activeOrder
            ? `Your order <strong>#${activeOrder.orderNo}</strong> is currently ${activePhrases[activeOrder.status] || activeOrder.status}.`
            : "You don't have any order in progress right now.";

        const recentOrders = allOrders.slice(0, 5);
        const reply = `${statusSentence}<br><br>Here's your recent order history:`;

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return {
            reply,
            purchaseHistory: {
                title: "Your Order History",
                orders: recentOrders.map((order) => ({
                    orderNo: order.displayOrderNo || order.orderNo,
                    status: order.status,
                    paymentStatus: order.paymentStatus || "Paid",
                    items: order.items.map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
                        customization: item.customization || {},
                        lineTotal: Number(item.lineTotal || 0),
                    })),
                    totalAmount: Number(order.totalAmount || 0),
                })),
            },
            system_action: { ui_navigation: "none" },
        };
    }

    if (isTrackOrderRequest(intentMessage) && !isFeedbackRequest(intentMessage)) {
        if (!userId) {
            return {
                reply: "Please log in to track your order status.",
                system_action: { ui_navigation: "none" },
            };
        }

        const requestedOrderNo = extractOrderNoFromMessage(intentMessage);
        const orders = await getOrderStatus(userId, requestedOrderNo);

        const STATUS_LABELS = {
            pending:    "Pending — your order has been placed and is waiting to be confirmed.",
            paid:       "Paid — payment received, waiting to be prepared.",
            preparing:  "Preparing — our baristas are making your order right now.",
            ready:      "Ready — your order is ready for collection!",
            completed:  "Completed — order has been collected.",
            cancelled:  "Cancelled.",
        };
        const DELIVERY_STATUS_LABELS = {
            pending:    "Pending — your delivery order has been placed and is waiting to be confirmed.",
            paid:       "Paid — payment received, waiting to be prepared.",
            preparing:  "Preparing — our baristas are making your order right now.",
            ready:      "Out for delivery — your order has left the store and is on its way to you!",
            completed:  "Delivered — your order has been delivered to your address.",
            cancelled:  "Cancelled.",
        };

        // "Current" means still in progress — not yet collected or cancelled.
        const ACTIVE_STATUSES = new Set(["pending", "paid", "preparing", "ready"]);
        const hasActiveOrder = orders.some((o) => ACTIVE_STATUSES.has(o.status));

        // If there's a current (active) order, show ONLY that order as a structured status
        // card (matching the 3-step "Order sent / Drinks in Progress / Collection!" widget) —
        // no need to also list other past orders alongside it.
        const activeOrder = orders.find((o) => ACTIVE_STATUSES.has(o.status));

        if (activeOrder) {
            const orderStatusCard = buildOrderStatusCard(activeOrder, detectedLang);

            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: orderStatusCard.message });

            return {
                reply: orderStatusCard.message,
                orderStatusCard,
                system_action: { ui_navigation: "none" },
            };
        }

        const noCurrentOrderNote = (!requestedOrderNo && orders.length > 0 && !hasActiveOrder)
            ? "\n\nNote: The customer has NO current order in progress right now (nothing pending, paid, preparing, or ready) — every order below has already been completed or cancelled. Explicitly tell the customer they have no current order before showing this past order history."
            : "";

        const orderContext = orders.length === 0
            ? (requestedOrderNo
                ? `The customer asked about order #${requestedOrderNo}, but no such order exists for this account.`
                : "No order is found. The customer has no current or past orders on record.")
            : `[LIVE ORDER DATA — use this as the authoritative current status. Ignore any order status mentioned earlier in the conversation.]\n\nCustomer's ${requestedOrderNo ? "requested order" : "recent orders (most recent first)"}:\n` +
            orders.map((o, i) => {
                const itemList = (o.items || []).map(it => `  • ${it.name} x${it.quantity}`).join("\n") || "  (no item details)";
                const isDelivery = o.orderType === "delivery";
                const label = (isDelivery ? DELIVERY_STATUS_LABELS : STATUS_LABELS)[o.status] || o.status;
                const deliveryLine = isDelivery && o.deliveryDetails?.customerAddress
                    ? `\nDelivering to: ${o.deliveryDetails.customerAddress}`
                    : "";
                return `Order ${i + 1}: #${o.orderNo} (${isDelivery ? "delivery" : "pickup"}) — ${label} — Total: S$${Number(o.totalAmount || 0).toFixed(2)}${deliveryLine}\nItems:\n${itemList}`;
            }).join("\n\n") + noCurrentOrderNote;

        const systemPrompt = await buildSystemPrompt(safeMessage, orderContext, detectedLang);
        const reply = await aiClient.generateText(safeMessage, recentHistory, systemPrompt)

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return {
            reply,
            system_action: { ui_navigation: "none" },
        };
    }
    // End of User Story #203

    // User Story #202: Check available vouchers via chatbot
    if (isVoucherRequest(intentMessage)) {
        if (!userId) {
            return {
                reply: t('loginForVouchers'),
                system_action: { ui_navigation: "none" },
            };
        }

        const vouchers = await getAvailableVouchers(userId);

        // Deterministic, not Gemini-generated — same reasoning as the #203 order status card:
        // guarantees the voucher list (code, description, minimum spend) is always accurate and
        // always shown, and sidesteps the duplicate/paraphrased-CTA issue Gemini free-text had.
        if (vouchers.length === 0) {
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: t('noVouchersAvailable') });

            return {
                reply: t('noVouchersAvailable'),
                system_action: { ui_navigation: "none" },
            };
        }

        const voucherCard = {
            title: t('voucherCardTitle'),
            vouchers: vouchers.map((v) => ({
                code: v.code,
                title: v.title,
                description: v.description,
                discountType: v.discountType,
                discountValue: v.discountValue,
                maxDiscount: v.maxDiscount,
                minSpend: v.minSpend,
            })),
        };

        // Vouchers page link always appears, and always in the correct language via REPLY_STRINGS —
        // Display a button to view all vouchers
        const reply =
            `${t('voucherCardTitle')}<br><br>${t('exploreRewardsCta')}<br><br>` +
            `<button class="chat-nav-btn-compact" onclick="handleVouchers()">${t('exploreRewardsBtn')}</button>`;

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: t('voucherCardTitle') });

        return {
            reply,
            voucherCard,
            system_action: { ui_navigation: "none" },
        };
    }
    // End of User Story #202

    // Custom-discount negotiation
    if (isDiscountNegotiation(intentMessage)) {
        const reply =
            "I'm not able to apply custom discounts, but we do have vouchers you can use! " +
            "Tap below to see what's available.<br><br>" +
            `<button class="chat-nav-btn-compact" onclick="handleVouchers()">Explore Vouchers</button>`;
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
        return { reply, system_action: { ui_navigation: "none" } };
    }

    // Tax / GST question
    if (isTaxQuestion(intentMessage)) {
        const reply =
            "For questions about tax or GST on our pricing, I'd recommend checking with our team directly — " +
            "email **yiyuanzhuan@driptea.com** or WhatsApp **+6123 4567** and they'll confirm the details for you.";
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
        return { reply, system_action: { ui_navigation: "none" } };
    }

    // Store location/hours
    if (isStoreInfoRequest(intentMessage)) {
        const stores = await Store.getActiveStores();

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });

        if (!stores.length) {
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: t('noStoresAvailable') });
            return {
                reply: t('noStoresAvailable'),
                system_action: { ui_navigation: "none" },
            };
        }

        const relevantStores = filterStoresByMention(stores, intentMessage);

        const storeContext = relevantStores.map((s) =>
            `- ${s.name}\n  Address: ${s.address}\n  Phone: ${s.phone || "N/A"}\n  ` +
            `Hours: Mon-Fri ${s.openingHours?.weekday || "-"}, Sat-Sun ${s.openingHours?.weekend || "-"}`
        ).join("\n");

        const contextPrompt =
            `The customer asked: "${safeMessage}"\n\nHere is the current, up-to-date list of our store locations:\n${storeContext}\n\n` +
            `Write a short, friendly 1-2 sentence reply acknowledging their question. ` +
            `Do NOT list out the address, phone number, or opening hours in your reply — that information is already shown to the customer in visual cards right below your message, so repeating it would be redundant. ` +
            `You may mention the store name(s) by name, but nothing more specific than that.`;
        const systemPrompt = await buildSystemPrompt(safeMessage, "", detectedLang);
        const reply = await aiClient.generateText(contextPrompt, recentHistory, systemPrompt);

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        const storeCards = relevantStores.map((s) => ({
            name: s.name,
            address: s.address,
            phone: s.phone || "",
            weekdayHours: s.openingHours?.weekday || "-",
            weekendHours: s.openingHours?.weekend || "-",
            image: STORE_OUTLET_IMAGES[s.name] || null,
        }));

        return {
            reply,
            storeCards,
            system_action: { ui_navigation: "none" },
        };
    }
    // End of store location/hours intent

    // User Story #198: View Purchase History
    if (isReorderPurchaseHistoryRequest(intentMessage)) {
        if (!userId) {
            return {
                reply: t('loginForReorder'),
                system_action: { ui_navigation: "none" },
            };
        }

        const allOrders = await Payment.getPurchaseHistory(userId);

        if (!allOrders.length) {
            return {
                reply: "You don't have any purchase history yet, so I can't reorder anything right now.",
                system_action: { ui_navigation: "none" },
            };
        }

        const dateQuery = extractDateFromMessage(intentMessage);
        const matchedOrders = findOrdersByDateQuery(allOrders, dateQuery);

        if (!matchedOrders.length) {
            return {
                reply: "I couldn't find any matching order in your purchase history.",
                system_action: { ui_navigation: "none" },
            };
        }

        const addedItems = [];
        const skippedItems = [];

        for (const order of matchedOrders) {
            for (const item of order.items || []) {
                const drink = await findDrinkByName(item.name);

                if (!drink) {
                    skippedItems.push(item.name);
                    continue;
                }

                const customization = item.customization || {};
                const quantity = Number(item.quantity || 1);

                const cartItem = await CartItem.addToCart(userId, drink.itemId, {
                    quantity,
                    customization,
                });

                addedItems.push(cartItem);
            }
        }

        const cartItems = await CartItem.getCart(userId);

        if (!addedItems.length) {
            return {
                reply: "I found your previous order, but I couldn't match the drinks to the current menu.",
                system_action: { ui_navigation: "none" },
            };
        }

        const addedSummary = addedItems
            .map((item, index) => {
                const c = item.customization || {};
                const toppings =
                    Array.isArray(c.toppings) && c.toppings.length > 0
                        ? c.toppings.map((t) => String(t).replace(/\s*\(\+S\$[\d.]+\)/g, "").trim()).join(", ")
                        : "No toppings";

                const details = [
                    c.size || "Regular",
                    c.ice || "Normal Ice",
                    c.sugar || "Normal Sweet",
                    toppings,
                ].join(" · ");

                return `${index + 1}. <strong>${item.name}</strong> × ${item.quantity}<br>${details}<br>S$ ${Number(item.lineTotal || 0).toFixed(2)}`;
            })
            .join("<br><br>");

        let reply =
            `Done! I've added your previous order items to your cart.<br><br>` +
            addedSummary;

        if (skippedItems.length > 0) {
            reply +=
                `<br><br>I skipped these because they are no longer found in the current menu:<br>` +
                skippedItems.join(", ");
        }

        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "user",
            content: safeMessage,
        });

        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "assistant",
            content: reply,
        });

        return {
            reply,
            cartUpdate: buildCartUpdatePayload(cartItems, "Done! I've added your previous order items to your cart."),
            showViewCart: true,
            system_action: { ui_navigation: "none" },
        };
    }

    if (isPurchaseHistory(intentMessage) && !isFeedbackRequest(intentMessage)) {
        if (!userId) {
            return {
                reply: t('loginForHistory'),
                system_action: { ui_navigation: "none" },
            };
        }

        const allOrders = await Payment.getPurchaseHistory(userId);

        if (!allOrders.length) {
            return {
                reply: t('noHistory'),
                system_action: { ui_navigation: "none" },
            };
        }

        // Check if the customer is asking about a specific date
        const dateQuery = extractDateFromMessage(intentMessage);
        let reply = "";
        let matchedOrders = [];
        let title = "";

        if (dateQuery) {
            const currentYear = new Date().getFullYear();

            if (dateQuery.rangeStart && dateQuery.rangeEnd) {
                // Week range
                matchedOrders = allOrders.filter((order) => {
                    const d = new Date(order.createdAt || order.orderDate);
                    return d >= dateQuery.rangeStart && d <= dateQuery.rangeEnd;
                });
                const label = dateQuery.label || "that period";
                title = `Your Orders — ${label}`;
                reply = matchedOrders.length
                    ? `Here are your orders from ${label}.`
                    : `I couldn't find any orders from ${label}.`;

            } else if (dateQuery.monthOnly) {
                // Month (+ optional year) filter
                const targetYear = dateQuery.year || null;
                matchedOrders = allOrders.filter((order) => {
                    const d = new Date(order.createdAt || order.orderDate);
                    const monthMatch = d.getMonth() === dateQuery.month;
                    return targetYear ? monthMatch && d.getFullYear() === targetYear : monthMatch;
                });
                const monthLabel = new Date(2000, dateQuery.month, 1).toLocaleString("default", { month: "long" });
                const periodLabel = targetYear ? `${monthLabel} ${targetYear}` : (dateQuery.label || monthLabel);
                title = `Your Orders — ${periodLabel}`;
                reply = matchedOrders.length
                    ? `Here are your orders from ${periodLabel}.`
                    : `I couldn't find any orders from ${periodLabel} in your history.`;

            } else {
                // Specific day
                const { day, month } = dateQuery;
                const monthLabel = new Date(2000, month, 1).toLocaleString("default", { month: "long" });

                if (dateQuery.year) {
                    matchedOrders = allOrders.filter((order) => {
                        const d = new Date(order.createdAt || order.orderDate);
                        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === dateQuery.year;
                    });
                } else {
                    // Try current year first, then previous year
                    for (const year of [currentYear, currentYear - 1]) {
                        matchedOrders = allOrders.filter((order) => {
                            const d = new Date(order.createdAt || order.orderDate);
                            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
                        });
                        if (matchedOrders.length) break;
                    }
                }

                title = matchedOrders.length > 1
                    ? `Your Orders on ${day} ${monthLabel}`
                    : `Your Order on ${day} ${monthLabel}`;
                reply = matchedOrders.length
                    ? (matchedOrders.length > 1
                        ? `I found ${matchedOrders.length} orders on ${day} ${monthLabel}.`
                        : `Here's your order from ${day} ${monthLabel}.`)
                    : `I couldn't find any orders from ${day} ${monthLabel} in your history.`;
            }

            if (!matchedOrders.length) {
                await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
                await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
                return { reply, system_action: { ui_navigation: "none" } };
            }

        } else {
            // No date — return most recent order
            matchedOrders = [allOrders[0]];
            title = t('purchaseRecentTitle');
            reply = t('purchaseRecent');
        }

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return {
            reply,
            purchaseHistory: {
                title,
                orders: matchedOrders.map((order) => ({
                    orderNo: order.displayOrderNo || order.orderNo,
                    status: order.status,
                    paymentStatus: order.paymentStatus || "Paid",
                    items: order.items.map((item) => ({
                        name: item.name,
                        quantity: item.quantity,
                        customization: item.customization || {},
                        lineTotal: Number(item.lineTotal || 0),
                    })),
                    totalAmount: Number(order.totalAmount || 0),
                })),
            },
            system_action: { ui_navigation: "none" },
        };
    }
    // End of #198

    // User Story #199: Multi-item add-to-cart
    // "I want X with less ice and have another Y with regular sugar"
    if (isMultiItemOrder(intentMessage) && isAddToCartRequest(intentMessage)) {
        const segments = splitMultiItemOrder(intentMessage);

        if (segments.length >= 2) {
            if (!userId) {
                return {
                    reply: t('loginForCartMulti'),
                    system_action: { ui_navigation: "none" },
                };
            }

            const addedItems = [];
            let lastBeverageId = null;
            // Shared customization from "both regular, less ice, ..." applies to all segments
            // that don't carry their own customization keywords.
            const bothCustomization = extractBothCustomization(intentMessage);

            for (const segment of segments) {
                let beverageId = await resolveBeverageId(segment);

                if (!beverageId) {
                    // Ambiguous-but-real reference within this segment ("...and a green tea") —
                    // ask which one instead of silently reusing whichever drink the previous
                    // segment in this same message happened to resolve to.
                    const ambiguousMatches = await findAmbiguousMenuMatches(segment);
                    if (ambiguousMatches) {
                        const reply = `We have a few options for "${segment.trim()}": ${ambiguousMatches.join(", ")} — which one would you like? You can add the rest of your order after.`;
                        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
                        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
                        return { reply, system_action: { ui_navigation: "none" } };
                    }
                    beverageId = lastBeverageId;
                }
                if (!beverageId) continue;
                lastBeverageId = beverageId;

                const segHasOwnCustomization = hasCustomizationWords(segment.toLowerCase());
                const customization = (bothCustomization && !segHasOwnCustomization)
                    ? bothCustomization
                    : parseCustomizationFromMessage(segment);
                const cartItem = await CartItem.addToCart(userId, beverageId, { quantity: 1, customization });
                const menuItem = await MenuItem.findOne({ itemId: beverageId }).lean();
                cartItem.drinkInfo = menuItem;
                cartItem.menuItemCode = beverageId;
                addedItems.push({ cartItem, customization, menuItem });
            }

            if (addedItems.length === 0) {
                return {
                    reply: "I couldn't find the drinks you mentioned. Could you let me know which drinks you'd like?",
                    system_action: { ui_navigation: "none" },
                };
            }

            const allCartItems = await CartItem.getCart(userId);
            const cartTotal = allCartItems.reduce((sum, i) => sum + Number(i.lineTotal || 0), 0);

            const lines = addedItems.map(({ cartItem, customization }) => {
                const toppings =
                    Array.isArray(customization.toppings) && customization.toppings.length > 0
                        ? customization.toppings.join(", ")
                        : "No toppings";
                return (
                    `<strong>${cartItem.name}</strong><br>` +
                    `${customization.size} · ${customization.ice} · ${customization.sugar} · ${toppings}<br>` +
                    `S$ ${Number(cartItem.lineTotal || cartItem.unitPrice || 0).toFixed(2)}`
                );
            });

            const reply =
                `Done! I've added ${addedItems.length} item${addedItems.length > 1 ? "s" : ""} to your cart.<br><br>` +
                lines.join("<br><br>");

            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

            const first = addedItems[0];
            const firstNutrition = first.menuItem
                ? calculateNutrition(first.menuItem, first.customization.sugar, first.customization.toppings)
                : null;

            return {
                reply,
                system_action: { ui_navigation: "none" },
                showViewCart: true,
                orderReceipt: {
                    drink: {
                        name: first.cartItem.name,
                        price: first.cartItem.unitPrice,
                        image: first.cartItem.image || (/^b\d{3}$/.test(first.cartItem.menuItemCode) ? `/img/bubble_teas/${first.cartItem.menuItemCode}.jpg` : "/img/bubble_teas/b001.jpg"),
                    },
                    customization: first.customization,
                    nutrition: firstNutrition,
                    recommendedNutrition:
                        firstNutrition && (firstNutrition.grade === "C" || firstNutrition.grade === "D")
                            ? calculateNutrition(first.menuItem, "25% Sugar", first.customization.toppings || [])
                            : null,
                    cartItems: allCartItems.map(i => ({ name: i.name, quantity: i.quantity, lineTotal: i.lineTotal })),
                    total: cartTotal,
                    lang: detectMessageLanguage(safeMessage),
                },
            };
        }
    }
    // End of multi-item #199

    // User Story #199: Add to Cart Intent
    if (isAddToCartRequest(intentMessage)) {
        if (!userId) {
            return {
                reply: t('loginForCart2'),
                system_action: { ui_navigation: "none" },
            };
        }

        // #199 - If the customer did not specify any customisation (size / ice / sugar / toppings),
        if (!hasCustomizationWords(intentMessage)) {
            // falls through to the Gemini handler below
        } else {

        // Reject, don't default — 0/25/50/100 are the only real sugar levels.
        const invalidSugar = findInvalidSugarPercent(intentMessage);
        if (invalidSugar !== null) {
            const reply = `Sorry, ${invalidSugar}% sugar isn't one of our sugar level options. We offer 0%, 25%, 50%, or 100% sugar — which would you like?`;
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
            return { reply, system_action: { ui_navigation: "none" } };
        }

        let beverageId = await resolveBeverageId(intentMessage);

        if (!beverageId) {
            // Ambiguous-but-real drink reference ("green tea") — ask which one instead of
            // silently falling back to an unrelated drink from earlier in the conversation.
            const ambiguousMatches = await findAmbiguousMenuMatches(intentMessage);
            if (ambiguousMatches) {
                const reply = `We have a few options for that: ${ambiguousMatches.join(", ")} — which one would you like?`;
                await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
                await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
                return { reply, system_action: { ui_navigation: "none" } };
            }

            const lastDrinkName = resolveLastDrinkFromHistory(history);
            if (lastDrinkName) {
                beverageId = await resolveBeverageId(lastDrinkName);
            }
        }

        const draft = {
            beverageId: beverageId || null,
            size: parseSizeMention(intentMessage),
            ice: parseIceMention(intentMessage),
            sugar: parseSugarLevel(intentMessage),
            toppings: mentionsToppings(intentMessage) ? parseCustomizationFromMessage(intentMessage).toppings : null,
            quantity: parseQuantityFromMessage(intentMessage),
        };

        const missing = nextMissingOrderField(draft);
        if (missing) {
            return await askForMissingOrderField(draft, missing, { activeConversationId, userId, safeMessage });
        }

        return await finalizeOrderDraft(draft, { activeConversationId, userId, safeMessage });

        } // end else (has customization)
    }
    // End of #199

    // User Story #200: View Cart Intent
    if (isViewCartRequest(intentMessage)) {
        if (!userId) {
            return {
                reply: t('loginForCart'),
                system_action: { ui_navigation: "none" },
            };
        }

        const { cartItems, cartSummaryHtml, cartTotal } = await buildCartSummary(userId);

        if (!cartItems.length) {
            const emptyMsg = t('emptyCart');
            return {
                reply: emptyMsg,
                cartUpdate: buildCartUpdatePayload([], emptyMsg),
                system_action: { ui_navigation: "none" },
            };
        }

        const viewCartMsg = t('viewCart');
        return {
            reply: viewCartMsg,
            cartUpdate: buildCartUpdatePayload(cartItems, viewCartMsg),
            system_action: { ui_navigation: "none" },
        };
    }

    // User Story #201: Clear entire cart through chatbot
    if (isClearCartRequest(intentMessage)) {
        if (!userId) {
            return {
                reply: t('loginForCartClear'),
                system_action: { ui_navigation: "none" },
            };
        }
        const allItems = await CartItem.getCart(userId);
        await Promise.all(allItems.map(item => CartItem.removeFromCart(item._id)));
        // The queue belongs to the order that was just abandoned.
        await ChatbotSession.clearPendingDrinks(activeConversationId);
        const reply = t('cartCleared');
        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "user",
            content: safeMessage,
        });
        await ChatbotSession.appendToConversation(activeConversationId, userId, {
            role: "assistant",
            content: reply,
        });
        return {
            reply,
            cartUpdate: buildCartUpdatePayload([], "Your cart has been cleared."),
            system_action: { ui_navigation: "none" },
        };
    }

    // #201 - Edit cart item through chatbot.
    if (isCartUpdateRequest(intentMessage) && !midOrderModifier) {
        if (!userId) {
            return {
                reply: t('loginForCartEdit'),
                system_action: { ui_navigation: "none" },
            };
        }

        const intent = getCartUpdateIntent(intentMessage);

        // Same guard as the add-to-cart path — "change to 33% sugar" must be rejected, not
        // silently ignored (leaving newCustomization.sugar empty and falling through to the
        // generic "what would you like to do?" reply as if nothing was said).
        const invalidSugar = findInvalidSugarPercent(intentMessage);
        if (invalidSugar !== null) {
            const reply = `Sorry, ${invalidSugar}% sugar isn't one of our sugar level options. We offer 0%, 25%, 50%, or 100% sugar — which would you like?`;
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
            return { reply, system_action: { ui_navigation: "none" } };
        }

        const ordinalForDisambig = extractOrdinalIndex(intentMessage);
        const hasExplicitEditVerb = /\b(remove|delete|increase|decrease|add one more|add another|plus one|minus one|change|switch|update|edit|modify)\b/i.test(intentMessage);
        if (intent.action === "updateCustomization" && !hasExplicitEditVerb && ordinalForDisambig >= 0) {
            const lastUserMsg = [...history].reverse().find(m => m.role === "user");
            if (lastUserMsg) {
                const lastContent = String(lastUserMsg.content || "");
                const lastIntent = getCartUpdateIntent(lastContent);
                // Restore action (increase / decrease / remove) from previous message
                if (lastIntent.action !== "updateCustomization") {
                    intent.action = lastIntent.action;
                    intent.quantityDelta = lastIntent.quantityDelta;
                }
                // Restore drink name if not already resolved from current message
                if (!intent.targetName) {
                    const lastDrink = resolveDrinkNameFromMessage(lastContent);
                    if (lastDrink) intent.targetName = lastDrink;
                }
            }
        }

        let cartItems = await CartItem.getCart(userId);

        let targetItem = null;

        if (intent.action === "increase" || intent.action === "decrease") {
            if (intent.targetName) {
                // Drink name specified — find it directly, don't rely on history
                const named = cartItems.filter(
                    item => String(item.name || "").toLowerCase() === intent.targetName.toLowerCase()
                );
                if (named.length === 1) targetItem = named[0];
                // If multiple same-name items, fall through to ordinal/general resolution below
            } else {
                // No name — fall back to last item touched in conversation
                const lastCartItemId = resolveLastCartItemIdFromHistory(history);
                if (lastCartItemId) {
                    targetItem = cartItems.find(
                        item => String(item._id) === String(lastCartItemId)
                    );
                }
            }
        }

        if (!targetItem) {
            const ordinalIndex = extractOrdinalIndex(intentMessage);

            if (ordinalIndex >= 0) {
                const drinkNameInMsg = resolveDrinkNameFromMessage(intentMessage);
                const isFullCartRef =
                    !drinkNameInMsg &&
                    /\b(drink|item|order)\b/i.test(intentMessage) &&
                    !/\bone\b/i.test(intentMessage);

                if (intent.targetName && !isFullCartRef) {
                    // "the second strawberry matcha" / "the first one" → ordinal within same-name items
                    const namedItems = cartItems.filter(
                        item => String(item.name || "").toLowerCase() === intent.targetName.toLowerCase()
                    );
                    if (ordinalIndex < namedItems.length) {
                        targetItem = namedItems[ordinalIndex];
                    } else if (namedItems.length === 1 && Number(namedItems[0].quantity || 1) > ordinalIndex) {
                        // Ordinal targets a unit within a merged qty>1 item.
                        // e.g. "second cranberry matcha" where both were stored as one doc with quantity:2.
                        // The split logic below will separate just the targeted unit.
                        targetItem = namedItems[0];
                    } else if (ordinalIndex < cartItems.length) {
                        // Named-items ordinal out of bounds (e.g. "the third one" but only 2 SMTs) —
                        // fall back to full-cart position so the user isn't stuck in a loop.
                        targetItem = cartItems[ordinalIndex];
                    }
                } else if (ordinalIndex < cartItems.length) {
                    // "the third drink" / "the third item" → ordinal across the full cart
                    targetItem = cartItems[ordinalIndex];
                }
            }

            if (!targetItem) {
                const matches = findTargetCartItem(cartItems, intent);

                if (matches.length === 1) {
                    targetItem = matches[0];
                } else if (matches.length > 1) {
                    if (!intent.targetName) {
                        // No name or ordinal — default to most recently added item (last in oldest-first list)
                        targetItem = matches[matches.length - 1];
                    } else {
                        // Store the user message so the follow-up ordinal reply ("the first one" /
                        // "the first strawberry matcha") can reconstruct the original intent from history.
                        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
                        return {
                            reply: "I found more than one matching item in your cart. Could you be more specific, like 'the second strawberry matcha'?",
                            system_action: { ui_navigation: "none" },
                        };
                    }
                }
                // matches.length === 0 → targetItem stays null → display fallback response below
            }
        }

        if (!targetItem) {
            // "add one more / add another" with no matching cart item = user wants to add a NEW item,
            // not edit an existing one — fall through to Gemini ordering flow.
            if (intent.action === "increase") {
                // intentional fall-through to Gemini below
            } else {
                const reply = "I couldn't find that item in your cart. Could you let me know which drink you'd like to update?";
                await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
                await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
                return {
                    reply,
                    system_action: { ui_navigation: "none" },
                };
            }
        } else if (intent.action === "remove") {
            await CartItem.removeFromCart(targetItem._id);

            cartItems = await CartItem.getCart(userId);

            const reply = t('cartUpdated');

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "user",
                content: safeMessage,
            });

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                cartUpdate: buildCartUpdatePayload(cartItems, "Done! Your cart has been updated."),
                system_action: { ui_navigation: "none" },
            };
        } else if (intent.action === "increase" || intent.action === "decrease") {
            const nextQuantity = Number(targetItem.quantity || 1) + intent.quantityDelta;

            if (nextQuantity <= 0) {
                await CartItem.removeFromCart(targetItem._id);
            } else {
                await CartItem.updateCartItem(targetItem._id, {
                    quantity: nextQuantity,
                    lineTotal: Number(targetItem.unitPrice || 0) * nextQuantity,
                });
            }

            cartItems = await CartItem.getCart(userId);

            const reply = t('cartUpdated');

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "user",
                content: safeMessage,
            });

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                cartUpdate: buildCartUpdatePayload(cartItems, reply),
                system_action: { ui_navigation: "none" },
            };
        } else if (Object.keys(intent.newCustomization).length === 0 && !intent.removeToppings && intent.action === "updateCustomization") {
            // User said something like "second drink" — they identified a target but didn't say what to change.
            const name = targetItem.name || "that drink";
            const c = targetItem.customization || {};
            const currentDesc = [c.size, c.ice, c.sugar].filter(Boolean).join(", ");
            const reply = `Got it — I found your <strong>${name}</strong> (${currentDesc}). What would you like to do? I can change the size, ice, sugar, or toppings, adjust the quantity, or remove it entirely.`;
            return {
                reply,
                system_action: { ui_navigation: "none" },
            };
        } else {
            const newCustomization = {
                ...(targetItem.customization || {}),
                ...intent.newCustomization,
            };

            // "remove pearls" etc — strip just the named topping(s), keeping any others already on the drink.
            if (Array.isArray(intent.removeToppings) && intent.removeToppings.length > 0) {
                newCustomization.toppings = (Array.isArray(newCustomization.toppings) ? newCustomization.toppings : [])
                    .filter((t) => {
                        const clean = String(t || "").replace(/\s*\(\+S\$[\d.]+\)/i, "").trim();
                        return !intent.removeToppings.includes(clean);
                    });
            }

            const menuItem = await MenuItem.findById(targetItem.menuItemId).lean();
            const basePrice = menuItem ? Number(menuItem.price) : 0;
            const newUnitPrice = calculateCartUnitPrice(basePrice, newCustomization);
            const currentQty = Number(targetItem.quantity || 1);

            // If user targets a specific unit ("second drink", "one of them") and qty > 1,
            // split the item so only one unit gets the new customization.
            const hasOrdinal = /\b(one of|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b/i.test(intentMessage);

            console.log('[chatbot split debug]', {
                safeMessage,
                hasOrdinal,
                currentQty,
                willSplit: hasOrdinal && currentQty > 1,
                targetItemId: String(targetItem._id),
                targetItemName: targetItem.name,
                targetItemQty: targetItem.quantity,
                menuItemCode: targetItem.menuItemCode,
                oldCustomization: targetItem.customization,
                newCustomization,
            });

            if (hasOrdinal && currentQty > 1) {
                const reducedQty = currentQty - 1;
                const updateResult = await CartItem.updateCartItem(targetItem._id, {
                    quantity: reducedQty,
                    lineTotal: Number(targetItem.unitPrice || 0) * reducedQty,
                });
                console.log('[chatbot split debug] updateCartItem result:', updateResult);
                const addResult = await CartItem.addToCart(userId, targetItem.menuItemCode, {
                    quantity: 1,
                    customization: newCustomization,
                });
                console.log('[chatbot split debug] addToCart result:', addResult);
            } else {
                await CartItem.updateCartItem(targetItem._id, {
                    customization: newCustomization,
                    unitPrice: newUnitPrice,
                    lineTotal: newUnitPrice * currentQty,
                });
            }

            cartItems = await CartItem.getCart(userId);

            const reply = `${t('cartUpdated')}<div class="hidden-last-cart-item" style="display:none;">${targetItem._id}</div>`;

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "user",
                content: safeMessage,
            });

            await ChatbotSession.appendToConversation(activeConversationId, userId, {
                role: "assistant",
                content: reply,
            });

            return {
                reply,
                cartUpdate: buildCartUpdatePayload(cartItems, "Done! Your cart has been updated."),
                system_action: { ui_navigation: "none" },
            };
        }
    }
    // End of User Story #201

    // #308 - As a customer, I want to provide feedback via the chatbot so that I can share my experience conveniently.
    if (isFeedbackRequest(intentMessage)) {
        if (!userId) {
            return {
                reply: t('loginForFeedback'),
                system_action: { ui_navigation: "none" },
            };
        }

        const latestCompletedOrder = await Order.findOne(
            { userId, status: "completed" },
            null,
            { sort: { updatedAt: -1, createdAt: -1 } }
        ).lean();

        if (!latestCompletedOrder) {
            return {
                reply: t('collectFirst'),
                system_action: { ui_navigation: "none" },
            };
        }

        const existingFeedback = await Feedback.findOne({
        userId,
        orderId: latestCompletedOrder._id,
        }).lean();

        if (existingFeedback) {
            return {
                reply: t('feedbackAlready'),
                system_action: { ui_navigation: "none" },
            };
        }

        return {
        reply: t('feedbackPrompt'),
        feedbackOrderId: latestCompletedOrder._id.toString(),
        system_action: { ui_navigation: "none" },
        };
    }
    // End of Feedback

    // If the message is just a drink name (no other intent detected), treat it as an order.
    // Re-frame the message for Gemini so it starts Phase 2 immediately instead of guessing intent.
    // Use intentMessage (English) to match English drink names in the DB; keep safeMessage as
    // the Gemini input so Gemini can detect the user's language and reply accordingly.
    const drinkNameMatch = await findDrinkByName(intentMessage);
    const msgNormalized = intentMessage.toLowerCase().trim();
    const isDrinkNameOnly =
        drinkNameMatch &&
        msgNormalized === String(drinkNameMatch.name || "").toLowerCase().trim();

    const effectiveMessage = (isDrinkNameOnly && detectedLang === 'en')
        ? `I want to order a ${drinkNameMatch.name}`
        : safeMessage;

    // A multi-drink message that reaches the guided flow ("okay one classic milk tea
    // and one jasmine green tea") customises the first drink only. Park the rest so
    // the flow can pick them up once this one lands in the cart.
    if (userId && isMultiItemOrder(intentMessage)) {
        const queuedDrinks = [];
        for (const segment of splitMultiItemOrder(intentMessage)) {
            const segmentDrink = await findDrinkByName(segment);
            if (segmentDrink && !queuedDrinks.includes(segmentDrink.name)) queuedDrinks.push(segmentDrink.name);
        }
        // The first drink is the one the flow is about to ask questions for.
        if (queuedDrinks.length >= 2) {
            await ChatbotSession.setPendingDrinks(activeConversationId, userId, queuedDrinks.slice(1));
        }
    }

    // Default AI response
    const orderDetails = parseOrderDetails(effectiveMessage);

    // User Story #29: Show health advice
    let nutritionContext = "";
    let nutritionBlock = "";
    let healthCardData = null;

    // Suppress health card when user has responded to the sugar warning (either kept or changed it).
    // Use intentMessage so Chinese/Malay button clicks ("保持50%甜度", "Tukar kepada 25% Gula") are
    // translated to English before the regex test.
    const isRemainAtSugar = /^remain at \d+%\s*sugar$/i.test(intentMessage.trim());
    const isChangingSugar = /^change to \d+%\s*sugar$/i.test(intentMessage.trim());
    const suppressHealthCard = isRemainAtSugar || isChangingSugar;

    if (orderDetails.sugar) {
        // Current message takes priority — e.g. "add matcha latte with 50% sugar" should show Matcha Latte,
        // not the last drink from history (Taro Slush etc.)
        let drink = await findDrinkByName(intentMessage);
        if (!drink) {
            const lastDrinkName = resolveLastDrinkFromHistory(history);
            if (lastDrinkName) {
                drink = await findDrinkByName(lastDrinkName);
            }
        }

        if (drink) {
            const nutrition = calculateNutrition(
                drink,
                orderDetails.sugar || "100%",
                orderDetails.toppings || []
            );

            // Use "25% Sugar" as the sugarMap key (not "25%") so the calculation adds 10g correctly
            const recommended = calculateNutrition(drink, "25% Sugar", orderDetails.toppings || []);
            const isHighSugarSelected = orderDetails.sugar === "50% Sugar" || orderDetails.sugar === "100% Sugar";
            // Suppress when reducing to 25% gives the same or higher sugar (e.g. user is already at 25%)
            if (!suppressHealthCard && (nutrition.grade === "C" || nutrition.grade === "D" || isHighSugarSelected) && recommended.sugar < nutrition.sugar) {
                const recommendedSugarLevel = "25%";
                healthCardData = {
                    drinkName: drink.name,
                    currentSugar: nutrition.sugar,
                    currentGrade: nutrition.grade,
                    currentSugarLevel: formatSugarLevel(orderDetails.sugar),
                    recommendedSugar: recommended.sugar,
                    recommendedGrade: recommended.grade,
                    recommendedSugarLevel,
                };
            }

            // Pre-format nutrition block — suppressed when user responded to the sugar warning
            if (!suppressHealthCard) {
                nutritionBlock = `Updated Sugar: ${nutrition.sugar}g<br>Updated Calories: ${nutrition.calories} kcal<br>Updated Nutri-Grade: ${nutrition.grade}<br><p>           </p>`;
            }

            nutritionContext = `
    UPDATED HEALTH CONTEXT (authoritative — do NOT recalculate):
    Drink: ${drink.name}
    Selected Sugar Level: ${orderDetails.sugar || "Not detected"}
    Sugar: ${nutrition.sugar}g | Calories: ${nutrition.calories} kcal | Nutri-Grade: ${nutrition.grade}
    Selected Toppings: ${
                Array.isArray(orderDetails.toppings) && orderDetails.toppings.length > 0
                    ? orderDetails.toppings.join(", ")
                    : "No toppings"
            }

    CRITICAL: The values above are computed by the backend. Do NOT estimate, recalculate, or guess your own Nutri-Grade or sugar values — use exactly what is shown above.
    The nutrition summary is already displayed above your reply. Do NOT repeat or restate "Updated Sugar:", "Updated Calories:", or "Updated Nutri-Grade:" in your response.
    ${(nutrition.grade === "A" || nutrition.grade === "B")
        ? "The Nutri-Grade is already healthy (Grade " + nutrition.grade + "). Do NOT suggest reducing sugar or mention health concerns — just move to the next ordering step."
        : "Give a brief, gentle health suggestion in 1–2 sentences only. Do NOT force the customer to change."
    }
    `;
        }
    }

    // Show health card when user selects a topping — sugar level resolved from conversation history
    if (!orderDetails.sugar && orderDetails.toppings && orderDetails.toppings.length > 0 && !suppressHealthCard) {
        const lastSugar = resolveLastSugarFromHistory(history);
        const lastDrinkName = resolveLastDrinkFromHistory(history);
        if (lastSugar && lastDrinkName) {
            const drink = await findDrinkByName(lastDrinkName);
            if (drink) {
                const nutrition = calculateNutrition(drink, lastSugar, orderDetails.toppings);
                const recommended = calculateNutrition(drink, "25% Sugar", orderDetails.toppings);
                const isHighSugarSelected = lastSugar === "50% Sugar" || lastSugar === "100% Sugar";
                if ((nutrition.grade === "C" || nutrition.grade === "D" || isHighSugarSelected) && recommended.sugar < nutrition.sugar) {
                    healthCardData = {
                        drinkName: drink.name,
                        currentSugar: nutrition.sugar,
                        currentGrade: nutrition.grade,
                        currentSugarLevel: formatSugarLevel(lastSugar),
                        recommendedSugar: recommended.sugar,
                        recommendedGrade: recommended.grade,
                        recommendedSugarLevel: "25%",
                    };
                }
            }
        }
    }

    // Always inject live cart so Gemini never answers from stale conversation history
    let cartContext = "";
    if (userId) {
        try {
            const { cartItems: liveItems, cartSummaryHtml, cartTotal } = await buildCartSummary(userId);
            if (liveItems.length > 0) {
                cartContext = `\nLIVE CART (always use this — ignore any cart data in conversation history):\n${cartSummaryHtml.replace(/<br>/gi, "\n")}\nTotal: S$ ${cartTotal.toFixed(2)}\n`;
            } else {
                cartContext = `\nLIVE CART: The customer's cart is currently empty. Do NOT refer to any previous cart items.\n`;
            }
        } catch (_) {}
    }

    // Use intentMessage (English) here — buildSystemPrompt's own isMenuRequest()/filterMenu()
    const systemPrompt = await buildSystemPrompt(intentMessage, nutritionContext + cartContext, detectedLang);

    // When the user's message is a bare topping selection (e.g. "Brown Sugar (+S$1.00)", "珍珠",
    // "Mutiara", "No toppings"), Gemini tends to shortcut to "added to your cart" without
    // producing the required Phase 6 hidden-cart-data block.  Appending an explicit reminder
    // to the message that Gemini sees (but not to the stored history) reliably fixes this.
    const TOPPING_SELECTION = /^(pearls?|tapioca pearls?|brown sugar|cheese foam|no toppings?|mutiara|busa keju|gula perang|珍珠|黑糖|芝士泡沫|不加配料|tanpa topping)(\s*\(\+S\$[\d.]+\))?$/i;
    const toppingMatch = TOPPING_SELECTION.exec(safeMessage.trim());
    const geminiInput = toppingMatch
        ? effectiveMessage + "\n[REMINDER: Customer selected a topping. Immediately output the complete Phase 6 order summary including the hidden-cart-data block. Do NOT say \"added to your cart\".]"
        : effectiveMessage;

    let reply = await aiClient.generateText(
        geminiInput,
        recentHistory,
        systemPrompt
    );

    reply = fixMissingLineBreaks(reply);

    if (nutritionBlock) {
        // Extract the authoritative grade so we can correct any wrong grade Gemini calculated independently
        const authorGradeMatch = nutritionBlock.match(/Updated Nutri-?Grade:\s*([A-D])/i);
        const authorGrade = authorGradeMatch ? authorGradeMatch[1].toUpperCase() : null;

        // Strip any nutrition lines the AI still outputs — backend provides them via nutritionBlock
        reply = reply
            .replace(/Updated\s+Sugar\s*:[^<\n]*/gi, '')
            .replace(/Updated\s+Calories\s*:[^<\n]*/gi, '')
            .replace(/Updated\s+Nutri-?Grade\s*:\s*[A-D][^<\n]*/gi, '')
            .replace(/^(<br\s*\/?>\s*)+/gi, '')
            .trim();

        // Correct any inline Nutri-Grade letters Gemini calculated with its own (potentially wrong) math
        if (authorGrade) {
            reply = reply.replace(/\bNutri-?Grade\s+[A-D]\b/gi, `Nutri-Grade ${authorGrade}`);
        }

        reply = nutritionBlock + reply;
    }

    // Remove AI-generated grade badge images that duplicate the health card widget
    if (healthCardData) {
        reply = reply.replace(/<img[^>]*grade_nutri[^>]*\/?>/gi, '');
    }

    const hiddenCartItems = extractHiddenCartData(reply);

    // While the queue is working through a drink, every question in the flow was about
    // that drink. Pin it, so a reply that drifts back to the previous drink adds the
    // right one instead of a duplicate.
    const activeQueuedDrink = userId ? await ChatbotSession.getActiveQueuedDrink(activeConversationId) : null;
    if (activeQueuedDrink && hiddenCartItems.length === 1 && hiddenCartItems[0].name !== activeQueuedDrink) {
        console.warn("[ChatbotService] Queued drink mismatch, correcting:", hiddenCartItems[0].name, "->", activeQueuedDrink);
        hiddenCartItems[0].name = activeQueuedDrink;
    }

    let addedItems = [];
    if (hiddenCartItems.length > 0) {
        if (!userId) {
            reply = cleanAiReply(reply);
            reply += `<br><br>Please log in first before I add this to your cart.`;
        } else {
            addedItems = await addHiddenCartItemsToDatabase(hiddenCartItems, userId);
            reply = cleanAiReply(reply);

            if (addedItems.length > 0) {
                reply = `${addedItems[0]?.name || "Your drink"} added to your cart.`;
            }
        }
    }

    // Fallback: Gemini showed a Phase 6 summary in text but didn't produce hidden-cart-data.
    // This covers combined inputs like "25% tanpa topping" and all Malay/Chinese orderings.
    if (addedItems.length === 0 && userId) {
        const phase6 = extractPhase6OrderFromReply(reply);
        if (phase6) {
            const drink = await findDrinkByName(activeQueuedDrink || phase6.drinkName);
            if (drink) {
                const customization = phase6.customStr
                    ? parseCustomization(phase6.customStr)
                    : (resolveCustomizationFromHistory(history) || { size: 'Regular', ice: 'Normal Ice', sugar: 'Normal Sweet', toppings: [], lang: 'en' });
                const cartItem = await CartItem.addToCart(userId, drink.itemId, { quantity: 1, customization });
                cartItem.drinkInfo = drink;
                cartItem.menuItemCode = drink.itemId;
                addedItems = [cartItem];
            }
        } else if (toppingMatch) {
            // Secondary fallback: bare topping with no readable summary in reply
            addedItems = await addToppingToCartFromHistory(toppingMatch[1], history, userId);
        }
    }

    reply = fixMissingLineBreaks(reply);

    // A drink from a multi-drink message just landed in the cart — move on to the next
    // one instead of ending the conversation with it forgotten.
    let nextQueuedDrink = null;
    if (addedItems.length > 0 && userId) {
        // This drink is done; whatever comes next becomes the pinned one.
        await ChatbotSession.clearActiveQueuedDrink(activeConversationId);
        nextQueuedDrink = await ChatbotSession.shiftPendingDrink(activeConversationId);
        if (nextQueuedDrink) {
            const nextDrink = await findDrinkByName(nextQueuedDrink);
            if (nextDrink) {
                const regularPrice = Number(nextDrink.price || 0).toFixed(2);
                reply +=
                    `<br><br>Next up: your <strong>${nextDrink.name}</strong>.` +
                    `<br><br>What size would you like?` +
                    `<br><br>Regular (S$${regularPrice}) / Large (+S$1.50)`;
            } else {
                nextQueuedDrink = null;
            }
        }
    }

    // When the user asks for information about drinks (not just ordering or browsing),
    // detect which drinks the AI mentions and surface them as recommendation cards.
    let drinkCardsForInfo = [];
    if (addedItems.length === 0 && isInfoRequest(intentMessage)) {
        try {
            const replyLower = reply.toLowerCase();
            // Cross-reference: a drink must BOTH appear in Gemini's reply AND match the
            // user's own query keywords. This prevents drinks casually mentioned in history
            // (or referenced in passing) from inflating the card list on each follow-up.
            const queryMatches = await MenuItem.recommendByMessage(intentMessage);
            const queryIds = new Set(queryMatches.map(d => d.itemId));
            const mentionedDrinks = queryMatches.filter(drink =>
                replyLower.includes(drink.name.toLowerCase()) && queryIds.has(drink.itemId)
            );
            if (mentionedDrinks.length > 0) {
                drinkCardsForInfo = formatDrinkCards(mentionedDrinks);
            }
        } catch (_) {}
    }

    await ChatbotSession.appendToConversation(activeConversationId, userId, {
        role: "user",
        content: safeMessage,
    });

    await ChatbotSession.appendToConversation(activeConversationId, userId, {
        role: "assistant",
        content: reply,
    });

    // Build orderReceipt when the AI flow successfully added items to cart.
    let orderReceipt = null;
    if (addedItems.length > 0 && !nextQueuedDrink) {
        const firstItem = addedItems[0];
        const drink = firstItem.drinkInfo || {};
        const customization = firstItem.customization || {};
        const nutrition = calculateNutrition(drink, customization.sugar, customization.toppings || []);
        const allCartItems = await CartItem.getCart(userId);
        const cartTotal = allCartItems.reduce((sum, i) => sum + Number(i.lineTotal || 0), 0);

        orderReceipt = {
            drink: {
                name: firstItem.name,
                price: Number(firstItem.unitPrice || 0),
                image: firstItem.image || (/^b\d{3}$/.test(drink.itemId) ? `/img/bubble_teas/${drink.itemId}.jpg` : "/img/bubble_teas/b001.jpg"),
            },
            customization: {
                size: customization.size || "Regular",
                ice: customization.ice || "Normal Ice",
                sugar: customization.sugar || "Normal Sweet",
                toppings: Array.isArray(customization.toppings) ? customization.toppings : [],
            },
            nutrition,
            recommendedNutrition: (nutrition && (nutrition.grade === "C" || nutrition.grade === "D"))
                ? calculateNutrition(drink, "25% Sugar", Array.isArray(customization.toppings) ? customization.toppings : [])
                : null,
            cartItems: allCartItems.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                lineTotal: i.lineTotal,
            })),
            total: cartTotal,
            lang: detectMessageLanguage(safeMessage),
        };
    }

    return {
        reply,
        system_action: { ui_navigation: "none" },
        healthCard: healthCardData,
        ...(orderReceipt ? { orderReceipt } : {}),
        ...(addedItems.length > 0 ? { showViewCart: true } : {}),
        ...(drinkCardsForInfo.length > 0 ? { recommendedDrinks: drinkCardsForInfo } : {}),
    };
}

// ── Final language safety gate ─────────────────────────────────────────────
// Every reply path above already tries to answer in the customer's language (Gemini via the
// buildSystemPrompt language instruction, or REPLY_STRINGS/HEALTH_RANKING_STRINGS lookups for the
// hardcoded paths). This is the last-resort check: if a reply still comes out in English for a
// non-English customer, translate it through Gemini before it goes out, instead of shipping the
// wrong language.
const CJK_RE = /[一-鿿]/;
const TAMIL_RE = /[஀-௿]/;
// Malay is Latin-script — indistinguishable from English by character set — so BM instead checks
// for common English function words that essentially never appear in Malay sentences. Requires 2+
// distinct hits so a single stray English proper noun (a drink name) doesn't false-positive.
const ENGLISH_TELL_RE = /\b(the|is|are|have|has|please|your|you|this|that|with|and)\b/gi;

function replyLooksWrongLanguage(text, targetLang) {
    const plain = String(text || "").replace(/<[^>]*>/g, " ").trim();
    if (!plain) return false;
    if (targetLang === "zh") return !CJK_RE.test(plain);
    if (targetLang === "ta") return !TAMIL_RE.test(plain);
    if (targetLang === "ms") {
        const hits = new Set((plain.match(ENGLISH_TELL_RE) || []).map((w) => w.toLowerCase()));
        return hits.size >= 2;
    }
    return false;
}

// Structural HTML replies (ordering flow, hidden-cart-data, buttons) already carry their own
// explicit per-language instruction into Gemini and are too fragile to safely re-translate as a
// block — the gate only touches plain-text replies and per-segment text of a multi-intent reply.
function isSafeToTranslate(text) {
    return Boolean(text) && !/hidden-cart-data|<button/i.test(text);
}

async function ensureReplyLanguage(result, targetLang) {
    if (!result || !USE_MATCHED_LANGUAGE || targetLang === "en") return result;

    if (isSafeToTranslate(result.reply) && replyLooksWrongLanguage(result.reply, targetLang)) {
        result.reply = await aiClient.translateFromEnglish(result.reply, targetLang).catch(() => result.reply);
    }

    if (Array.isArray(result.segments)) {
        for (const segment of result.segments) {
            if (isSafeToTranslate(segment.reply) && replyLooksWrongLanguage(segment.reply, targetLang)) {
                segment.reply = await aiClient.translateFromEnglish(segment.reply, targetLang).catch(() => segment.reply);
            }
        }
    }

    return result;
}

// Exported entry point: runs the real handler, then gates the result through
// ensureReplyLanguage as a final check before it reaches the customer.
async function handleChatMessage(params) {
    const result = await handleChatMessageCore(params);
    const detectedLang = detectMessageLanguage(String(params?.message || "").trim());
    return ensureReplyLanguage(result, detectedLang);
}

// Handles an image upload: sends the image + menu summary to Gemini for a vision-based reply.
async function handleImageMessage({ images, message, conversationId }) {
    try {
        const MenuItem = require("../models/menuItem.model");
        const allDrinks = await MenuItem.find({ status: "active" }).lean();

        const menuSummary = allDrinks.map(d => {
            const nutrition = d.nutritionInfo || {};
            return `- ${d.name} (${d.category}) S$${Number(d.price).toFixed(2)}, Nutri-Grade ${nutrition.nutriGrade || "B"}`;
        }).join("\n");

        const multiple = images.length > 1;
        const systemPrompt = `You are Avy, the friendly AI assistant for DripTea, a bubble tea café in Singapore.
A customer has sent you ${multiple ? `${images.length} photos` : "a photo"}. Your job is to:
1. Identify what is in ${multiple ? "each photo" : "the photo"}.
2. If a photo clearly shows a drink, match it to the closest item(s) on our menu listed below, or let them know if it looks like something we don't serve.
3. If a photo does NOT show a drink or isn't relevant to DripTea (e.g. random objects, people, scenery, unrelated screenshots), do not try to force-match it to a menu item - clearly tell the customer that photo is outside Avy's scope, since Avy can only help with drinks, orders, and the DripTea menu.
4. ${multiple ? "Go through every photo one by one and address each one individually - don't skip any of them." : "Suggest the matched drink warmly and offer to help them order it."}
5. Keep your tone friendly, concise, and helpful.

Our current menu:
${menuSummary}`;

        const userPrompt = message && message.trim()
            ? message
            : (multiple
                ? "What drinks are these? Can you identify each one and match them to your menu?"
                : "What drink is this? Can you identify it and match it to your menu?");

        const reply = await aiClient.generateImageAnalysis(images, userPrompt, systemPrompt);

        return {
            reply,
            system_action: { ui_navigation: "none" },
        };
    } catch (error) {
        console.error("[ChatbotService] handleImageMessage error:", error.message);
        return {
            reply: "Sorry, I had trouble analysing that image. Please try again or describe the drink in text!",
            system_action: { ui_navigation: "none" },
        };
    }
}

module.exports = {
    handleChatMessage,
    handleImageMessage,
    generateNavigationResponse,
    isTrackOrderRequest,
    isPurchaseHistory,
    isDeliveryOrPaymentQuestion,
    normalizeForOrderIntent,
    extractOrderNoFromMessage,
    isSymptomRequest,
    hasExplicitOrderIntent,
    looksUnintelligible,
    buildOrderStatusCard,
};