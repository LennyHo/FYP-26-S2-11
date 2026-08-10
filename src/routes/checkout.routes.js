// User Story Architecture Trace — checkout.routes.js

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
// Lets the chatbot's order-status card poll for live updates without re-asking Avy.
router.get("/orders/:id/status-card", orderController.getOrderStatusCard);
router.get("/orders/:id", orderController.getOrder);

// #28  - As a customer, I want to track my order status so that I know when my drink will be ready.
// #203 - As a customer, I want to track my order status through the chatbot so that I know when my drink will be ready.
// #303 - As a customer, I want to check my delivery and order status manually so that I can stay informed about my purchase.
// #304 - As a customer, I want to view my delivery and order status via the chatbot so that I can get quick, automated updates.
router.patch("/orders/:id/status", orderController.updateOrderStatus);

module.exports = router;
