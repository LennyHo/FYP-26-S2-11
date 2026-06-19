// User Story Architecture Trace — checkout.routes.js
//
// #18  Apply Vouchers
//      View: checkout/page.tsx → Route: checkout.routes.js (this file) → Ctrl: order.controller.js → Model: order.model.js
//
// #23  Make Payment
//      View: checkout/page.tsx → Route: checkout.routes.js (this file) → Ctrl: order.controller.js → Model: order.model.js, payment.model.js
//
// #28  Track Order Status
//      View: order-status/[orderId]/page.tsx → Route: checkout.routes.js (this file) → Ctrl: order.controller.js → Model: order.model.js
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Route: checkout.routes.js (this file) → Ctrl: order.controller.js → Model: order.model.js

const express = require("express");
const orderController = require("../controllers/order.controller");

const router = express.Router();

// #18 Apply Vouchers | #23 Make Payment
router.post("/checkout", orderController.processPayment);

// Store staff: view and manage all customer orders from the staff dashboard.
router.get("/orders", orderController.getOrders);
router.get("/orders/:id", orderController.getOrder);

// #28 Track Order Status | #203 Track Order Status via Chatbot
router.patch("/orders/:id/status", orderController.updateOrderStatus);

module.exports = router;
