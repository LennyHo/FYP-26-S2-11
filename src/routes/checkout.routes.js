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
// #304 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Route: checkout.routes.js (this file) → Ctrl: order.controller.js → Model: order.model.js

const express = require("express");
const orderController = require("../controllers/order.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// #18 As a customer, I want to apply vouchers during checkout so that I can enjoy discounts.
// #23 As a customer, I want to make payment on the checkout page so that I can complete my order.
router.post("/checkout", orderController.processPayment);

router.get("/orders", requireAuth, requireRole("store_staff"), orderController.getOrders);
router.post("/orders/test-queue", orderController.createTestQueueOrders);
router.get("/orders/:id/queue", orderController.getOrderQueueStatus);
router.get("/orders/:id", orderController.getOrder);

// #28 As a customer, I want to track my order status so that I know when my drink will be ready. 
// #304 As a customer, I want to view my delivery and order status via the chatbot so that I can get quick, automated updates.
router.patch("/orders/:id/status", orderController.updateOrderStatus);

module.exports = router;
