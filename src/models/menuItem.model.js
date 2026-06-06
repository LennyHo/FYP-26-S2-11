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

module.exports = mongoose.model("MenuItem", menuItemSchema);