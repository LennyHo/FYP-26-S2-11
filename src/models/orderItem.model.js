// User Story Architecture Trace — orderItem.model.js

const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    menuItemCode: String,

    name: String,
    image: String,
    category: String,
    quantity: Number,
    unitPrice: Number,
    lineTotal: Number,
    customization: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: "order_items" }
);

module.exports = mongoose.model("OrderItem", orderItemSchema);