const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    image: String,
    category: String,
    description: String,
    price: { type: Number, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    tags: [String],
    customizationOptions: [mongoose.Schema.Types.Mixed],
    nutritionInfo: {
      baseCalories: Number,
      baseSugarG: Number,
      baseVolumeMl: Number,
    },
  },
  { timestamps: true, collection: "menu_items" }
);

// User Story #19: Search beverages 
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

// User Story #32: Recommend beverages based on user message
menuItemSchema.statics.recommendByMessage = async function recommendByMessage(message) {
  const text = String(message || "").toLowerCase();

  const stopWords = [
    "any", "recommendations", "recommendation", "today", "like", "have",
    "drink", "drinks", "i", "to", "a", "the", "for", "please"
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