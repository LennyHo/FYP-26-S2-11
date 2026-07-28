// User Story Architecture Trace — voucher.model.js
//
// #18  Apply Vouchers
//      View: checkout/page.tsx → Route: cart.routes.js → Ctrl: cart.controller.js → Model: voucher.model.js (this file)
// #202 Check Vouchers via Chatbot
//      View: ChatbotSidebar.tsx → Route: chatbot.routes.js (this file) → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: Voucher.Model

const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: null },
    minSpend: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "vouchers" }
);

voucherSchema.statics.findValidByCode = async function findValidByCode(code) {
  if (!code) return null;

  const voucher = await this.findOne({ code: String(code).trim().toUpperCase() }).lean();

  if (!voucher || !voucher.isActive) return null;
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) return null;

  return voucher;
};

voucherSchema.statics.calculateDiscount = function calculateDiscount(voucher, subtotal) {
  const amount = Number(subtotal || 0);
  if (!voucher || amount <= 0) return 0;

  let discount =
    voucher.discountType === "percentage"
      ? amount * (Number(voucher.discountValue) / 100)
      : Number(voucher.discountValue);

  if (voucher.maxDiscount != null) {
    discount = Math.min(discount, Number(voucher.maxDiscount));
  }

  return Math.round(Math.min(Math.max(discount, 0), amount) * 100) / 100;
};

module.exports = mongoose.model("Voucher", voucherSchema);
