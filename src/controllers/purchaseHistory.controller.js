// User Story Architecture Trace — purchaseHistory.controller.js

// #19 Get Purchase History
const Payment = require("../models/payment.model");
async function getPurchaseHistory(req, res) {
  try {
    const userId = req.query.userId || req.params.userId;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        message: "User ID is required.",
      });
    }

    const history = await Payment.getPurchaseHistory(userId);

    return res.json({
      ok: true,
      data: history,
    });
  } catch (error) {
    console.error("[PurchaseHistoryController] getPurchaseHistory failed:", error);

    return res.status(500).json({
      ok: false,
      message: "Unable to load purchase history.",
    });
  }
}

module.exports = {
  getPurchaseHistory,
};