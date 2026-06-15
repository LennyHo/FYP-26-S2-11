const chatbotService = require("../services/chatbot.service");

// #25  - As a customer, I want to chat with the AI chatbot so that I can get help with ordering and menu questions.
// #26  - As a customer, I want to ask a chatbot to navigate throughout the website so that I can look for what I need.
// #27  - As a customer, I want to search for beverages using the AI chatbot so that I can find what I want quickly.
// #28  - As a customer, I want to track my order status so that I know when my drink will be ready.
// #29  - As a customer, I want the chatbot to inform me when my chosen drink has a high sugar level.
// #31  - As a customer, I want the chatbot to show me the nutritional grading of each beverage.
// #32  - As a customer, I want to get the recommendations from chatbot so that I can complete my order.
// #197 - As a customer, I want to speak to the chatbot so that I can interact conveniently.
// #198 - As a customer, I want to browse my purchase history through the chatbot.
// #199 - As a customer, I want to add beverages into my cart through the chatbot.
// #200 - As a customer, I want to view my cart through the chatbot.
// #201 - As a customer, I want to edit items in my cart through the chatbot.
// #203 - As a customer, I want to track my order status through the chatbot.
// Routes the message to chatbot.service.js → detects intent → reads menu_items / cart_items / orders
// → builds AI prompt → calls Gemini API → writes to chatbot_sessions → returns reply.
async function handleChat(req, res) {
    try {
    const { message, conversationId, userId, isQuickPrompt } = req.body || {};

    const result = await chatbotService.handleChatMessage({
        message,
        conversationId,
        userId,
        isQuickPrompt: !!isQuickPrompt,
    });

    return res.json(result);
  } catch (error) {
    console.error("[ChatbotController] handleChat error:", error.message);

    return res.status(500).json({
      reply: "Kitchen is busy, please try again.",
      system_action: { ui_navigation: "none" },
    });
  }
}

module.exports = {
    handleChat,
};