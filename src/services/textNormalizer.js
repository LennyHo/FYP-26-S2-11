// Typo tolerance for intent matching.
// Every intent check in chatbot.service.js matches literal keywords, so a single
// misspelling ("what voocher I have") drops the message into the generic Gemini
// path, which has no voucher/order data to answer with. This module rewrites
// misspelled tokens to the closest known keyword BEFORE intent routing.
//
// The corrected text is only ever used for routing — the customer's original
// message is what Gemini sees and what gets stored in the conversation history.

// Words that must never be rewritten: ordinary English that is not a keyword.
// Without this list a normal word could be pulled toward a keyword it happens to
// resemble.
const COMMON_WORDS = new Set([
    "a", "an", "the", "and", "or", "but", "if", "so", "to", "of", "in", "on", "at", "for",
    "with", "from", "by", "as", "is", "am", "are", "was", "were", "be", "been", "being",
    "do", "does", "did", "done", "will", "shall", "may", "might", "must", "not", "no",
    "yes", "ok", "okay", "sure", "this", "that", "these", "those", "there", "here", "then",
    "than", "too", "very", "just", "only", "also", "still", "now", "today", "tomorrow",
    "yesterday", "morning", "afternoon", "evening", "night", "good", "great", "nice",
    "bad", "better", "worse", "worst", "thanks", "thank", "hello", "hey", "bye", "sorry",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "first", "second", "third", "fourth", "fifth", "last", "next", "new", "old", "big",
    "hot", "cold", "warm", "much", "many", "some", "each", "every", "other", "another",
    "make", "made", "take", "get", "got", "put", "keep", "let", "know", "think", "like",
    "love", "hate", "try", "use", "look", "see", "come", "back", "over", "under", "into",
    "out", "off", "up", "down", "about", "after", "before", "while", "because", "them",
    "they", "their", "you", "your", "yours", "our", "ours", "his", "her", "hers", "its",
    "who", "whom", "whose", "why", "because", "sir", "maam", "please", "eat",
    // Ordinary words that sit one edit away from a keyword below — listing them
    // here is what stops "I spent S$12" becoming "I spend S$12".
    "spent", "send", "sent", "house", "mouse", "tree", "feel", "fee", "site", "card",
    "care", "cast", "coat", "cove", "cook", "cool", "note", "mode", "mile", "wild",
    "well", "team", "real", "read", "hard", "head", "heat", "hear", "near", "dear",
    "year", "ever", "even", "else", "easy", "edge", "item", "idea", "line", "life",
    "list", "late", "lace", "race", "rice", "nice", "mine", "wine", "vine", "tone",
    "bone", "done", "gone", "none", "once", "hour", "our", "out", "own", "off",
    "wait", "want", "went", "were", "wear", "week", "well", "west", "wide", "wife",
    "word", "work", "world", "worth", "write", "wrong", "young", "clean", "clear",
    "close", "cloud", "count", "cover", "cream", "sound", "south", "start", "stay",
    "stop", "table", "taste", "thing", "time", "trip", "true", "turn", "type",
]);

// Keywords the intent router actually looks for. Anything here is both a valid
// token (never corrected) and a correction target.
const INTENT_KEYWORDS = [
    // question / request words
    "what", "where", "when", "which", "whats", "how", "have", "has", "want", "need",
    "show", "tell", "give", "list", "view", "check", "find", "any", "all", "can",
    "could", "would", "should", "again",
    // vouchers & promotions
    "voucher", "vouchers", "promo", "promos", "promotion", "promotions", "coupon",
    "coupons", "discount", "discounts", "deal", "deals", "redeem",
    // orders & tracking
    "order", "orders", "ordering", "track", "tracking", "status", "receipt", "receipts",
    "delivery", "deliver", "pickup", "collect", "collection", "cancel",
    // purchase history
    "purchase", "purchases", "history", "previous", "reorder",
    // cart & checkout
    "cart", "basket", "checkout", "payment", "quantity", "remove", "delete",
    "empty", "update", "change", "increase", "decrease",
    // menu & recommendations
    "menu", "drink", "drinks", "beverage", "beverages", "recommend", "recommendation",
    "recommendations", "suggest", "popular", "rating", "rated", "review", "reviews",
    "feedback", "favourite", "favorite",
    // nutrition & health
    "sugar", "sweet", "sweetness", "calorie", "calories", "nutrition", "nutritional",
    "grade", "healthy", "health", "diabetic", "diabetes", "allergy", "allergic",
    // customization
    "size", "large", "regular", "small", "iced", "topping", "toppings", "pearl",
    "pearls", "tapioca", "boba", "cheese", "foam", "brown", "normal", "extra",
    "without",
    // stores
    "store", "stores", "outlet", "outlets", "location", "locations", "address", "hours",
    "opening", "closing", "orchard", "jurong", "nearest", "contact", "phone",
    // pages & account
    "homepage", "profile", "settings", "account", "password", "login",
    "logout", "register", "human", "agent", "support",
    // money
    "price", "prices", "total", "cheaper",
];

