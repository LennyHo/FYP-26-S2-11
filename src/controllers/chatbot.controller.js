// User Story Architecture Trace — chatbot.controller.js
//
// #25  Chat with AI Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: chatbotSession.model.js
//
// #26  Navigate Website via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js
//
// #27  Search Beverages via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: menuItem.model.js
//
// #28  Track Order Status
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: order.model.js
//
// #29  High Sugar Warning via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: menuItem.model.js
//
// #31  Nutritional Grading via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: menuItem.model.js
//
// #32  Get Recommendations via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: menuItem.model.js
//
// #196 Preferred Language
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js
//
// #197 Speak to Chatbot (Voice Input)
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Gemini API / Groq API (fallback) → Model: chatbotSession.model.js
//
// #198 Purchase History via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: payment.model.js
//
// #199 Add to Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: menuItem.model.js, cartItem.model.js
//
// #200 View Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: cartItem.model.js
//
// #201 Edit Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: cartItem.model.js
//
// #202 Check Vouchers via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: Voucher.Model
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: order.model.js
//
// #304 Track Delivery Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js (this file) → Svc: chatbot.service.js → Model: order.model.js
//
// #308 Feedback via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: feedback.model.js, menuItem.model.js

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