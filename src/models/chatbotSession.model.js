// User Story Architecture Trace — chatbotSession.model.js

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
    // Drinks named in a multi-drink message that are still waiting for their turn
    pendingDrinks: {
        type: [String],
        default: [],
    },
    pendingDrinksAt: {
        type: Date,
        default: null,
    },
    // The queued drink the flow is currently asking questions about. Pinned so a
    // reply that drifts back to the previous drink can't add it to the cart twice.
    activeQueuedDrink: {
        type: String,
        default: null,
    },
    // A partially-specified one-shot order, waiting on the one field it's still missing.
    pendingOrderDraft: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    pendingOrderDraftAt: {
        type: Date,
        default: null,
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

const PENDING_DRINKS_TTL_MS = 30 * 60 * 1000;

chatbotSessionSchema.statics.setPendingDrinks = async function setPendingDrinks(conversationId, userId, drinks) {
    await this.findOneAndUpdate(
        { conversationId },
        {
            $setOnInsert: { conversationId, userId: userId || null },
            $set: {
                pendingDrinks: drinks,
                pendingDrinksAt: drinks.length ? new Date() : null,
                activeQueuedDrink: null,
            },
        },
        { upsert: true }
    );
};

// Removes and returns the next queued drink, or null when the queue is empty or stale.
chatbotSessionSchema.statics.shiftPendingDrink = async function shiftPendingDrink(conversationId) {
    const session = await this.findOne({ conversationId }).lean();
    const queue = session?.pendingDrinks || [];
    if (queue.length === 0) return null;

    const age = Date.now() - new Date(session.pendingDrinksAt || 0).getTime();
    if (age > PENDING_DRINKS_TTL_MS) {
        await this.updateOne({ conversationId }, { $set: { pendingDrinks: [], pendingDrinksAt: null, activeQueuedDrink: null } });
        return null;
    }

    const [next, ...rest] = queue;
    await this.updateOne(
        { conversationId },
        {
            $set: {
                pendingDrinks: rest,
                pendingDrinksAt: rest.length ? session.pendingDrinksAt : null,
                activeQueuedDrink: next,
            },
        }
    );
    return next;
};

chatbotSessionSchema.statics.clearPendingDrinks = async function clearPendingDrinks(conversationId) {
    await this.updateOne({ conversationId }, { $set: { pendingDrinks: [], pendingDrinksAt: null, activeQueuedDrink: null } });
};

// The queued drink currently being customised, if any.
chatbotSessionSchema.statics.getActiveQueuedDrink = async function getActiveQueuedDrink(conversationId) {
    const session = await this.findOne({ conversationId }).select("activeQueuedDrink").lean();
    return session?.activeQueuedDrink || null;
};

chatbotSessionSchema.statics.clearActiveQueuedDrink = async function clearActiveQueuedDrink(conversationId) {
    await this.updateOne({ conversationId }, { $set: { activeQueuedDrink: null } });
};

const PENDING_ORDER_DRAFT_TTL_MS = 30 * 60 * 1000;

chatbotSessionSchema.statics.setPendingOrderDraft = async function setPendingOrderDraft(conversationId, userId, draft) {
    await this.findOneAndUpdate(
        { conversationId },
        {
            $setOnInsert: { conversationId, userId: userId || null },
            $set: { pendingOrderDraft: draft, pendingOrderDraftAt: new Date() },
        },
        { upsert: true }
    );
};

// Null if there isn't one, or it's gone stale.
chatbotSessionSchema.statics.getPendingOrderDraft = async function getPendingOrderDraft(conversationId) {
    const session = await this.findOne({ conversationId }).select("pendingOrderDraft pendingOrderDraftAt").lean();
    if (!session?.pendingOrderDraft) return null;

    const age = Date.now() - new Date(session.pendingOrderDraftAt || 0).getTime();
    if (age > PENDING_ORDER_DRAFT_TTL_MS) {
        await this.updateOne({ conversationId }, { $set: { pendingOrderDraft: null, pendingOrderDraftAt: null } });
        return null;
    }

    return session.pendingOrderDraft;
};

chatbotSessionSchema.statics.clearPendingOrderDraft = async function clearPendingOrderDraft(conversationId) {
    await this.updateOne({ conversationId }, { $set: { pendingOrderDraft: null, pendingOrderDraftAt: null } });
};

module.exports = mongoose.model("ChatbotSession", chatbotSessionSchema);