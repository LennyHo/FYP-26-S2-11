const {
    isAddToCartRequest,
    extractBeverageId,
    isViewCartRequest,
} = require("../utils/chatIntent.util");

const aiClient = require("../ai/aiClient");
const {
    getConversationHistory,
    appendToConversation,
} = require("../utils/conversationMemory");

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

function cleanAiReply(reply) {
    return String(reply || "")
    .replace(/<div class=['"]hidden-cart-data['"][^>]*>[\s\S]*?<\/div>/i, "")
    .trim();
}

function fixMissingLineBreaks(reply) {
    return String(reply || "")
        // Add <br><br> after ? when followed directly by a letter or ( with no break already there
        .replace(/\?(?!<br)([A-Za-z(])/g, "?<br><br>$1")
        // Add <br><br> before "Please let me know" when preceded by a non-tag character
        .replace(/([^>])\s*(Please let me know)/gi, "$1<br><br>$2");
}

    async function addHiddenCartItemsToDatabase(hiddenCartItems, userId) {
        const addedItems = [];
        
        // Test
        console.log("[ChatbotService] userId for add cart:", userId);

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

    async function handleChatMessage({ message, conversationId, userId }) {
        const safeMessage = String(message || "").trim();

        if (!safeMessage) {
        return {
            reply: "Please send a message.",
            system_action: { ui_navigation: "none" },
        };
        }

        const history = getConversationHistory(conversationId || "default");

        if (isViewCartRequest(safeMessage)) {
        if (!userId) {
            return {
            reply: "Please log in first before viewing your cart.",
            system_action: { ui_navigation: "none" },
            };
        }

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

    const beverageId = await resolveBeverageId(safeMessage);

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

            reply += `
<br><br>
Added to your cart successfully.<br><br>
Your current cart:<br>
${cartSummaryHtml}<br><br>
Total: S$ ${cartTotal.toFixed(2)}<br><br>
<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button><br><br>
<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>
`;
        }
    }
    }

    appendToConversation(history, { role: "user", content: safeMessage });
    appendToConversation(history, { role: "assistant", content: reply });

    return {
    reply,
    system_action: { ui_navigation: "none" },
    };
}

module.exports = {
    handleChatMessage,
};