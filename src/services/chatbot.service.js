const {
    //isAddToCartRequest,
    extractBeverageId,
    //isViewCartRequest,
} = require("../utils/chatIntent.util");

const aiClient = require("../ai/aiClient");
const ChatbotSession = require("../models/chatbotSession.model");

const { buildSystemPrompt } = require("./prompt.service");
const CartItem = require("../models/cartItem.model");
const MenuItem = require("../models/menuItem.model");
const Payment = require("../models/payment.model");

async function findDrinkByName(message) {
    const msg = String(message || "").toLowerCase();

    const drinks = await MenuItem.find({
    status: "active",
    }).lean();

    return drinks.find((drink) =>
    msg.includes(String(drink.name || "").toLowerCase())
    );
}
// #25 - As a customer, I want to chat with the AI chatbot so that I can get help with ordering and menu questions.
// Reads chatbot_sessions by conversationId to retrieve prior messages for context.
async function getConversationHistory(conversationId) {
    return ChatbotSession.getConversationHistory(conversationId);
}
// End of User Story #25

// #29 - As a customer, I want the chatbot to inform me when my chosen drink has a high sugar level so that I can reconsider my selection.
// #31 - As a customer, I want the chatbot to show me the nutritional grading of each beverage so that I can choose the suitable option.
// Reads baseSugarG and baseCalories from menu_items → applies sugar/topping adjustments → calculates Nutri-Grade.
function calculateNutrition(drink, sugarLevel, toppings = []) {
    const sugarMap = {
        "0% Sugar": 0,
        "25% Sugar": 10,
        "50% Sugar": 20,
        "100% Sugar": 40,
    };

    const nutrition = drink.nutritionInfo || {};

    let sugar =
        Number(nutrition.baseSugarG ?? drink.base_sugar_g ?? 0) +
        (sugarMap[sugarLevel] || 0);

    let calories =
        Number(nutrition.baseCalories ?? drink.base_calories ?? 0);

    if (toppings.includes("Tapioca Pearls") || toppings.includes("Pearls")) {
        sugar += 8;
        calories += 60;
    }

    if (toppings.includes("Aloe Vera")) {
        sugar += 4;
        calories += 20;
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
function isNutriGradeQuestion(message) {
    const msg = String(message || "").toLowerCase();

    return (
        msg.includes("nutri grade") ||
        msg.includes("nutri-grade") ||
        msg.includes("nutrition grade")
    );
}
// End of User Story #31

// Detects queries asking which drinks have low/high sugar or low/high calories.
function isHealthRankingQuery(message) {
    const msg = String(message || "").toLowerCase();
    const hasSugar = msg.includes("sugar");
    const hasCalorie = msg.includes("calorie") || msg.includes("calories") || msg.includes("cal");
    const hasHealthy = msg.includes("healthy") || msg.includes("healthier") || msg.includes("healthiest");
    const hasDrinkRef = msg.includes("which drink") || msg.includes("which beverage") || msg.includes("drinks") || msg.includes("beverages");
    return (
        (msg.includes("low sugar") || msg.includes("lower sugar") || msg.includes("least sugar") || msg.includes("lowest sugar") || msg.includes("less sugar")) ||
        (msg.includes("high sugar") || msg.includes("higher sugar") || msg.includes("most sugar") || msg.includes("highest sugar")) ||
        (msg.includes("low calorie") || msg.includes("lower calorie") || msg.includes("least calorie") || msg.includes("lowest calorie") || msg.includes("low cal")) ||
        (msg.includes("high calorie") || msg.includes("higher calorie") || msg.includes("most calorie") || msg.includes("highest calorie")) ||
        (msg.includes("healthiest") || msg.includes("healthier option") || msg.includes("healthier choice") || msg.includes("healthier drink")) ||
        (hasDrinkRef && (hasSugar || hasCalorie || hasHealthy))
    );
}

const ORDER_CUSTOMIZATION_WORDS = [
    "regular", "large", "small",
    "no ice", "less ice", "normal ice", "more ice", "extra ice",
    "0%", "25%", "50%", "70%", "100%", "no sugar", "less sweet", "full sweet",
    "aloe", "pearl", "boba", "cheese foam", "tapioca", "no topping",
];

function hasCustomizationWords(msg) {
    return ORDER_CUSTOMIZATION_WORDS.some((w) => msg.includes(w));
}

function parseCustomizationFromMessage(message) {
    const msg = String(message || "").toLowerCase();

    let size = "Regular";
    if (msg.includes("large")) size = "Large";
    else if (msg.includes("small")) size = "Small";

    let ice = "Normal Ice";
    if (msg.includes("no ice")) ice = "No Ice";
    else if (msg.includes("less ice")) ice = "Less Ice";
    else if (msg.includes("more ice") || msg.includes("extra ice")) ice = "More Ice";

    let sugar = "Normal Sweet";
    if (msg.includes("0%") || msg.includes("no sugar") || msg.includes("unsweetened")) sugar = "0% Sugar";
    else if (msg.includes("25%") || msg.includes("less sweet")) sugar = "25% Sugar";
    else if (msg.includes("50%") || msg.includes("half sweet")) sugar = "50% Sugar";
    else if (msg.includes("70%")) sugar = "70% Sugar";
    else if (msg.includes("100%") || msg.includes("full sweet")) sugar = "100% Sugar";

    const toppings = [];
    if (!msg.includes("no topping")) {
        if (msg.includes("aloe")) toppings.push("Aloe Vera");
        if (msg.includes("pearl") || msg.includes("boba") || msg.includes("tapioca")) toppings.push("Tapioca Pearls");
        if (msg.includes("cheese")) toppings.push("Cheese Foam");
    }

    return { size, ice, sugar, toppings };
}

// #32 - As a customer, I want to get the recommendations from chatbot so that I can complete my order.
// Detects recommendation intent keywords → queries menu_items → injects results into AI prompt.
// All drink name associations — any of these words in a message signals a drink-related browse request
const DRINK_ASSOCIATION_WORDS = [
    "matcha", "taro", "chocolate", "choco", "cocoa",
    "milo", "jasmine", "oolong", "osmanthus", "da hong bao",
    "milk tea", "milktea", "frappe", "slush",
    "strawberry", "cranberry", "latte",
];

function isRecommendationRequest(message) {
    const msg = String(message || "").toLowerCase();

    // Specific order with customization details → not a recommendation
    if (hasCustomizationWords(msg)) return false;

    // "give me one X" / "give me 2 X" = quantity-based order, not a browse request
    if (/\bgive me\s+(one|two|three|four|five|\d+)\b/i.test(msg)) return false;

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
        // Exploratory / flavour-first responses (e.g. "maybe a matcha", "something fruity", "how about taro")
        /^(maybe|perhaps|how about|what about|something)\b/i.test(msg) ||
        // Any message containing a known drink name / category word
        DRINK_ASSOCIATION_WORDS.some((kw) => msg.includes(kw))
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
    b001: "Our signature black tea steeped in sweet, creamy milk",
    b002: "Delicate jasmine-scented green tea with a floral finish",
    b003: "Smooth oolong balanced with fresh milk and light sweetness",
    b004: "Rich, earthy matcha blended with creamy fresh milk",
    b005: "Vibrant strawberry purée layered with earthy matcha",
    b006: "Tart cranberry meets smooth matcha for a bold contrast",
    b007: "Floral jasmine-infused green tea with earthy matcha depth",
    b008: "Fragrant osmanthus flower tea with a soft, milky finish",
    b009: "Premium Wuyi rock oolong with rich mineral notes and creamy milk",
    b010: "Indulgent cocoa and chocolate syrup blended over ice",
    b011: "Classic Milo chocolate-malt with fresh milk over ice",
    b012: "Creamy purple taro blended into a thick, icy slush",
};

function formatDrinkCards(drinks) {
    return drinks.map((drink) => {
        const nutrition = drink.nutritionInfo || {};
        return {
            id: drink.itemId,
            name: drink.name,
            category: drink.category,
            price: drink.price,
            description: drink.description || DRINK_TAGLINES[drink.itemId] || "",
            image: drink.image || `/img/bubble_teas/${drink.itemId}.png`,
            tags: drink.tags || [],
            nutri_grade: nutrition.nutriGrade || null,
            base_sugar_g: nutrition.baseSugarG ?? null,
            base_calories: nutrition.baseCalories ?? null,
            rating: drink.rating ?? 0,
        };
    });
}
// End of User Story #32

// #198 - As a customer, I want to browse my purchase history through the chatbot so that I can review my previous orders conveniently.
// Detects history-related keywords → calls Payment.getPurchaseHistory() → joins orders and order_items.
function isPurchaseHistoryRequest(message) {
    const msg = String(message || "").toLowerCase();

    return (
        msg.includes("purchase history") ||
        msg.includes("order history") ||
        msg.includes("latest order") ||
        msg.includes("last order") ||
        msg.includes("recent order") ||
        msg.includes("my purchases") ||
        msg.includes("my orders") ||
        msg.includes("my order") ||
        msg.includes("past order") ||
        msg.includes("previous order") ||
        msg.includes("other order") ||
        /what.*my.*order/i.test(msg) ||
        /order.*on.*\d/i.test(msg) ||
        /order.*on\s+[a-z]+/i.test(msg)
    );
}

// Parses a date reference like "14 June", "June 14", "14th of July" from a message.
// Returns { day, month } (month is 0-indexed) or null if no date found.
function extractDateFromMessage(message) {
    const msg = String(message || "").toLowerCase();

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

    // "14 june", "14th june", "14th of june"
    const dayFirst = msg.match(/(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?\s+([a-z]+)/);
    if (dayFirst) {
        const day = parseInt(dayFirst[1]);
        const monthStr = dayFirst[2];
        if (monthNames[monthStr] !== undefined && day >= 1 && day <= 31) {
            return { day, month: monthNames[monthStr] };
        }
    }

    // "june 14", "june 14th"
    const monthFirst = msg.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/);
    if (monthFirst) {
        const monthStr = monthFirst[1];
        const day = parseInt(monthFirst[2]);
        if (monthNames[monthStr] !== undefined && day >= 1 && day <= 31) {
            return { day, month: monthNames[monthStr] };
        }
    }

    return null;
}
// End of User Story #198

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

    // "i want / i'd like / give me / can i get / i'll have" + customization words → specific order
    const hasOrderIntent = (
        msg.includes("i want") ||
        msg.includes("i'd like") ||
        msg.includes("i would like") ||
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

// #199 / #201 - Single source of truth for all 12 drink keyword aliases.
// Used by resolveBeverageId (add-to-cart) and getCartUpdateIntent (edit-cart)
// so "strawberry", "milo", "frappe" etc. resolve to the correct full drink name.
function resolveDrinkNameFromMessage(message) {
    const msg = String(message || "").toLowerCase();

    if (msg.includes("da hong bao")) return "Da Hong Bao Milk Tea";
    if (msg.includes("osmanthus")) return "Osmanthus Milk Tea";
    if (msg.includes("oolong")) return "Oolong Milk Tea";
    if (msg.includes("jasmine matcha")) return "Jasmine Matcha Tea";
    if (msg.includes("strawberry matcha")) return "Strawberry Matcha Tea";
    if (msg.includes("cranberry matcha")) return "Cranberry Matcha Tea";
    if (msg.includes("matcha latte")) return "Matcha Latte";
    if (msg.includes("double chocolate frappe")) return "Double Chocolate Frappe";
    if (msg.includes("chocolate frappe")) return "Double Chocolate Frappe";
    if (msg.includes("classic milk tea")) return "Classic Milk Tea";
    if (msg.includes("jasmine green")) return "Jasmine Green Tea";
    if (msg.includes("taro slush")) return "Taro Slush";
    if (msg.includes("milo dinosaur")) return "Milo Dinosaur";
    if (msg.includes("milo")) return "Milo Dinosaur";
    if (msg.includes("matcha")) return "Matcha Latte";
    if (msg.includes("strawberry")) return "Strawberry Matcha Tea";
    if (msg.includes("cranberry")) return "Cranberry Matcha Tea";
    if (msg.includes("frappe")) return "Double Chocolate Frappe";
    if (msg.includes("chocolate")) return "Double Chocolate Frappe";
    if (msg.includes("taro")) return "Taro Slush";
    if (msg.includes("jasmine")) return "Jasmine Green Tea";
    if (msg.includes("milk tea")) return "Classic Milk Tea";

    return null;
}

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
        }
    }

    return beverageId;
}

