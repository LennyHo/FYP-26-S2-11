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

const SEED_VOUCHERS = [
  {
    code: "BOGO2026",
    title: "Buy 1 Get 1 FREE",
    description: "Buy 1 get 1 free — lowest-priced drink is on us. Minimum 2 drinks.",
    discountType: "fixed",
    discountValue: 6.9,
    minSpend: 12,
  },
  {
    code: "HALF50",
    title: "50% OFF 1 Drink",
    description: "50% off your order, up to S$10 off.",
    discountType: "percentage",
    discountValue: 50,
    maxDiscount: 10,
    minSpend: 0,
  },
  {
    code: "FREE1CUP",
    title: "1 Free Regular Drink",
    description: "Up to S$6.90 off — one free regular-sized drink.",
    discountType: "fixed",
    discountValue: 6.9,
    minSpend: 0,
  },
  {
    code: "SAVE5",
    title: "S$5 OFF",
    description: "S$5 off orders above S$15.",
    discountType: "fixed",
    discountValue: 5,
    minSpend: 15,
  },
  {
    code: "WELCOME15",
    title: "15% OFF Any Order",
    description: "15% off your order, up to S$8 off.",
    discountType: "percentage",
    discountValue: 15,
    maxDiscount: 8,
    minSpend: 0,
  },
  {
    code: "TOPUP20",
    title: "20% OFF Orders Above S$25",
    description: "20% off orders above S$25, up to S$15 off.",
    discountType: "percentage",
    discountValue: 20,
    maxDiscount: 15,
    minSpend: 25,
  },
];

// Upserts so the DB always matches the canonical list above after a restart —
// editing a seed here (title, discount, minSpend) propagates without a manual migration.
voucherSchema.statics.initializeSeedVouchers = async function initializeSeedVouchers() {
  try {
    for (const seed of SEED_VOUCHERS) {
      await this.findOneAndUpdate(
        { code: seed.code },
        { $set: seed },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error("[Voucher] Seed error:", error.message);
  }
};

module.exports = mongoose.model("Voucher", voucherSchema);
