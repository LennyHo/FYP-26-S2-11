const mongoose = require("mongoose");

// #18  - As a customer, I want to apply vouchers during checkout so that I can enjoy discounts.
// #23  - As a customer, I want to make payment on the checkout page so that I can complete my order.
// #28  - As a customer, I want to track my order status so that I know when my drink will be ready.
// #203 - As a customer, I want to track my order status through the chatbot.
// Collection: orders — stores one document per completed order (userId, orderNo, status, totalAmount, voucherCode).
// Status lifecycle: pending → preparing → ready → completed (updated by store staff dashboard).
const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
  },
  { timestamps: true, collection: "orders" }
);

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