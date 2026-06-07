const chatbotService = require("../services/chatbot.service");

// Fallback system for entire chatbot
async function handleChat(req, res) {
    try {
    const { message, conversationId, userId } = req.body || {};

    const result = await chatbotService.handleChatMessage({
        message,
        conversationId,
        userId,
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