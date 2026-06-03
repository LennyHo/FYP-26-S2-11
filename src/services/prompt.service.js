const MenuItem = require("../models/menuItem.model");

const CHAT_LANGUAGE_MODE = String(process.env.CHAT_LANGUAGE_MODE || "english")
  .trim()
  .toLowerCase();

const USE_MATCHED_LANGUAGE =
  CHAT_LANGUAGE_MODE === "match" || CHAT_LANGUAGE_MODE === "same";

function getLanguageInstruction() {
  if (USE_MATCHED_LANGUAGE) {
    return "Reply in the same language as the user's latest message.";
  }

  return "Reply in UK English only.";
}

async function buildSystemPrompt(userMessage, extraContext = "") {
  const menuItems = await MenuItem.find({ status: "active" })
    .select("itemId name price category description image tags nutritionInfo")
    .lean();

  const menuContext = menuItems.map((item) => ({
    id: item.itemId,
    name: item.name,
    price: item.price,
    category: item.category,
    image: item.image,
    description: item.description,
    tags: item.tags || [],
    calories: item.nutritionInfo?.baseCalories || 0,
    sugar: item.nutritionInfo?.baseSugarG || 0,
  }));

  return `
You are Avy, the DripTea chatbot.

ROLE:
You help customers browse drinks, add drinks to cart, check cart, and proceed to checkout.

AVAILABLE MENU:
${JSON.stringify(menuContext, null, 2)}

SYSTEM CONTEXT:
${extraContext || "No extra context."}

RULES:
1. Be friendly, short, and natural.
2. Do not invent drinks that are not in AVAILABLE MENU.
3. If an item was added to cart by backend, confirm it clearly.
4. If user asks about cart, only use cart context given by backend.
5. Do not claim an item is added unless backend context says it was added.
6. Use simple HTML only when needed.
7. If a View Cart button is provided in SYSTEM CONTEXT, reproduce it EXACTLY.
8. If a Checkout button is provided in SYSTEM CONTEXT, reproduce it EXACTLY.
9. Do not modify button HTML.

${getLanguageInstruction()}
`;
}

module.exports = {
  buildSystemPrompt,
};