function resolveLastDrinkFromHistory(history) {
    if (!Array.isArray(history)) return null;
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role !== "assistant") continue;
        const content = String(msg.content || "");
        // Check hidden-cart-data first (most reliable)
        const cartMatch = content.match(/<div class=['"]hidden-cart-data['"][^>]*>([\s\S]*?)<\/div>/i);
        if (cartMatch) {
            const name = cartMatch[1].split("|")[0].trim();
            if (name) return name;
        }
        // Fall back to order summary pattern: "[Drink Name] - S$[price]"
        const summaryMatch = content.match(/Here is your order summary:(?:<br>)?\s*([^<\n\-]+?)\s*-\s*S\$/i);
        if (summaryMatch) {
            const name = summaryMatch[1].trim();
            if (name) return name;
        }
    }
    // Fallback: scan customer messages for a drink name
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role !== "user") continue;
        const name = resolveDrinkNameFromMessage(msg.content);
        if (name) return name;
    }
    return null;
}

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
// Detects cart-view keywords → calls CartItem.getCart() → queries cart_items where status is active.
function isViewCartRequest(message) {
    const msg = String(message || "").toLowerCase().replace(/['']/g, "'");

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

// #201 - Detects "remove my order / clear cart / empty cart / cancel order" intent.
// Previously these phrases fell through to Gemini which replied "Your cart is now empty"
// without actually deleting anything. This routes them to the clear-cart handler instead.
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

// #201 - Detects edit-cart intent (change/update/remove a specific drink in the cart).
// hasDrinkOrCartRef now also calls resolveDrinkNameFromMessage so drink keyword aliases
// ("strawberry", "milo" etc.) count as a cart reference without needing the full drink name.
function isCartUpdateRequest(message) {
    const msg = String(message || "").toLowerCase();

    // These are ordering-flow sugar adjustment responses — let AI handle them
    if (/^(change to \d+%\s*sugar|remain at \d+%\s*sugar)$/i.test(msg.trim())) return false;

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

    // "second drink" / "the first item" — ordinal targeting without a verb still means cart intent
    const hasOrdinalItemRef =
        /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b/i.test(msg) &&
        (msg.includes("drink") || msg.includes("item"));

    return (hasEditVerb && hasDrinkOrCartRef) || hasOrdinalItemRef;
}

function getCartUpdateIntent(message) {
    const msg = String(message || "").toLowerCase();

    const intent = {
        action: "updateCustomization",
        targetName: null,
        targetCustomization: {},
        newCustomization: {},
        quantityDelta: 0,
    };

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
    const parts = msg.split(/\bchange to\b|\bupdate to\b|\bmake it\b/);
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
    if (targetText.includes("100%") || targetText.includes("full sweet")) {
        intent.targetCustomization.sugar = "100% Sugar";
    } else if (targetText.includes("70%")) {
        intent.targetCustomization.sugar = "70% Sugar";
    } else if (targetText.includes("50%") || targetText.includes("half sweet")) {
        intent.targetCustomization.sugar = "50% Sugar";
    } else if (targetText.includes("25%") || targetText.includes("less sweet")) {
        intent.targetCustomization.sugar = "25% Sugar";
    } else if (targetText.includes("0%") || targetText.includes("no sugar") || targetText.includes("no additional sugar") || targetText.includes("unsweetened")) {
        intent.targetCustomization.sugar = "0% Sugar";
    } else if (targetText.includes("normal sweet")) {
        intent.targetCustomization.sugar = "Normal Sweet";
    }

    if (changeText.includes("100%") || changeText.includes("full sweet")) {
        intent.newCustomization.sugar = "100% Sugar";
    } else if (changeText.includes("70%")) {
        intent.newCustomization.sugar = "70% Sugar";
    } else if (changeText.includes("50%") || changeText.includes("half sweet")) {
        intent.newCustomization.sugar = "50% Sugar";
    } else if (changeText.includes("25%") || changeText.includes("less sweet")) {
        intent.newCustomization.sugar = "25% Sugar";
    } else if (changeText.includes("0%") || changeText.includes("no sugar") || changeText.includes("unsweetened")) {
        intent.newCustomization.sugar = "0% Sugar";
    } else if (changeText.includes("normal sweet")) {
        intent.newCustomization.sugar = "Normal Sweet";
    }

    if (changeText.includes("no toppings") || changeText.includes("no topping")) {
        intent.newCustomization.toppings = [];
    } else if (changeText.includes("pearl")) {
        intent.newCustomization.toppings = ["Tapioca Pearls"];
    } else if (changeText.includes("aloe")) {
        intent.newCustomization.toppings = ["Aloe Vera"];
    } else if (changeText.includes("cheese")) {
        intent.newCustomization.toppings = ["Cheese Foam"];
    }

    if (changeText.includes("large")) intent.newCustomization.size = "Large";
    else if (changeText.includes("regular")) intent.newCustomization.size = "Regular";

    if (changeText.includes("no ice")) intent.newCustomization.ice = "No Ice";
    else if (changeText.includes("less ice")) intent.newCustomization.ice = "Less Ice";
    else if (changeText.includes("normal ice")) intent.newCustomization.ice = "Normal Ice";
    else if (changeText.includes("hot")) intent.newCustomization.ice = "Hot";

    return intent;
}

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

function calculateCartUnitPrice(basePrice, customization = {}) {
    let price = Number(basePrice || 0);

    if (customization.size === "Large") price += 1.5;

    const toppings = Array.isArray(customization.toppings)
        ? customization.toppings
        : [];

    toppings.forEach((topping) => {
        const name = String(topping).toLowerCase();

        if (name.includes("pearl")) price += 1.2;
        else if (name.includes("aloe")) price += 1.0;
        else if (name.includes("cheese")) price += 1.5;
    });

    return price;
}

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

function buildCartSummaryReply(cartItems, { updated = true } = {}) {
    if (!cartItems.length) {
        return `Your cart is now empty.<br><br><button class="chat-nav-btn-compact" onclick="handleMenu()">Browse Menu</button>`;
    }

    const lines = cartItems.map((item, index) => {
        const c = item.customization || {};
        const toppings =
            Array.isArray(c.toppings) && c.toppings.length > 0
                ? c.toppings.map((t) => t.replace(/\s*\(\+S\$[\d.]+\)/g, "").trim()).join(", ")
                : "No toppings";

        const details = [
            c.size || "Regular",
            c.ice || "Normal Ice",
            c.sugar || "Normal Sweet",
            toppings,
        ].join(" · ");

        return `${index + 1}. <strong>${item.name}</strong> × ${item.quantity}<br><span style="color:#ffffff">${details}</span><br>S$ ${Number(item.lineTotal || 0).toFixed(2)}`;
    });

    const total = cartItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
    );

    const header = updated ? `Done! Your cart has been updated.<br><br>` : `Here's your current cart:<br><br>`;

    return (
        header +
        lines.join("<br><br>") +
        `<br><br><strong>Total: S$ ${total.toFixed(2)}</strong><br><br>` +
        `<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button>&nbsp;` +
        `<button class="chat-nav-btn-compact" onclick="handleCheckout()">Checkout</button>`
    );
}
// End of User Story #201

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

