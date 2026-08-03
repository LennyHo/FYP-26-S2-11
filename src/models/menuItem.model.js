// User Story Architecture Trace — menuItem.model.js

const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    tags: { type: [String], default: [] },
    nutritionInfo: {
      baseVolumeMl: { type: Number, default: 500 },
      baseCalories: { type: Number, default: 0 },
      baseSugarG:   { type: Number, default: 0 },
      nutriGrade:   { type: String, default: "B" },
    },
    drinkInfo: {
      ingredients:    { type: [String], default: [] },
      diabeticAdvice: { type: String, default: "" },
      insulinImpact:  { type: String, default: "" },
    },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isNewArrival: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "menu_items" }
);

// #13 - As a customer, I want to view the menu so that I know which beverages are available.
// #34 - As a store staff, I want to view menu items so that I can review the available beverages.
// Queries menu_items filtered by status, sorted by category and name.
menuItemSchema.statics.getMenu = async function getMenu(status = "active") {
  const selectedStatus = String(status || "active").toLowerCase();
  const query = selectedStatus === "all" ? {} : { status: selectedStatus };

  return this.find(query)
    .sort({ category: 1, name: 1 })
    .lean();
};

// #21 - As a customer, I want to search for beverages by name so that I can locate specific drinks quickly.
// #27 - As a customer, I want to search for beverages using the AI chatbot so that I can find what I want quickly.
// #36 - As a store staff, I want to search menu items by name so that I can find the beverage.
// Regex search across name, category, description, tags in menu_items collection.
menuItemSchema.statics.searchBeverage = async function searchBeverage(keyword) {
  const searchText = String(keyword || "").trim();

  const query = {
    status: "active",
  };

  if (searchText) {
    query.$or = [
      { name: { $regex: searchText, $options: "i" } },
      { category: { $regex: searchText, $options: "i" } },
      { description: { $regex: searchText, $options: "i" } },
      { tags: { $regex: searchText, $options: "i" } },
    ];
  }

  return this.find(query).sort({ category: 1, name: 1 }).lean();
};

// #32 - As a customer, I want to get the recommendations from chatbot so that I can complete my order.
// Extracts keywords from message -> queries menu_items with regex across name, category, description, tags.
menuItemSchema.statics.recommendByMessage = async function recommendByMessage(message) {
  const text = String(message || "").toLowerCase();

  const stopWords = [
    "any",
    "recommendations",
    "recommendation",
    "recommend",
    "today",
    "like",
    "have",
    "drink",
    "drinks",
    "i",
    "to",
    "a",
    "the",
    "for",
    "please",
    // Generic words that cause false substring matches: "tea"/"teas" match the "Teas" in every
    // category name ("Fruit Teas", "Matcha Teas"), and short words like "me"/"show"/"us" match
    // substrings ("me" inside "waterMElon"). Dropping them keeps the distinctive flavour word
    // (matcha, fruit, mango…) as the only matcher, so "show me matcha teas" returns matcha only.
    "show",
    "me",
    "us",
    "tea",
    "teas",
    "some",
    "something",
    "get",
  ];

  // Map flavour/category adjectives to the terms actually stored in the DB (category names,
  // tags, descriptions). Without this, "something fruity" matches nothing — the category is
  // "Fruit Teas" and the tags say "fruit", neither of which contains the word "fruity" — so the
  // request would fall through to the model, which then fabricates drink data. "floral" already
  // works because it appears verbatim in descriptions; this brings the other adjectives to parity.
  const SYNONYMS = {
    fruity: "fruit",
    fruits: "fruit",
    creamy: "milk",
    milky: "milk",
    dairy: "milk",
    chocolatey: "chocolate",
    nutty: "taro",
  };

  // Negation triggers ("without milk", "no milk", "non-dairy", "excluding pearls") flip the
  // following word from a positive match into an exclusion — otherwise "milk" alone matches
  // every milk tea via the $or below, so "recommend a drink without milk" recommended milk teas.
  const NEGATION_TRIGGERS = ["without", "no", "non", "excluding", "except"];

  const rawWords = text.split(/[^a-z0-9]+/).filter(Boolean);

  const keywords = [];
  const negatedWords = [];

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i];
    if (NEGATION_TRIGGERS.includes(word) && rawWords[i + 1]) {
      negatedWords.push(SYNONYMS[rawWords[i + 1]] || rawWords[i + 1]);
      i++; // consume the negated word too, so it isn't also added as a positive keyword
      continue;
    }
    if (!stopWords.includes(word)) {
      keywords.push(SYNONYMS[word] || word);
    }
  }

  if (!keywords.length && !negatedWords.length) return [];

  const query = { status: "active" };

  if (keywords.length) {
    const regexList = keywords.map((word) => new RegExp(word, "i"));
    query.$or = [
      { name: { $in: regexList } },
      { category: { $in: regexList } },
      { description: { $in: regexList } },
      { tags: { $in: regexList } },
      { "drinkInfo.ingredients": { $in: regexList } },
    ];
  }

  if (negatedWords.length) {
    const negatedRegexList = negatedWords.map((word) => new RegExp(word, "i"));
    query.$nor = [
      { name: { $in: negatedRegexList } },
      { category: { $in: negatedRegexList } },
      { description: { $in: negatedRegexList } },
      { tags: { $in: negatedRegexList } },
      { "drinkInfo.ingredients": { $in: negatedRegexList } },
    ];
  }

  return this.find(query)
    .limit(6)
    .lean();
};

module.exports = mongoose.model("MenuItem", menuItemSchema);