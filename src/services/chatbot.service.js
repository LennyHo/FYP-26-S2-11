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

        const cartItems = await cartService.getCart(userId);

        if (!cartItems.length) {
        return {
            reply:
            "Your cart is currently empty.<br><br><button class=\"chat-nav-btn-compact\" onclick=\"handleMenu()\">Browse Menu</button>",
            system_action: { ui_navigation: "none" },
        };
        }

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
        .map(
            (item) =>
            `• ${item.name} × ${item.quantity} - S$ ${item.total.toFixed(2)}`
        )
        .join("<br>");

        const cartTotal = cartItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
        );

        return {
        reply: `
        Your current cart:<br><br>
        ${cartSummaryHtml}<br><br>
        Total: S$ ${cartTotal.toFixed(2)}<br><br>

        <button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button>
        <br><br>
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

    const cartItems = await cartService.getCart(userId);

    const cartTotal = cartItems.reduce((sum, item) => {
    return sum + Number(item.lineTotal || 0);
    }, 0);
    
    const extraContext = `
Cart update status:
Success

Recently added item:
${JSON.stringify(cartItem, null, 2)}

Important:
Only confirm that the drink was added.
Do NOT list the cart contents.
Do NOT show total price.
Do NOT generate any buttons.
`;

    const systemPrompt = await buildSystemPrompt(safeMessage, extraContext);

    const aiPrompt = `
Customer message:
${safeMessage}

Generate the chatbot response using the required response format.
`;

    let reply;

    try {
        reply = await aiClient.generateText(aiPrompt, history, systemPrompt);
    } catch (error) {
        console.warn("[ChatbotService] AI confirmation failed:", error.message);
        reply = `${cartItem.name} has been added to your cart. Would you like to add another drink or check your cart?`;
    }

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
    .map((item) => {
    return `• ${item.name} × ${item.quantity} - S$ ${item.total.toFixed(2)}`;
    })
    .join("<br>");

reply += `
<br><br>
Your current cart:<br>
${cartSummaryHtml}<br><br>
Total: S$ ${cartTotal.toFixed(2)}<br><br>
<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button><br><br>
Would you like to add another drink or proceed to checkout?<br><br>
<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>
`;

    appendToConversation(history, { role: "user", content: safeMessage });
    appendToConversation(history, { role: "assistant", content: reply });

    return {
        reply,
        system_action: { ui_navigation: "none" },
    };
    }

    return {
    reply: "Hi! I can help you with the menu or add drinks to your cart.",
    system_action: { ui_navigation: "none" },
    };
}

module.exports = {
  handleChatMessage,
};