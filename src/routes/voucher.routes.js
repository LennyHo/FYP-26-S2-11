// User Story Architecture Trace — voucher.routes.js
//
// View/Delete/Search Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx → Route: voucher.routes.js (this file) → Ctrl: voucher.controller.js → Model: voucher.model.js

const express = require("express");
const voucherController = require("../controllers/voucher.controller");

const router = express.Router();

router.get("/staff/vouchers", voucherController.getVouchers);
router.delete("/staff/vouchers/:id", voucherController.deleteVoucher);

module.exports = router;
