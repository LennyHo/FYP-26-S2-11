// User Story Architecture Trace — voucher.routes.js

const express = require("express");
const voucherController = require("../controllers/voucher.controller");

const router = express.Router();

router.post("/staff/vouchers", voucherController.createVoucher);
router.get("/staff/vouchers", voucherController.getVouchers);
router.patch("/staff/vouchers/:id", voucherController.updateVoucher);
router.delete("/staff/vouchers/:id", voucherController.deleteVoucher);

module.exports = router;
