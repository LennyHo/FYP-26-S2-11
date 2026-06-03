const MAX_HISTORY_MESSAGES = 10;
const MAX_CONVERSATIONS = 200;

const conversationStore = new Map();

function getConversationHistory(conversationId) {
    if (!conversationStore.has(conversationId)) {
    if (conversationStore.size >= MAX_CONVERSATIONS) {
        const oldestId = conversationStore.keys().next().value;
        conversationStore.delete(oldestId);
    }

    conversationStore.set(conversationId, []);
    }

    return conversationStore.get(conversationId);
}

function appendToConversation(history, message) {
    history.push(message);

    if (history.length > MAX_HISTORY_MESSAGES) {
    history.splice(0, history.length - MAX_HISTORY_MESSAGES);
    }
}

module.exports = {
    getConversationHistory,
    appendToConversation,
};