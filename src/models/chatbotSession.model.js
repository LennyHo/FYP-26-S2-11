// User Story Architecture Trace — chatbotSession.model.js
//
// #25  Chat with AI Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #26  Navigate Website via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #27  Search Beverages via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #28  Track Order Status
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #29  High Sugar Warning via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #31  Nutritional Grading via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #32  Get Recommendations via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #196 Preferred Language
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #197 Speak to Chatbot (Voice Input)
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Gemini API / Groq API (fallback) → Model: chatbotSession.model.js (this file)
//
// #198 Purchase History via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #199 Add to Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #200 View Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #201 Edit Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #202 Check Vouchers via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)
//
// #304 Track Delivery Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: chatbotSession.model.js (this file)

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    },
    { _id: false, timestamps: true }
);

const chatbotSessionSchema = new mongoose.Schema(
    {
    conversationId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    messages: {
        type: [messageSchema],
        default: [],
    },
    },
    { timestamps: true, collection: "chatbot_sessions" }
);

chatbotSessionSchema.statics.getConversationHistory = async function getConversationHistory(conversationId) {
    const session = await this.findOne({ conversationId }).lean();
    return session?.messages || [];
};

chatbotSessionSchema.statics.appendToConversation = async function appendToConversation(conversationId, userId, message) {
    await this.findOneAndUpdate(
    { conversationId },
    {
        $setOnInsert: {
        conversationId,
        userId: userId || null,
        },
        $push: {
        messages: message,
        },
    },
    { upsert: true, returnDocument: "after" }
    );
};

module.exports = mongoose.model("ChatbotSession", chatbotSessionSchema);