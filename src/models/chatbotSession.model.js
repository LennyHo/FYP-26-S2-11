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