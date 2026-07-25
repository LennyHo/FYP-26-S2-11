// User Story Architecture Trace — payment.model.js
//
// #19  View Purchase History
//      View: purchase-history/page.tsx → Route: purchaseHistory.routes.js → Ctrl: purchaseHistory.controller.js → Model: payment.model.js (this file)
//
// #23  Make Payment
//      View: checkout/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js → Model: payment.model.js (this file)
//
// #198 Purchase History via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: payment.model.js (this file)
//
// #307 Provide Feedback
//      View: FeedbackModal.tsx → Ctrl: feedback.controller.js → Svc: chatbot.service.js → Model: payment.model.js (this file)
//
// #308 Provide Feedback via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: order.model.js, feedback.model.js, payment.js (this file)

const mongoose = require("mongoose");

// Collection: payments — stores one document per checkout (orderId, userId, method, status, transactionRef).
const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, default: "fake_wallet" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
    },
    amount: Number,
    currency: { type: String, default: "SGD" },
    transactionRef: String,
  },
  { timestamps: true, collection: "payments" }
);

// #19  - As a customer, I want to be able to view the purchase history so that I can review my past orders.
// #23 - As a customer, I want to make payment on the checkout page so that I can complete my order.
// #198 - As a customer, I want to browse my purchase history through the chatbot so that I can review my previous orders conveniently.
// #307 - As a customer, I want to provide feedback manually so that I can share my experience with the service.
// #308 - As a customer, I want to provide feedback via the chatbot so that I can share my experience conveniently.
paymentSchema.statics.getPurchaseHistory = async function getPurchaseHistory(userId) {
  const Order = require("./order.model");
  const OrderItem = require("./orderItem.model");
  const Feedback = require("./feedback.model");

  const orders = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return Promise.all(
    orders.map(async (order) => {
      const items = await OrderItem.find({ orderId: order._id }).lean();
      const payment = await this.findOne({ orderId: order._id }).lean();

      const feedbackCount = await Feedback.countDocuments({
        userId,
        orderId: order._id,
      });

      return {
        id: order._id.toString(),
        orderNo: order.orderNo,
        displayOrderNo: order.displayOrderNo || order.orderNo,
        createdAt: order.createdAt,
        status: order.status,
        orderType: order.orderType || "pickup",
        totalAmount: order.totalAmount,
        deliveryDetails: order.deliveryDetails || null,
        paymentStatus: payment?.status || "unpaid",

        hasFeedback: feedbackCount > 0,

        items: items.map((item) => ({
          id: item._id.toString(),
          name: item.name,
          image: item.image,
          menuItemId: item.menuItemId,
          menuItemCode: item.menuItemCode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          customization: item.customization || {},
        })),
      };
    })
  );
};

module.exports = mongoose.model("Payment", paymentSchema);
