// User Story Architecture Trace — order.model.js

const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    orderNo: { type: String, required: true, unique: true },
    orderType: { type: String, default: "manual" },
    status: {
      type: String,
      enum: ["pending", "paid", "preparing", "ready", "completed", "cancelled"],
      default: "pending",
    },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "SGD" },
    voucherCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    deliveryDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true, collection: "orders" }
);

// #23: As a customer, I want to make payment on the checkout page so that I can complete my order.
// Static method to validate order before payment, in sequence diagram
orderSchema.statics.validateOrder = async function validateOrder(orderId) {
  const order = await this.findById(orderId).lean();

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.paymentStatus === "paid") {
    throw new Error("Order has already been paid.");
  }

  if (Number(order.totalAmount || 0) <= 0) {
    throw new Error("Invalid order amount.");
  }

  return order;
};

module.exports = mongoose.model("Order", orderSchema);
