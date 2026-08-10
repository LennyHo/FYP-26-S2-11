// User Story Architecture Trace — purchaseHistory.controller.js

const Payment = require("../models/payment.model");

// #19: As a customer, I want to be able to view the purchase history during checkout so that I can review my past orders.
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