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
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// #18 Apply Vouchers | #23 Make Payment
router.post("/checkout", orderController.processPayment);

// Store staff: view all orders for their own store from the staff dashboard.
// GET /orders/:id and PATCH .../status stay open — they're also used by the
// customer-facing order-tracking page and are id-scoped, not list-scoped.
router.get("/orders", requireAuth, requireRole("store_staff"), orderController.getOrders);
router.get("/orders/:id", orderController.getOrder);

// #28 Track Order Status | #203 Track Order Status via Chatbot
router.patch("/orders/:id/status", orderController.updateOrderStatus);

module.exports = router;