function parseCustomization(details) {
    const text = String(details || "");

    const parts = text
        .split("·")
        .map((part) => part.trim())
        .filter(Boolean);

    const size = parts.find((part) =>
    /medium|large|regular/i.test(part)
    ) || "Regular";

    const ice = parts.find((part) =>
    /normal ice|less ice|no ice|hot/i.test(part)
    ) || "Normal Ice";

    const sugar = parts.find((part) =>
    /0%|25%|50%|100%|normal sweet/i.test(part)
    ) || "Normal Sweet";

    const toppings = parts
    .filter(
        (part) =>
            !/medium|large|regular/i.test(part) &&
            !/normal ice|less ice|no ice|hot/i.test(part) &&
            !/0%|25%|50%|100%|normal sweet/i.test(part) &&
            !/no toppings/i.test(part)
    )
    .map((t) => t.replace(/\s*\(\+S\$[\d.]+\)/g, "").trim());

    return {
    size,
    ice,
    sugar,
    toppings,
    };
}

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

    let sugar = null;
    if (/normal sugar|full sugar|100\s*%/.test(msg)) sugar = "100% Sugar";
    else if (/half sugar|medium sugar|50\s*%/.test(msg)) sugar = "50% Sugar";
    else if (/less sugar|low sugar|少糖|25\s*%/.test(msg)) sugar = "25% Sugar";
    else if (/no sugar|zero sugar|(?<!\d)0\s*%|unsweetened/.test(msg)) sugar = "0% Sugar";

    let toppings = null;
    if (/no topping|no toppings|none|without topping/.test(msg)) toppings = [];
    else {
    const found = [];
        if (/pearl|pearls|tapioca/.test(msg)) found.push("Tapioca Pearls");
        if (/aloe/.test(msg)) found.push("Aloe Vera");
        if (/cheese foam|foam/.test(msg)) found.push("Cheese Foam");
        if (found.length > 0) toppings = found;
        }

    return { size, ice, sugar, toppings };
}



