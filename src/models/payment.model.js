const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, default: "fake_wallet" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "paid" },
    amount: Number,
    currency: { type: String, default: "SGD" },
    transactionRef: String,
  },
  { timestamps: true, collection: "payments" }
);

module.exports = mongoose.model("Payment", paymentSchema);