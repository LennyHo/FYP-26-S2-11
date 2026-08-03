// User Story Architecture Trace — chatbot.controller.js

const chatbotService = require("../services/chatbot.service");

async function handleChat(req, res) {
  try {
    const { message, conversationId, userId, isQuickPrompt, image, mimeType, images } = req.body || {};

    if (Array.isArray(images) && images.length > 0) {
      const result = await chatbotService.handleImageMessage({ images, message, conversationId });
      return res.json(result);
    }

    if (image) {
      const result = await chatbotService.handleImageMessage({ images: [{ data: image, mimeType }], message, conversationId });
      return res.json(result);
    }

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
      reply: "Apologies, I'm unable to process your request at the moment. Please try again shortly or take a look in our website for more information.",
      system_action: { ui_navigation: "none" },
    });
  }
}

module.exports = {
    handleChat,
};