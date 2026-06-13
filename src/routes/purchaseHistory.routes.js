const express = require("express");
const purchaseHistoryController = require("../controllers/purchaseHistory.controller");

const router = express.Router();

// #19  - As a customer, I want to be able to view the purchase history so that I can review my past orders.
// #198 - As a customer, I want to browse my purchase history through the chatbot so that I can review my previous orders conveniently.
router.get("/purchase-history", purchaseHistoryController.getPurchaseHistory);

module.exports = router;
