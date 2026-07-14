// User Story Architecture Trace — order.model.js
//
// #18  Apply Vouchers
//      View: checkout/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js (this file)
//
// #23  Make Payment
//      View: checkout/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js (this file)
//
// #28  Track Order Status
//      View: order-status/[orderId]/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js (this file)
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: order.model.js (this file)

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
