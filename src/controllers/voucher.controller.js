// User Story Architecture Trace — voucher.controller.js
//
// #315 View Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx → Route: voucher.routes.js → Ctrl: voucher.controller.js (this file) → Model: voucher.model.js
//
// #316 Delete Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx → Route: voucher.routes.js → Ctrl: voucher.controller.js (this file) → Model: voucher.model.js
//
// #317 Search Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx → Route: voucher.routes.js → Ctrl: voucher.controller.js (this file) → Model: voucher.model.js

const mongoose = require("mongoose");
const Voucher = require("../models/voucher.model");

// #315 As a store staff, I want to view vouchers so that I can verify customer discounts.
// #317 As a store staff, I want to search for vouchers so that I can manage promotions.
// Returns every voucher (including inactive/expired ones) — unlike the customer-facing
// GET /api/vouchers, which only lists active, unexpired vouchers. #317 reuses this same
// endpoint: the frontend fetches the full list once and filters it client-side by
// code/title/description (matchesVoucherSearch in store-staff-voucher/page.tsx),
// the same pattern already used for order/inventory search in store-staff-dashboard.
async function getVouchers(req, res) {
  try {
    const vouchers = await Voucher.find({}).sort({ createdAt: -1 }).lean();

    return res.json({
      ok: true,
      data: vouchers,
    });
  } catch (error) {
    console.error("[VoucherController] getVouchers error:", error.message);

    return res.status(500).json({
      ok: false,
      message: "Failed to load vouchers.",
    });
  }
}

// #316 As a store staff, I want to delete vouchers so that I can remove expired offers.
async function deleteVoucher(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid voucher ID.",
      });
    }

    const voucher = await Voucher.findByIdAndDelete(id).lean();

    if (!voucher) {
      return res.status(404).json({
        ok: false,
        message: "Voucher not found.",
      });
    }

    return res.json({
      ok: true,
      data: { id },
    });
  } catch (error) {
    console.error("[VoucherController] deleteVoucher error:", error.message);

    return res.status(500).json({
      ok: false,
      message: "Failed to delete voucher.",
    });
  }
}

module.exports = {
  getVouchers,
  deleteVoucher,
};
