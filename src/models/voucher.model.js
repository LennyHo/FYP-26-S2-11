// User Story Architecture Trace — voucher.model.js

const mongoose = require("mongoose");
const Order = require("./order.model");

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

// Auto-deletes a voucher once expiresAt is in the past. MongoDB's TTL monitor sweeps every
// ~60s, so removal isn't instant, but no app-level cron job is needed. Vouchers with
// expiresAt: null are never touched — they have no expiry.
voucherSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

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

// A voucher is single-use per customer: once it appears on one of the
// customer's orders it counts as redeemed and is never offered to them again.
voucherSchema.statics.hasUserUsedVoucher = async function hasUserUsedVoucher(userId, code) {
  if (!userId || !code) return false;

  const usedOrder = await Order.exists({
    userId,
    voucherCode: String(code).trim().toUpperCase(),
  });

  return Boolean(usedOrder);
};

// Active, unexpired vouchers minus the ones this customer has already redeemed —
// this is the per-customer voucher list (each customer sees a different set).
voucherSchema.statics.findAvailableForUser = async function findAvailableForUser(userId) {
  const now = new Date();

  const activeVouchers = await this.find({
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
  }).sort({ createdAt: 1 }).lean();

  if (!userId) return activeVouchers;

  const usedOrders = await Order.find({ userId, voucherCode: { $ne: null } })
    .select("voucherCode")
    .lean();
  const usedCodes = new Set(usedOrders.map((order) => order.voucherCode));

  return activeVouchers.filter((voucher) => !usedCodes.has(voucher.code));
};

module.exports = mongoose.model("Voucher", voucherSchema);
