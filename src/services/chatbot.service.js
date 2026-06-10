const {
    //isAddToCartRequest,
    extractBeverageId,
    //isViewCartRequest,
} = require("../utils/chatIntent.util");

const aiClient = require("../ai/aiClient");
const ChatbotSession = require("../models/chatbotSession.model");

const { buildSystemPrompt } = require("./prompt.service");
const cartService = require("./cart.service");
const MenuItem = require("../models/menuItem.model");
const purchaseHistoryService = require("./purchaseHistory.service");

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
function calculateNutrition(drink, sugarLevel, toppings = []) {
    const sugarMap = {
        "0%": 0,
        "25%": 10,
        "50%": 20,
        "100%": 40,
    };

    const nutrition = drink.nutritionInfo || {};
    let sugar =
        Number(nutrition.baseSugarG ?? drink.base_sugar_g ?? 0) +
        (sugarMap[sugarLevel] || 0);

    let calories = Number(nutrition.baseCalories ?? drink.base_calories ?? 0);

    if (toppings.includes("Pearls")) {
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

    let grade = "A";

    if (sugar > 5) grade = "B";
    if (sugar > 10) grade = "C";
    if (sugar > 15) grade = "D";

    return {
        sugar,
        calories,
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

    return (
    /add.*cart/.test(msg) ||
    /put.*cart/.test(msg) ||
    /order.*this/.test(msg) ||
    /add\s+[a-z]\d{3}/i.test(msg)
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
// End of User Story #200

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
    if (/no sugar|zero sugar|0\s*%|unsweetened/.test(msg)) sugar = "0%";
    else if (/less sugar|low sugar|少糖|25\s*%/.test(msg)) sugar = "25%";
    else if (/half sugar|medium sugar|50\s*%/.test(msg)) sugar = "50%";
    else if (/normal sugar|full sugar|100\s*%/.test(msg)) sugar = "100%";

    let toppings = null;
    if (/no topping|no toppings|none|without topping/.test(msg)) toppings = [];
    else {
    const found = [];
        if (/pearl|pearls|tapioca/.test(msg)) found.push("Pearls");
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
        // NEW: fix "?Regular" → "?<br><br>Regular"
        .replace(/\?(Regular|Large)/gi, "?<br><br>$1")
        // NEW: fix "Large (+S$1.50)Please" → "Large (+S$1.50)<br><br>Please"
        .replace(/(\+S\$[0-9.]+\))(Please|Let|Kindly)/gi, "$1<br><br>$2")
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
            `<p>           </p>` +
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

    // User Story #198: View Purchase History
    if (isPurchaseHistoryRequest(safeMessage)) {
        if (!userId) {
            return {
                reply: "Please log in first before viewing your purchase history.",
                system_action: { ui_navigation: "none" },
            };
        }

        const purchaseHistory = await purchaseHistoryService.getPurchaseHistory(userId);
        const latestOrder = purchaseHistory[0];

        if (!latestOrder) {
            return {
                reply:
                    'You have no purchase history yet.<br><br><button class="chat-nav-btn-compact" onclick="handleMenu()">Browse Menu</button>',
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
            `<button class="chat-nav-btn-compact" onclick="handlePurchaseHistory()">View Full Purchase History</button>`;

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

        const reply =
            `${cartItem.name} has been added to your cart.<br><br>` +
            `Added to your cart successfully.<br><br>` +
            `<button class="chat-nav-btn-compact" onclick="handleCart()">View Cart</button><br><br>` +
            `<button class="chat-nav-btn-compact" onclick="handleCheckout()">Proceed to Checkout</button>`;

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

    // User Story #200: View Cart Intent
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

    // Default AI response
    const orderDetails = parseOrderDetails(safeMessage);

    // User Story #29: Show health advice
    let nutritionContext = "";

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
                    "0%": 0,
                    "25%": 10,
                    "50%": 20,
                    "100%": 40,
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
    };
}



module.exports = {
    handleChatMessage,
};