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
    base_calories: { type: Number, default: 0 },
    base_sugar_g: { type: Number, default: 0 },
    nutri_grade: { type: String, default: "B" },
  },
  { timestamps: true, collection: "menu_items" }
);

// User Story #19 search for beverages by keyword
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

// User Story #32 recommend beverages based on user message
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