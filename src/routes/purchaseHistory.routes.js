// User Story Architecture Trace — purchaseHistory.routes.js
//
// #19  View Purchase History
//      View: purchase-history/page.tsx → Route: purchaseHistory.routes.js (this file) → Ctrl: purchaseHistory.controller.js → Model: payment.model.js
//
// #198 Purchase History via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: payment.model.js

const express = require("express");
const purchaseHistoryController = require("../controllers/purchaseHistory.controller");

const router = express.Router();

// #19  View Purchase History
// #198 Purchase History via Chatbot
router.get("/purchase-history", purchaseHistoryController.getPurchaseHistory);

module.exports = router;
