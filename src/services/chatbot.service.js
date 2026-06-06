const {
    isAddToCartRequest,
    extractBeverageId,
    isViewCartRequest,
} = require("../utils/chatIntent.util");

const aiClient = require("../ai/aiClient");
const ChatbotSession = require("../models/chatbotSession.model");

const { buildSystemPrompt } = require("./prompt.service");
const cartService = require("./cart.service");
const MenuItem = require("../models/menuItem.model");

async function findDrinkByName(message) {
    const msg = String(message || "").toLowerCase();

    const drinks = await MenuItem.find({
    status: "active",
    }).lean();

    return drinks.find((drink) =>
    msg.includes(String(drink.name || "").toLowerCase())
    );
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
        .trim();
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

    const cartItem = await cartService.addToCart(userId, drink.itemId, {
        quantity: 1,
        customization,
    });

    cartItem.drinkInfo = drink;
    cartItem.menuItemCode = drink.itemId;

    addedItems.push(cartItem);
    }

    return addedItems;
}

async function buildCartSummary(userId) {
    const cartItems = await cartService.getCart(userId);

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

// User Story #32: Recommend beverages based on user message
function isRecommendationRequest(message) {
    const msg = String(message || "").toLowerCase();

    return (
        msg.includes("recommend") ||
        msg.includes("recommendation") ||
        msg.includes("suggest") ||
        msg.includes("what should i drink") ||
        msg.includes("i like")
    );
}

function formatDrinkCards(drinks) {
    return drinks.map((drink) => ({
        id: drink.itemId,
        name: drink.name,
        category: drink.category,
        price: drink.price,
        description: drink.description,
        image: drink.image || `/img/bubble_teas/${drink.itemId}.png`,
        tags: drink.tags || [],
}));
}
// End of User Story #32


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

    // User Story #32: Recommend beverages based on user message
    if (isRecommendationRequest(safeMessage)) {
        const drinks = await MenuItem.recommendByMessage(safeMessage);

        if (drinks.length > 0) {
            const reply = "Here are some drinks you may like:";

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
    }

    if (isViewCartRequest(safeMessage)) {
    if (!userId) {
        return {
        reply: "Please log in first before viewing your cart.",
        system_action: { ui_navigation: "none" },
        };
    }

    // User Story #200: View Cart Intent
    const { cartItems, cartSummaryHtml, cartTotal } = await buildCartSummary(userId);

    if (!cartItems.length) {
        return {
        reply:
        'Your cart is currently empty.<br><br><button class="chat-nav-btn-compact" onclick="handleMenu()">Browse Menu</button>',
        system_action: { ui_navigation: "none" },
        };
    }

return {
        reply: `
Your current cart:<br><br>
${cartSummaryHtml}<br><br>
Total: S$ ${cartTotal.toFixed(2)}<br><br>
<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button><br><br>
<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>
        `,
        system_action: { ui_navigation: "none" },
    };
    }

    if (isAddToCartRequest(safeMessage)) {
    if (!userId) {
        return {
        reply: "Please log in first before adding items to your cart.",
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

    const cartItem = await cartService.addToCart(userId, beverageId, {
        quantity: 1,
        customization: {
        size: "Regular",
        ice: "Normal Ice",
        sugar: "Normal Sweet",
        toppings: [],
        },
    });

    const { cartSummaryHtml, cartTotal } = await buildCartSummary(userId);

    let reply = `${cartItem.name} has been added to your cart.`;

    reply = cleanAiReply(reply);

reply += `
<br><br>
Added to your cart successfully.<br><br>
<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button>
<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>
`;

    appendToConversation(history, { role: "user", content: safeMessage });
    appendToConversation(history, { role: "assistant", content: reply });

    return {
        reply,
        system_action: { ui_navigation: "none" },
    };
    }

    const systemPrompt = await buildSystemPrompt(safeMessage);

    let reply = await aiClient.generateText(
        safeMessage,
        history,
        systemPrompt
        );

    reply = fixMissingLineBreaks(reply);

    const hiddenCartItems = extractHiddenCartData(reply);

    if (hiddenCartItems.length > 0) {
        console.log("[ChatbotService] hiddenCartItems:", hiddenCartItems);
        if (!userId) {
            reply = cleanAiReply(reply);
            reply += `<br><br>Please log in first before I add this to your cart.`;
        } else {
            const addedItems = await addHiddenCartItemsToDatabase(hiddenCartItems, userId);
            reply = cleanAiReply(reply);

            if (addedItems.length > 0) {
                const { cartSummaryHtml, cartTotal } = await buildCartSummary(userId);

                const ADDED_SUGAR_G = {
                    "0%": 0,
                    "25%": 10,
                    "50%": 20,
                    "100%": 40,
                };

                const orderLines = addedItems.map((item) => {
                    console.log("[OrderSummary] drinkInfo:", item.drinkInfo);
                    console.log("[OrderSummary] customization:", item.customization);
                    const c = item.customization || {};
                    const drink = item.drinkInfo || {};

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
                    const nutrition = drink.nutritionInfo || {};

                    const baseSugar = Number(
                    nutrition.baseSugarG ??
                    drink.base_sugar_g ??
                    0
                    );
                    const addedSugar = ADDED_SUGAR_G[sugarKey] ?? 0;
                    const totalSugar = baseSugar + addedSugar;

                    const calories = Number(
                    nutrition.baseCalories ??
                    drink.base_calories ??
                    0
                    );

                    const nutriGrade =
                    nutrition.nutriGrade ??
                    drink.nutri_grade ??
                    "N/A";

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
                    `Here is your order summary:<br>` +
                    `${orderLines.join("<br><br>")}<br><br>` +
                    `Total Price: S$ ${orderTotal.toFixed(2)}<br><br>` +
                    `Added to your cart successfully.<br><br>` +
                    `Your current cart:<br>` +
                    `${cartSummaryHtml}<br><br>` +
                    `Total: S$ ${cartTotal.toFixed(2)}<br><br>` +
                    `<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button><br><br>` +
                    `<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>`;
                }
        }
    }

    await ChatbotSession.appendToConversation(activeConversationId, userId, {
        role: "user",
        content: safeMessage,
    });

    await ChatbotSession.appendToConversation(activeConversationId, userId, {
        role: "assistant",
        content: reply,
    });

    // User Story #32: Attach drink cards when AI responds to a recommendation request
    let recommendedDrinks = [];
    if (isRecommendationRequest(safeMessage)) {
        const drinks = await MenuItem.recommendByMessage(safeMessage);
        if (drinks.length > 0) {
            recommendedDrinks = formatDrinkCards(drinks);
        }
    }

    return {
    reply,
    ...(recommendedDrinks.length > 0 && { recommendedDrinks }),
    system_action: { ui_navigation: "none" },
    };
}



module.exports = {
    handleChatMessage,
};