function cleanAiReply(reply) {
    return String(reply || "")
    .replace(/<div class=['"]hidden-cart-data['"][^>]*>[\s\S]*?<\/div>/i, "")
    .trim();
}

function fixMissingLineBreaks(reply) {
    return String(reply || "")
        .replace(/Here is your order summary:/gi, "Here is your order summary:<br>")
        .replace(/(summary:)([A-Z])/gi, "$1<br>$2")
        .replace(/(S\$[0-9.]+)(Regular|Large)/gi, "$1<br>$2")
        .replace(/(No toppings|Cheese Foam|Aloe Vera|Pearls)(sugar:)/gi, "$1<br>$2")
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

// Main chatbot message handler
async function handleChatMessage({ message, conversationId, userId }) {
    const safeMessage = String(message || "").trim();

    if (!safeMessage) {
        return {
            reply: "Please send a message.",
            system_action: { ui_navigation: "none" },
        };
    }

    const activeConversationId = conversationId || `guest-${Date.now()}`;
    const history = await ChatbotSession.getConversationHistory(activeConversationId);

    // User Story #31: Ask About Nutri-Grade via chatbot
    if (isNutriGradeQuestion(safeMessage)) {
        const drink = await findDrinkByName(safeMessage);
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

    // Health ranking query: "which beverage has lower sugar?", "healthiest drink", etc.
    if (isHealthRankingQuery(safeMessage)) {
        const msg = safeMessage.toLowerCase();
        const wantHigh =
            msg.includes("high sugar") || msg.includes("higher sugar") || msg.includes("most sugar") || msg.includes("highest sugar") ||
            msg.includes("high calorie") || msg.includes("higher calorie") || msg.includes("most calorie") || msg.includes("highest calorie");
        const rankByCalorie =
            msg.includes("calorie") || msg.includes("calories") || msg.includes("cal");

        const allDrinks = await MenuItem.find({ status: "active" }).lean();
        const withNutrition = allDrinks.filter((d) => {
            const n = d.nutritionInfo || {};
            return n.baseSugarG != null || n.baseCalories != null;
        });

        if (withNutrition.length === 0) {
            const reply = "I don't have nutritional data for our drinks right now. Please ask our staff for details!";
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
            await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
            return { reply, system_action: { ui_navigation: "none" } };
        }

        const sorted = [...withNutrition].sort((a, b) => {
            const nA = a.nutritionInfo || {};
            const nB = b.nutritionInfo || {};
            const valA = rankByCalorie ? Number(nA.baseCalories ?? 9999) : Number(nA.baseSugarG ?? 9999);
            const valB = rankByCalorie ? Number(nB.baseCalories ?? 9999) : Number(nB.baseSugarG ?? 9999);
            return wantHigh ? valB - valA : valA - valB;
        });

        const top = sorted.slice(0, 5);
        const label = rankByCalorie ? "calories" : "sugar";
        const direction = wantHigh ? "highest" : "lowest";
        const reply = `Here are our drinks with the ${direction} base ${label}:`;

        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
        await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });

        return {
            reply,
            recommendedDrinks: formatDrinkCards(top),
            system_action: { ui_navigation: "none" },
        };
    }

    // User Story #32: Recommend beverages based on user message
    if (isRecommendationRequest(safeMessage)) {
        let drinks = await MenuItem.recommendByMessage(safeMessage);

        const msg = safeMessage.toLowerCase();

        const isChocolateRequest =
            msg.includes("choco") ||
            msg.includes("chocolate") ||
            msg.includes("cocoa");

        if (isChocolateRequest) {
            drinks = drinks.filter((drink) => {
                const searchable = [
                    drink.name,
                    drink.category,
                    drink.description,
                    ...(Array.isArray(drink.tags) ? drink.tags : []),
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return (
                    searchable.includes("choco") ||
                    searchable.includes("chocolate") ||
                    searchable.includes("cocoa")
                );
            });
        }

        if (drinks.length > 0) {
            const msg = safeMessage.toLowerCase();
            let intro;
            if (msg.includes("choco") || msg.includes("chocolate") || msg.includes("cocoa")) {
                intro = "Great pick — here are our chocolate drinks!";
            } else if (msg.includes("matcha")) {
                intro = "Love that choice! Here are our matcha options:";
            } else if (msg.includes("strawberry") || msg.includes("cranberry")) {
                intro = "Something fruity — nice! Here's what we have:";
            } else if (msg.includes("taro")) {
                intro = "Taro fan! Here's what we've got for you:";
            } else if (msg.includes("milo")) {
                intro = "A local classic! Here's our Milo option:";
            } else if (msg.includes("jasmine")) {
                intro = "Lovely choice — here are our jasmine drinks:";
            } else if (msg.includes("oolong")) {
                intro = "Great taste — here are our oolong options:";
            } else if (msg.includes("osmanthus")) {
                intro = "A floral favourite — here's what we have:";
            } else if (msg.includes("da hong bao")) {
                intro = "A premium pick — here's our Da Hong Bao option:";
            } else if (msg.includes("milk tea") || msg.includes("milktea")) {
                intro = "Classic milk tea — here's our range:";
            } else if (msg.includes("frappe") || msg.includes("slush")) {
                intro = "Something icy and refreshing — here's what we've got:";
            } else if (msg.includes("latte")) {
                intro = "Here are our latte options:";
            } else {
                intro = "Here are some drinks you might love:";
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

        if (isChocolateRequest) {
            const reply = "Hmm, we don't seem to have any chocolate drinks available at the moment — sorry about that! Can I help you find something else?";

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
        // → return a curated cross-category selection so first-timers always see cards + descriptions
        const allDrinks = await MenuItem.find({ status: "active" }).lean();
        if (allDrinks.length > 0) {
            const featured = allDrinks
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 5);
            const reply = "Great question — here's a little something from across our menu to get you started:";

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

    // User Story #198: View Purchase History
    if (isPurchaseHistoryRequest(safeMessage)) {
        if (!userId) {
            return {
                reply: "You'll need to be logged in to see your purchase history. Log in and I'll pull it up for you!",
                system_action: { ui_navigation: "none" },
            };
        }

        const allOrders = await Payment.getPurchaseHistory(userId);

        if (!allOrders.length) {
            return {
                reply: "Looks like you haven't placed an order with us yet — but there's always a first time! 😊",
                system_action: { ui_navigation: "none" },
            };
        }

        // Check if the customer is asking about a specific date
        const dateQuery = extractDateFromMessage(safeMessage);
        let targetOrder = null;
        let reply = "";

        let matchedOrders = [];
        let title = "";

        if (dateQuery) {
            const { day, month } = dateQuery;
            const currentYear = new Date().getFullYear();
            const monthLabel = new Date(2000, month, 1).toLocaleString("default", { month: "long" });

            // Try current year first, then previous year
            for (const year of [currentYear, currentYear - 1]) {
                matchedOrders = allOrders.filter((order) => {
                    const d = new Date(order.createdAt || order.orderDate);
                    return (
                        d.getDate() === day &&
                        d.getMonth() === month &&
                        d.getFullYear() === year
                    );
                });
                if (matchedOrders.length) break;
            }

            if (!matchedOrders.length) {
                reply = `I couldn't find any orders from ${day} ${monthLabel} in your history. You can check your full purchase history for more details.`;
                await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "user", content: safeMessage });
                await ChatbotSession.appendToConversation(activeConversationId, userId, { role: "assistant", content: reply });
                return { reply, system_action: { ui_navigation: "none" } };
            }

            title = matchedOrders.length > 1
                ? `Your Orders on ${day} ${monthLabel}`
                : `Your Order on ${day} ${monthLabel}`;
            reply = matchedOrders.length > 1
                ? `I found ${matchedOrders.length} orders on ${day} ${monthLabel}.`
                : `Here's your order from ${day} ${monthLabel}.`;
        } else {
            // No date — return most recent order
            matchedOrders = [allOrders[0]];
            title = "Your Most Recent Order";
            reply = "Here's your most recent order.";
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

    // User Story #199: Add to Cart Intent
    if (isAddToCartRequest(safeMessage)) {
        if (!userId) {
            return {
                reply: "You'll need to log in before I can add that to your cart — shouldn't take a second!",
                system_action: { ui_navigation: "none" },
            };
        }

        // #199 - If the customer did not specify any customisation (size / ice / sugar / toppings),
        // fall through to the Gemini ordering flow so it asks step-by-step before adding to cart.
        // Without this guard, "help me to add one jasmine" would silently add with all defaults.
        if (!hasCustomizationWords(safeMessage)) {
            // falls through to the Gemini handler below
        } else {

        let beverageId = await resolveBeverageId(safeMessage);

        if (!beverageId) {
            const lastDrinkName = resolveLastDrinkFromHistory(history);
            if (lastDrinkName) {
                beverageId = await resolveBeverageId(lastDrinkName);
            }
        }

        if (!beverageId) {
            return {
                reply:
                    "Which drink would you like me to add? You can say something like 'add Classic Milk Tea to my cart'.",
                system_action: { ui_navigation: "none" },
            };
        }

        const customization = parseCustomizationFromMessage(safeMessage);

        const cartItem = await CartItem.addToCart(userId, beverageId, { quantity: 1, customization });

        const allCartItems = await CartItem.getCart(userId);
        const cartTotal = allCartItems.reduce((sum, i) => sum + Number(i.lineTotal || 0), 0);

        const menuItem = await MenuItem.findOne({ itemId: beverageId }).lean();
        const nutrition = menuItem ? calculateNutrition(menuItem, customization.sugar, customization.toppings) : null;

        const reply = `${cartItem.name} added to your cart.`;

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
            orderReceipt: {
                drink: {
                    name: cartItem.name,
                    price: cartItem.unitPrice,
                    image: cartItem.image || `/img/bubble_teas/${beverageId}.jpg`,
                },
                customization,
                nutrition,
                recommendedNutrition: (nutrition && (nutrition.grade === "C" || nutrition.grade === "D"))
                    ? calculateNutrition(menuItem, "25% Sugar", customization.toppings || [])
                    : null,
                cartItems: allCartItems.map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    lineTotal: i.lineTotal,
                })),
                total: cartTotal,
            },
        };

        } // end else (has customization)
    }

    // User Story #200: View Cart Intent
    if (isViewCartRequest(safeMessage)) {
        if (!userId) {
            return {
                reply: "You'll need to log in to see your cart. Go ahead and log in and I'll show you what's in there!",
                system_action: { ui_navigation: "none" },
            };
        }

        const { cartItems, cartSummaryHtml, cartTotal } = await buildCartSummary(userId);

        if (!cartItems.length) {
            return {
                reply: "Your cart is empty.",
                cartUpdate: buildCartUpdatePayload([], "Your cart is empty."),
                system_action: { ui_navigation: "none" },
            };
        }

        return {
            reply: "Here's your current cart:",
            cartUpdate: buildCartUpdatePayload(cartItems, "Here's your current cart:"),
            system_action: { ui_navigation: "none" },
        };
    }

    // User Story #201: Clear entire cart through chatbot
    if (isClearCartRequest(safeMessage)) {
        if (!userId) {
            return {
                reply: "You'll need to log in to manage your cart!",
                system_action: { ui_navigation: "none" },
            };
        }
        const allItems = await CartItem.getCart(userId);
        await Promise.all(allItems.map(item => CartItem.removeFromCart(item._id)));
        const reply = "Your cart has been cleared.";
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
    // Target resolution priority: (1) ordinal word → cartItems[n], (2) drink name match,
    // (3) last item from conversation history. For increase/decrease, drink name takes
    // priority over history so "add one more strawberry" doesn't accidentally increment
    // a different item that was last discussed.
    if (isCartUpdateRequest(safeMessage)) {
        if (!userId) {
            return {
                reply: "Please log in first before editing your cart.",
                system_action: { ui_navigation: "none" },
            };
        }

        const intent = getCartUpdateIntent(safeMessage);
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
            const ordinalIndex = extractOrdinalIndex(safeMessage);

            if (ordinalIndex >= 0) {
                if (intent.targetName) {
                    // #201 - "the first milo" → ordinal within name-matched items only,
                    // not the full cart (e.g. "first" = index 0 among Milo items, not cart item 0)
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
                    }
                } else if (ordinalIndex < cartItems.length) {
                    // "the third drink" → ordinal across the full cart
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
                        return {
                            reply: "I found more than one matching item in your cart. Could you be more specific, like 'the second strawberry matcha'?",
                            system_action: { ui_navigation: "none" },
                        };
                    }
                }
                // matches.length === 0 → targetItem stays null → fall through to AI below
            }
        }

        if (!targetItem) {
            // No matching cart item (likely mid-ordering flow) — let AI handle it
        } else if (intent.action === "remove") {
            await CartItem.removeFromCart(targetItem._id);

            cartItems = await CartItem.getCart(userId);

            const reply = "Done! Your cart has been updated.";

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

            const reply = "Done! Your cart has been updated.";

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
        } else if (Object.keys(intent.newCustomization).length === 0 && intent.action === "updateCustomization") {
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

            const menuItem = await MenuItem.findById(targetItem.menuItemId).lean();
            const basePrice = menuItem ? Number(menuItem.price) : 0;
            const newUnitPrice = calculateCartUnitPrice(basePrice, newCustomization);
            const currentQty = Number(targetItem.quantity || 1);

            // If user targets a specific unit ("second drink", "one of them") and qty > 1,
            // split the item so only one unit gets the new customization.
            const hasOrdinal = /\b(one of|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b/i.test(safeMessage);

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

            const reply = `Done! Your cart has been updated.<div class="hidden-last-cart-item" style="display:none;">${targetItem._id}</div>`;

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

    // Default AI response
    const orderDetails = parseOrderDetails(safeMessage);

    // User Story #29: Show health advice
    let nutritionContext = "";
    let nutritionBlock = "";
    let healthCardData = null;

    // Suppress health card when user has responded to the sugar warning (either kept or changed it)
    const isRemainAtSugar = /^remain at \d+%\s*sugar$/i.test(safeMessage.trim());
    const isChangingSugar = /^change to \d+%\s*sugar$/i.test(safeMessage.trim());
    const suppressHealthCard = isRemainAtSugar || isChangingSugar;

    if (orderDetails.sugar) {
        const lastDrinkName = resolveLastDrinkFromHistory(history);
        let drink = null;

        if (lastDrinkName) {
            drink = await findDrinkByName(lastDrinkName);
        }

        if (!drink) {
            drink = await findDrinkByName(safeMessage);
        }

        if (drink) {
            const nutrition = calculateNutrition(
                drink,
                orderDetails.sugar || "100%",
                orderDetails.toppings || []
            );

            if (!suppressHealthCard && (nutrition.grade === "C" || nutrition.grade === "D")) {
                const recommendedSugarLevel = "25%";
                const recommended = calculateNutrition(drink, recommendedSugarLevel, orderDetails.toppings || []);
                healthCardData = {
                    currentSugar: nutrition.sugar,
                    currentGrade: nutrition.grade,
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
    UPDATED HEALTH CONTEXT:
    Drink: ${drink.name}
    Selected Sugar Level: ${orderDetails.sugar || "Not detected"}
    Selected Toppings: ${
                Array.isArray(orderDetails.toppings) && orderDetails.toppings.length > 0
                    ? orderDetails.toppings.join(", ")
                    : "No toppings"
            }

    The nutrition summary is already displayed above your reply.
    Do NOT repeat or restate "Updated Sugar:", "Updated Calories:", or "Updated Nutri-Grade:" in your response.
    Change line and give a brief, gentle health suggestion in 1–2 sentences only.
    Do NOT force the customer to change.
    `;
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

    const systemPrompt = await buildSystemPrompt(safeMessage, nutritionContext + cartContext);

    let reply = await aiClient.generateText(
        safeMessage,
        history,
        systemPrompt
    );

    reply = fixMissingLineBreaks(reply);

    if (nutritionBlock) {
        // Strip any nutrition lines the AI still outputs — backend provides them via nutritionBlock
        reply = reply
            .replace(/Updated\s+Sugar\s*:[^<\n]*/gi, '')
            .replace(/Updated\s+Calories\s*:[^<\n]*/gi, '')
            .replace(/Updated\s+Nutri-?Grade\s*:\s*[A-D][^<\n]*/gi, '')
            .replace(/^(<br\s*\/?>\s*)+/gi, '')
            .trim();
        reply = nutritionBlock + reply;
    }

    const hiddenCartItems = extractHiddenCartData(reply);

    let addedItems = [];
    if (hiddenCartItems.length > 0) {
        if (!userId) {
            reply = cleanAiReply(reply);
            reply += `<br><br>Please log in first before I add this to your cart.`;
        } else {
            addedItems = await addHiddenCartItemsToDatabase(hiddenCartItems, userId);
            reply = cleanAiReply(reply);

            if (addedItems.length > 0) {
                const { cartSummaryHtml, cartTotal } = await buildCartSummary(userId);

                const ADDED_SUGAR_G = {
                    "0% Sugar": 0,
                    "25% Sugar": 10,
                    "50% Sugar": 20,
                    "100% Sugar": 40,
                };

                const orderLines = addedItems.map((item) => {
                    const c = item.customization || {};
                    const drink = item.drinkInfo || {};
                    const nutrition = drink.nutritionInfo || {};

                    const toppings =
                        Array.isArray(c.toppings) && c.toppings.length > 0
                            ? c.toppings.map((t) => t.replace(/\s*\(\+S\$[\d.]+\)/g, "").trim()).join(", ")
                            : "No toppings";

                    const details = [c.size, c.ice, c.sugar, toppings]
                        .filter(Boolean)
                        .join(" · ");

                    const sugarKey = String(c.sugar || "")
                        .replace(/ sugar/i, "")
                        .trim();

                    const baseSugar = Number(nutrition.baseSugarG ?? 0);
                    const addedSugar = ADDED_SUGAR_G[sugarKey] ?? 0;
                    const totalSugar = baseSugar + addedSugar;

                    const calories = Number(nutrition.baseCalories ?? 0);

                    const nutriGrade = nutrition.nutriGrade ?? "N/A";

                    return [
                        `${item.name} - S$ ${Number(item.lineTotal || item.unitPrice || 0).toFixed(2)}`,
                        details,
                        `Sugar: ${totalSugar}g | Calories: ${calories} kcal | Nutri-Grade: ${nutriGrade}`,
                    ].join("<br>");
                });

                const orderTotal = addedItems.reduce(
                    (sum, item) => sum + Number(item.lineTotal || 0),
                    0
                );

                reply = `${addedItems[0]?.name || "Your drink"} added to your cart.`;
            }
        }
    }

    reply = fixMissingLineBreaks(reply);

    // When the user asks for information about drinks (not just ordering or browsing),
    // detect which drinks the AI mentions and surface them as recommendation cards.
    let drinkCardsForInfo = [];
    if (addedItems.length === 0 && isInfoRequest(safeMessage)) {
        try {
            const replyLower = reply.toLowerCase();
            // Cross-reference: a drink must BOTH appear in Gemini's reply AND match the
            // user's own query keywords. This prevents drinks casually mentioned in history
            // (or referenced in passing) from inflating the card list on each follow-up.
            const queryMatches = await MenuItem.recommendByMessage(safeMessage);
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

    // Build orderReceipt when the AI flow successfully added items to cart
    let orderReceipt = null;
    if (addedItems.length > 0) {
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
                image: firstItem.image || `/img/bubble_teas/${drink.itemId || ""}.jpg`,
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



module.exports = {
    handleChatMessage,
};