// Damerau-Levenshtein (optimal string alignment) — counts a swapped pair of
// letters as one edit, which is what most real typos are ("haev", "histroy").
// Bails out early once the distance exceeds maxDistance.
function editDistance(a, b, maxDistance) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

    let previous = new Array(b.length + 1);
    let current = new Array(b.length + 1);
    let beforePrevious = new Array(b.length + 1);

    for (let j = 0; j <= b.length; j++) previous[j] = j;

    for (let i = 1; i <= a.length; i++) {
        current[0] = i;
        let rowBest = current[0];

        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            let value = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + cost
            );
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                value = Math.min(value, beforePrevious[j - 2] + 1);
            }
            current[j] = value;
            if (value < rowBest) rowBest = value;
        }

        if (rowBest > maxDistance) return maxDistance + 1;

        const spare = beforePrevious;
        beforePrevious = previous;
        previous = current;
        current = spare;
    }

    return previous[b.length];
}

// One edit for short words, two once there is enough word to be sure of the match.
function allowedEdits(word) {
    if (word.length < 4) return 0;
    if (word.length <= 7) return 1;
    return 2;
}

function buildIntentVocabulary(extraTerms = []) {
    const vocabulary = new Set(INTENT_KEYWORDS);
    extraTerms.forEach((term) => {
        const clean = String(term || "").toLowerCase().replace(/[^a-z]/g, "");
        if (clean.length >= 3) vocabulary.add(clean);
    });
    return vocabulary;
}

// Tokens that must be passed through untouched: voucher codes (HALF50), order
// numbers (#0187), emails, prices — correcting any of these loses real data.
function isProtectedToken(raw, word) {
    if (/\d/.test(raw)) return true;
    if (/[@$#%]/.test(raw)) return true;
    if (raw.length > 1 && raw === raw.toUpperCase() && /[A-Z]/.test(raw)) return true;
    if (word.length < 4) return true;
    return false;
}

const MAX_CORRECTIONS = 3;

// Rewrites misspelled words to their closest keyword. Returns the message
// unchanged when nothing is confidently correctable.
function correctTypos(message, vocabulary) {
    const original = String(message || "");
    if (!original.trim() || !vocabulary || vocabulary.size === 0) return original;

    let corrections = 0;

    const corrected = original.split(/(\s+)/).map((chunk) => {
        if (!chunk.trim() || corrections >= MAX_CORRECTIONS) return chunk;

        // Keep leading/trailing punctuation so "haev?" comes back as "have?"
        const match = /^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/.exec(chunk);
        if (!match) return chunk;

        const [, prefix, rawWord, suffix] = match;
        const word = rawWord.toLowerCase();

        if (isProtectedToken(chunk, word)) return chunk;
        if (vocabulary.has(word) || COMMON_WORDS.has(word)) return chunk;

        const limit = allowedEdits(word);
        if (limit === 0) return chunk;

        let best = null;
        let bestDistance = limit + 1;
        let tied = false;

        for (const candidate of vocabulary) {
            const distance = editDistance(word, candidate, limit);
            if (distance > limit) continue;
            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidate;
                tied = false;
            } else if (distance === bestDistance && candidate !== best) {
                tied = true;
            }
        }

        // An ambiguous match is worse than no match — leave it for Gemini.
        if (!best || tied) return chunk;

        corrections += 1;
        const cased = /^[A-Z]/.test(rawWord) ? best[0].toUpperCase() + best.slice(1) : best;
        return prefix + cased + suffix;
    }).join("");

    return corrections > 0 ? corrected : original;
}

module.exports = {
    buildIntentVocabulary,
    correctTypos,
    editDistance,
};
