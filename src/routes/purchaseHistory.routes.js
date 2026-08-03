// User Story Architecture Trace — purchaseHistory.routes.js

const express = require("express");
const purchaseHistoryController = require("../controllers/purchaseHistory.controller");

const router = express.Router();

// #19  View Purchase History
// #198 Purchase History via Chatbot
router.get("/purchase-history", purchaseHistoryController.getPurchaseHistory);

module.exports = router;
