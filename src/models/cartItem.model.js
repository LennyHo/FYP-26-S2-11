const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    menuItemCode: String,

    name: { type: String, required: true },
    image: String,
    category: String,

    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },

    customization: mongoose.Schema.Types.Mixed,

    status: { type: String, enum: ["active", "checked_out", "removed"], default: "active" },
  },
  { timestamps: true, collection: "cart_items" }
);

module.exports = mongoose.model("CartItem", cartItemSchema);