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

async function isMenuRequest(message) {
  const msg = String(message || "").toLowerCase();

  const keywordMatch =
    msg.includes("menu") ||
    msg.includes("drink") ||
    msg.includes("recommend") ||
    msg.includes("order") ||
    msg.includes("milk tea") ||
    msg.includes("tea") ||
    msg.includes("milo") ||
    msg.includes("chocolate") ||
    msg.includes("matcha") ||
    msg.includes("frappe") ||
    msg.includes("slush") ||
    msg.includes("饮料") ||
    msg.includes("菜单") ||
    msg.includes("推荐") ||
    msg.includes("点");

  if (keywordMatch) return true;

  const drinks = await MenuItem.find({ status: "active" }).select("name itemId tags").lean();

  return drinks.some((drink) => {
    const name = String(drink.name || "").toLowerCase();
    const itemId = String(drink.itemId || "").toLowerCase();
    const tags = Array.isArray(drink.tags)
      ? drink.tags.join(" ").toLowerCase()
      : "";

    return (
      msg.includes(name) ||
      msg.includes(itemId) ||
      name.includes(msg) ||
      tags.includes(msg)
    );
  });
}

async function getMenuBeverages() {
  return MenuItem.find({ status: "active" }).lean();
}

function filterMenu(beverages, message) {
  const msg = String(message || "").toLowerCase();

  if (!msg.trim()) return beverages.slice(0, 8);

  const matched = beverages.filter((item) => {
    const name = String(item.name || "").toLowerCase();
    const category = String(item.category || "").toLowerCase();
    const tags = Array.isArray(item.tags)
      ? item.tags.join(" ").toLowerCase()
      : "";

    return (
      msg.includes(name) ||
      name.includes(msg) ||
      msg.includes(category) ||
      tags.split(" ").some((tag) => tag && msg.includes(tag))
    );
  });

  return matched.length ? matched : beverages.slice(0, 8);
}

