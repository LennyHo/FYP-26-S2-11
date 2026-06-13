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

// #25  - As a customer, I want to chat with the AI chatbot so that I can get help with ordering and menu questions.
// #26  - As a customer, I want to ask a chatbot to navigate throughout the website.
// #27  - As a customer, I want to search for beverages using the AI chatbot.
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
// Collection: chatbot_sessions — stores conversationId, userId, and full messages array (role + content).
// Each POST /api/chat reads history here and appends both the user message and AI reply.
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