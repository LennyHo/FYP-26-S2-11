const mongoose = require("mongoose");

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

module.exports = mongoose.model("Order", orderSchema);