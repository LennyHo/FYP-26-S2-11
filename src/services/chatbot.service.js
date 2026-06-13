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
// User Story #25: Chat with Chatbot
async function getConversationHistory(conversationId) {
    return ChatbotSession.getConversationHistory(conversationId);
}
// End of User Story #25

// User Story #29: Get Health Advice from Chatbot
// User Story #31: Ask About Nutri-Grade
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

// User Story #31: Ask About Nutri-Grade
function isNutriGradeQuestion(message) {
    const msg = String(message || "").toLowerCase();

    return (
        msg.includes("nutri grade") ||
        msg.includes("nutri-grade") ||
        msg.includes("nutrition grade")
    );
}
// End of User Story #31

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

// User Story #32: Recommend beverages based on user message
function isRecommendationRequest(message) {
    const msg = String(message || "").toLowerCase();

    // Specific order with customization details → not a recommendation
    if (hasCustomizationWords(msg)) return false;

    return (
        msg.includes("recommend") ||
        msg.includes("recommendation") ||
        msg.includes("suggest") ||
        msg.includes("what should i drink") ||
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
        msg.includes("what do you have")
    );
}

function formatDrinkCards(drinks) {
    return drinks.map((drink) => {
        const nutrition = drink.nutritionInfo || {};
        return {
            id: drink.itemId,
            name: drink.name,
            category: drink.category,
            price: drink.price,
            description: drink.description,
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

// User Story #198: View Purchase History
function isPurchaseHistoryRequest(message) {
    const msg = String(message || "").toLowerCase();

    return (
        msg.includes("purchase history") ||
        msg.includes("order history") ||
        msg.includes("latest order") ||
        msg.includes("last order") ||
        msg.includes("my purchases") ||
        msg.includes("my orders")
    );
}
// End of User Story #198

// User Story #199: Add to Cart Intent
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

async function resolveBeverageId(message) {
    let beverageId = extractBeverageId(message);

    if (!beverageId) {
    const drink = await findDrinkByName(message);

    if (drink) {
        beverageId = drink.itemId;
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

// User Story #200: View Cart
function isViewCartRequest(message) {
    const msg = String(message || "").toLowerCase();

    return (
        msg.includes("view cart") ||
        msg.includes("check cart") ||
        msg.includes("show cart") ||
        msg.includes("my cart") ||
        msg.includes("cart items") ||
        msg.includes("what is in my cart") ||
        msg.includes("what's in my cart")
    );
}

async function buildCartSummary(userId) {
    const cartItems = await CartItem.getCart(userId);

    const groupedItems = {};

    cartItems.forEach((item) => {
    const key = JSON.stringify({
        name: item.name,
        customization: item.customization || {},
    });

    if (!groupedItems[key]) {
        groupedItems[key] = {
        name: item.name,
        quantity: 0,
        total: 0,
        };
    }

    groupedItems[key].quantity += Number(item.quantity || 1);
    groupedItems[key].total += Number(item.lineTotal || 0);
    });

    const cartSummaryHtml = Object.values(groupedItems)
    .map((item) => `${item.name} × ${item.quantity} - S$ ${item.total.toFixed(2)}`)
    .join("<br>");

    const cartTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.lineTotal || 0),
    0
    );

    return {
    cartItems,
    cartSummaryHtml,
    cartTotal,
    };
}
// End of User Story #200

// User Story #201
function isCartUpdateRequest(message) {
    const msg = String(message || "").toLowerCase();

    const hasEditVerb = (
        msg.includes("remove") ||
        msg.includes("delete") ||
        msg.includes("increase") ||
        msg.includes("decrease") ||
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
        hasCustomizationWords(msg)
    );

    return hasEditVerb && hasDrinkOrCartRef;
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

    if (msg.includes("classic milk tea")) intent.targetName = "Classic Milk Tea";
    else if (msg.includes("milk tea")) intent.targetName = "Classic Milk Tea";
    else if (msg.includes("milo dinosaur")) intent.targetName = "Milo Dinosaur";
    else if (msg.includes("milo")) intent.targetName = "Milo Dinosaur";
    else if (msg.includes("double chocolate frappe")) intent.targetName = "Double Chocolate Frappe";
    else if (msg.includes("frappe")) intent.targetName = "Double Chocolate Frappe";
    else if (msg.includes("taro slush")) intent.targetName = "Taro Slush";
    else if (msg.includes("taro")) intent.targetName = "Taro Slush";
    else if (msg.includes("matcha latte")) intent.targetName = "Matcha Latte";
    else if (msg.includes("matcha")) intent.targetName = "Matcha Latte";
    else if (msg.includes("jasmine")) intent.targetName = "Jasmine Matcha Tea";

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

function buildCartSummaryReply(cartItems) {
    if (!cartItems.length) {
        return `Your cart is now empty.<br><br><button class="chat-nav-btn-compact" onclick="handleMenu()">Browse Menu</button>`;
    }

    const lines = cartItems.map((item, index) => {
        const c = item.customization || {};
        const toppings =
            Array.isArray(c.toppings) && c.toppings.length > 0
                ? c.toppings.join(", ")
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

    return (
        `Done! Your cart has been updated.<br><br>` +
        lines.join("<br><br>") +
        `<br><br><strong>Total: S$ ${total.toFixed(2)}</strong><br><br>` +
        `<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button>&nbsp;` +
        `<button class="chat-nav-btn-compact" onclick="handleCheckout()">Checkout</button>`
    );
}
// End of User Story #201

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

    const toppings = parts.filter(
    (part) =>
        !/medium|large|regular/i.test(part) &&
        !/normal ice|less ice|no ice|hot/i.test(part) &&
        !/0%|25%|50%|100%|normal sweet/i.test(part) &&
        !/no toppings/i.test(part)
    );

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
            let reply;
            if (msg.includes("choco") || msg.includes("chocolate")) {
                reply = "Great pick — here are our chocolate drinks!";
            } else if (msg.includes("matcha")) {
                reply = "Love that choice! Here are our matcha drinks:";
            } else if (msg.includes("fruit") || msg.includes("strawberry") || msg.includes("cranberry")) {
                reply = "Something fruity — nice! Here's what we have:";
            } else if (msg.includes("taro")) {
                reply = "Taro fan! Here's what we've got for you:";
            } else {
                reply = "Here are some drinks you might love:";
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
    }

    // User Story #198: View Purchase History
    if (isPurchaseHistoryRequest(safeMessage)) {
        if (!userId) {
            return {
                reply: "You'll need to be logged in to see your purchase history. Log in and I'll pull it up for you!",
                system_action: { ui_navigation: "none" },
            };
        }

        const purchaseHistory = await Payment.getPurchaseHistory(userId);
        const latestOrder = purchaseHistory[0];

        if (!latestOrder) {
            return {
                reply:
                    'Looks like you haven\'t placed an order with us yet — but there\'s always a first time! 😊<br><br><button class="chat-nav-btn-compact" onclick="handleMenu()">Browse Menu</button>',
                system_action: { ui_navigation: "none" },
            };
        }

        const itemsHtml = latestOrder.items
            .map((item) => {
                const c = item.customization || {};
                const toppings =
                    Array.isArray(c.toppings) && c.toppings.length > 0
                        ? c.toppings.join(", ")
                        : "No toppings";

                const details = [c.size, c.ice, c.sugar, toppings]
                    .filter(Boolean)
                    .join(" · ");

                return `${item.name} × ${item.quantity}  <br>${details}  <br>S$ ${Number(item.lineTotal || 0).toFixed(2)}`;
            })
            .join("<br><br>");

        const reply =
            `<strong>Your Most Recent Order</strong><br><br>` +
            `Order #${latestOrder.displayOrderNo || latestOrder.orderNo} <br><br>` +
            `<p>           </p>` + 
            `Order Status: ${latestOrder.status}<br>` +
            `<p>           </p>` +
            `Payment Status: ${latestOrder.paymentStatus || "Paid"}<br><br>` +
            `<p>           </p>` + 
            `<strong>Items Ordered</strong><br>` +
            `${itemsHtml}<br><br>` +
            `<p>           </p>` + 
            `<strong>Total Paid:</strong> S$ ${Number(latestOrder.totalAmount || 0).toFixed(2)}<br><br>` +
            `<a class="chat-nav-btn-compact" href="/purchase-history">View Full Purchase History</a>`;

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

    // User Story #199: Add to Cart Intent
    if (isAddToCartRequest(safeMessage)) {
        if (!userId) {
            return {
                reply: "You'll need to log in before I can add that to your cart — shouldn't take a second!",
                system_action: { ui_navigation: "none" },
            };
        }

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
                cartItems: allCartItems.map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    lineTotal: i.lineTotal,
                })),
                total: cartTotal,
            },
        };
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
                reply:
                    'Your cart is empty right now — want to find something good to add?<br><br><button class="chat-nav-btn-compact" onclick="handleMenu()">Browse Menu</button>',
                system_action: { ui_navigation: "none" },
            };
        }

        return {
            reply:
                `Your current cart:<br><br>` +
                `<p>           </p>` +
                `${cartSummaryHtml}<br><br>` +
                `<p>           </p>` +
                `Total: S$ ${cartTotal.toFixed(2)}<br><br>` +
                `<p>           </p>` +
                `<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button><br><br>` +
                `<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>`,
            system_action: { ui_navigation: "none" },
        };
    }

    // User Story #201: Edit cart item through chatbot
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
            const lastCartItemId = resolveLastCartItemIdFromHistory(history);

            if (lastCartItemId) {
                targetItem = cartItems.find(
                    item => String(item._id) === String(lastCartItemId)
                );
            }
        }

        if (!targetItem) {
            const matches = findTargetCartItem(cartItems, intent);

            if (matches.length > 1) {
                // No drink name specified — default to the most recently added item
                // (cartItems is sorted newest-first by getCart)
                if (!intent.targetName) {
                    targetItem = matches[0];
                } else {
                    return {
                        reply: "I found more than one matching item in your cart. Please be more specific.",
                        system_action: { ui_navigation: "none" },
                    };
                }
            } else if (matches.length === 1) {
                targetItem = matches[0];
            }
            // matches.length === 0 → targetItem stays null → fall through to AI below
        }

        if (!targetItem) {
            // No matching cart item (likely mid-ordering flow) — let AI handle it
        } else if (intent.action === "remove") {
            await CartItem.removeFromCart(targetItem._id);

            cartItems = await CartItem.getCart(userId);

            const reply = buildCartSummaryReply(cartItems);

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
                showViewCart: true,
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

            const reply = buildCartSummaryReply(cartItems);

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
                showViewCart: true,
                system_action: { ui_navigation: "none" },
            };
        } else {
            const newCustomization = {
                ...(targetItem.customization || {}),
                ...intent.newCustomization,
            };

            // Look up the true menu item base price so a previously-corrupted
            // unitPrice in the DB doesn't compound the error.
            const menuItem = await MenuItem.findById(targetItem.menuItemId).lean();
            const basePrice = menuItem ? Number(menuItem.price) : 0;
            const unitPrice = calculateCartUnitPrice(basePrice, newCustomization);
            const lineTotal = unitPrice * Number(targetItem.quantity || 1);

            await CartItem.updateCartItem(targetItem._id, {
                customization: newCustomization,
                unitPrice,
                lineTotal,
            });

            cartItems = await CartItem.getCart(userId);

            const reply = buildCartSummaryReply(cartItems)+
            `<div class="hidden-last-cart-item" style="display:none;">${targetItem._id}</div>`;

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
                showViewCart: true,
                system_action: { ui_navigation: "none" },
            };
        }
    }
    // End of User Story #201

    // Default AI response
    const orderDetails = parseOrderDetails(safeMessage);

    // User Story #29: Show health advice
    let nutritionContext = "";
    let healthCardData = null;

    if (orderDetails.sugar || orderDetails.toppings) {
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

            if (nutrition.grade === "C" || nutrition.grade === "D") {
                const recommended = calculateNutrition(drink, "25%", orderDetails.toppings || []);
                healthCardData = {
                    currentSugar: nutrition.sugar,
                    recommendedSugar: recommended.sugar,
                    recommendedGrade: recommended.grade,
                };
            }

            nutritionContext = `
    UPDATED HEALTH CONTEXT:
    The customer selected sugar or toppings.

    Drink: ${drink.name}
    Selected Sugar Level: ${orderDetails.sugar || "Not detected"}
    Selected Toppings: ${
                Array.isArray(orderDetails.toppings) && orderDetails.toppings.length > 0
                    ? orderDetails.toppings.join(", ")
                    : "No toppings"
            }

    Updated Sugar: ${nutrition.sugar}g
    Updated Calories: ${nutrition.calories} kcal
    Updated Nutri-Grade: ${nutrition.grade}

    Give a gentle health suggestion only.
    Do NOT force the customer to change.
    Use <br> tags between lines.
    `;
        }
    }

    const systemPrompt = await buildSystemPrompt(safeMessage, nutritionContext);

    let reply = await aiClient.generateText(
        safeMessage,
        history,
        systemPrompt
    );

    reply = fixMissingLineBreaks(reply);

    const hiddenCartItems = extractHiddenCartData(reply);

    if (hiddenCartItems.length > 0) {
        if (!userId) {
            reply = cleanAiReply(reply);
            reply += `<br><br>Please log in first before I add this to your cart.`;
        } else {
            const addedItems = await addHiddenCartItemsToDatabase(hiddenCartItems, userId);
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
                            ? c.toppings.join(", ")
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

                reply =
                    `Excellent choice!<br><br>` +
                    `<p>           </p>` +
                    `Here is your order summary:<br><br>` +
                    `<p>           </p>` +
                    `${orderLines.join("<br><br>")}<br><br>` +
                    `<p>           </p>` +
                    `Total Price: S$ ${orderTotal.toFixed(2)}<br><br>` +
                    `<p>           </p>` +
                    `Added to your cart successfully.<br><br>` +
                    `<p>           </p>` +
                    `Your current cart:<br>` +
                    `<p>           </p>` +
                    `${cartSummaryHtml}<br><br>` +
                    `<p>           </p>` +
                    `Total: S$ ${cartTotal.toFixed(2)}<br><br>` +
                    `<p>           </p>` +
                    `<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button><br><br>` +
                    `<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>`;
            }
        }
    }

    reply = fixMissingLineBreaks(reply);

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
        healthCard: healthCardData,
    };
}



module.exports = {
    handleChatMessage,
};