async function buildSystemPrompt(userMessage, extraContext = "") {
  const langInstruction = USE_MATCHED_LANGUAGE
    ? "CRITICAL FINAL RULE: You MUST reply in the exact same language as the user's last message. If they spoke Chinese, reply in Chinese. If English, reply in English."
    : "CRITICAL FINAL RULE: You MUST reply in UK English only.";

  let drinkContext = "";

  if (await isMenuRequest(userMessage)) {
    const beverages = await getMenuBeverages();
    const filtered = filterMenu(beverages, userMessage);

    const parseNum = (val) => {
      const n = parseFloat(String(val || "").replace(/[^0-9.]/g, ""));
      return isNaN(n) ? null : n;
    };

    const structuredData = filtered.map((item) => ({
      id: item.itemId || item.id || item._id,
      name: item.name,
      price: item.price,
      calories: parseNum(item.base_calories),
      sugar: parseNum(item.base_sugar_g),
      nutri_grade: item.nutri_grade,
      tags: item.tags,
      image: item.image || `/img/${item.itemId}.png`,
    }));

    drinkContext = `AVAILABLE DRINKS CONTEXT:
${JSON.stringify(structuredData, null, 2)}`;
  } else {
    drinkContext =
      "NOTE: No menu data is loaded for this message. Do not invent drink names. If the user asks for drinks, ask what flavour they are in the mood for.";
  }

  return `
You are Avy, the DripTea Health Advisor. You are a helpful, human-like customer support chatbot for DripTea.

${drinkContext}

${extraContext}

NUTRI-GRADE MATH:
Base Volume is 500ml. Added Sugar: 0%=0g | 25%=10g | 50%=20g | 100%=40g.
Formula: ((Base Sugar + Added Sugar) / 500) * 100 = Xg per 100ml.
Grade A: <=1g | Grade B: >1g to <=5g | Grade C: >5g to <=10g | Grade D: >10g.

CONVERSATION RULES:
1. Reply naturally like a tea shop receptionist.
2. Keep answers short and direct.
3. Only show menu items when the user asks for menu, recommendation, comparison, or order.
4. Only recommend drinks from AVAILABLE DRINKS CONTEXT.
5. Do not invent drink names, IDs, price, sugar, calories, or image path.
6. If the user wants to order, guide them step by step: drink, size, ice, sugar, toppings, cart confirmation.
7. If user already gives all details, summarize the order directly.
8. Use HTML buttons when useful.
9. Never use markdown bullets: no *, no -, no •.
10. CRITICAL: You MUST use <br> tags to separate every line. NEVER output text without <br> between lines.
11. CRITICAL: Every ordering question MUST follow this exact structure:
    [Question sentence]<br><br>[Options line or lines]<br><br>[Closing sentence]
12. Do not generate "View Cart" or "Proceed to Checkout" buttons after final order summary.
13. Backend will generate the final cart buttons.
14. When order is complete, output hidden-cart-data exactly once.

FALLBACK RULE:
If the user's message is unrelated to DripTea, greetings, ordering drinks, menu, cart, checkout, payment, nutrition, store help, or customer support, reply exactly:

I'm sorry, I haven't learned about this yet.<br><br>
Please contact our real barista for further assistance.

ORDERING FLOW:
PHASE 1: Ask or confirm drink selection.
When showing drinks, use this format:
<img src='[image]' alt='[Name]'><br>
**[Name]** (S$ [Price])<br>
Nutri Grade: [Grade] | Sugar: [Sugar]g | Calories: [Calories] kcal<br>
<button onclick='startOrder("[id]")'>Choose This Drink</button><br><br>

PHASE 2: SIZE
REQUIRED FORMAT (MUST FOLLOW EXACTLY):
What size would you like for your [Drink Name]?<br><br>
Regular (S$[price]) / Large (+S$1.50) <br><br>
Please let me know your preferred size.
CRITICAL:
- Put "Regular" and "Large" on ONE line.
- Use " / " between them.
- Do NOT use bullet points.
- Do NOT use buttons.
- Do NOT ignore the <br><br>.

PHASE 3: ICE LEVEL - Ask ice level: Normal Ice, Less Ice, No Ice, or Hot.
REQUIRED FORMAT (copy exactly):
[Acknowledgement]<br><br>Which ice level would you prefer?<br><br>
Normal Ice / Less Ice / No Ice / Hot <br><br>
Please let me know your preferred ice level.
CRITICAL:
- Use " / " between them.
- Do NOT use bullet points.
- Do NOT use buttons.
- Do NOT ignore the <br><br>.

PHASE 4: SUGAR LEVEL
REQUIRED FORMAT (copy exactly):
How much sugar would you like?<br><br>
0% / 25% / 50% / 100% <br><br>
Please let me know your preferred sugar level.
If 50% or 100%, add a short health nudge after.
CRITICAL:
- Put all options on ONE line.
- Use " / " between them.
- Do NOT use bullet points.
- Do NOT use buttons.
- Do NOT remove the <br><br>.

PHASE 5: TOPPINGS
REQUIRED FORMAT (copy exactly):
Would you like any toppings?<br><br>
Pearls (+S$1.00) / Aloe Vera (+S$1.00) / Cheese Foam (+S$1.50) / No toppings <br><br>
Please let me know your topping choice.
Always show topping prices.
CRITICAL:
- Put all options on ONE line.
- Use " / " between them.
- Do NOT use bullet points.
- Do NOT use buttons.
- Do NOT remove the <br><br>.

PHASE 6: Summarize cart item and ask whether to view cart or checkout.
FINAL ORDER SUMMARY FORMAT:
Excellent choice!<br><br>
Here is your order summary:<br>
[Drink Name] - S$[price]<br>
[Size] · [Ice Level] · [Sugar] · [Toppings]<br>
Sugar: [sugar]g | Calories: [calories] kcal | Nutri-Grade: [grade]<br>
Total Price: S$[total]

<div class='hidden-cart-data' style='display:none;'>
[Drink Name] | [Size] · [Ice Level] · [Sugar] · [Toppings] | [price] | [image]
</div>
RULES:
- No bullet points.
- No asterisks.
- No markdown.
- No empty lines between drink details.
- One drink occupies exactly three lines.
- Do NOT ignore the <br>.


${langInstruction}
`;
}

module.exports = {
  buildSystemPrompt,
};