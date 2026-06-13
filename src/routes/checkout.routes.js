const express = require("express");
const orderController = require("../controllers/order.controller");

const router = express.Router();

// #18 - As a customer, I want to apply vouchers during checkout so that I can enjoy discounts.
// #23 - As a customer, I want to make payment on the checkout page so that I can complete my order.
router.post("/checkout", orderController.processPayment);

// Store staff: view and manage all customer orders from the staff dashboard.
router.get("/orders", orderController.getOrders);
router.get("/orders/:id", orderController.getOrder);

// #28  - As a customer, I want to track my order status so that I know when my drink will be ready.
// #203 - As a customer, I want to track my order status through the chatbot so that I know when my drink will be ready.
router.patch("/orders/:id/status", orderController.updateOrderStatus);

module.exports = router;
