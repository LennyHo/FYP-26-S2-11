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
// Extracts keywords from message → queries menu_items with regex across name, category, description, tags.
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
  ];

  const keywords = text
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !stopWords.includes(word));

  if (!keywords.length) return [];

  const regexList = keywords.map((word) => new RegExp(word, "i"));

  return this.find({
    status: "active",
    $or: [
      { name: { $in: regexList } },
      { category: { $in: regexList } },
      { description: { $in: regexList } },
      { tags: { $in: regexList } },
    ],
  })
    .limit(6)
    .lean();
};

module.exports = mongoose.model("MenuItem", menuItemSchema);