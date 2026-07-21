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
//
// #391 Create Voucher (Store Staff)
//      View: store-staff-voucher/page.tsx → Route: voucher.routes.js → Ctrl: voucher.controller.js (this file) → Model: voucher.model.js
//      Vouchers are a single global collection (no storeId/outlet field on the model),
//      so every voucher created here is immediately visible to every store staff account.

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

// #391 As a store staff, I want to create vouchers so that I can launch new promotions.
// Vouchers have no store/outlet field, so a newly created voucher is shared by all staff immediately.
async function createVoucher(req, res) {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const discountType = String(req.body.discountType || "").trim();
    const discountValue = Number(req.body.discountValue);
    const minSpend = Number.isFinite(Number(req.body.minSpend)) ? Number(req.body.minSpend) : 0;
    const isActive = req.body.isActive !== false;
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    const maxDiscount =
      req.body.maxDiscount !== undefined && req.body.maxDiscount !== null && req.body.maxDiscount !== ""
        ? Number(req.body.maxDiscount)
        : null;

    if (!code || !title) {
      return res.status(400).json({
        ok: false,
        message: "Code and title are required.",
      });
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({
        ok: false,
        message: "Discount type must be percentage or fixed.",
      });
    }

    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return res.status(400).json({
        ok: false,
        message: "A valid discount value is required.",
      });
    }

    if (discountType === "percentage" && discountValue > 100) {
      return res.status(400).json({
        ok: false,
        message: "Percentage discount cannot exceed 100.",
      });
    }

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return res.status(400).json({
        ok: false,
        message: "Invalid expiry date.",
      });
    }

    const existing = await Voucher.findOne({ code }).lean();
    if (existing) {
      return res.status(409).json({
        ok: false,
        message: `A voucher with code "${code}" already exists.`,
      });
    }

    const voucher = await Voucher.create({
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscount: discountType === "percentage" ? maxDiscount : null,
      minSpend,
      isActive,
      expiresAt,
    });

    return res.status(201).json({
      ok: true,
      data: voucher,
    });
  } catch (error) {
    console.error("[VoucherController] createVoucher error:", error.message);

    return res.status(500).json({
      ok: false,
      message: "Failed to create voucher.",
    });
  }
}

module.exports = {
  getVouchers,
  deleteVoucher,
  createVoucher,
};
