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

module.exports = mongoose.model("MenuItem", menuItemSchema);