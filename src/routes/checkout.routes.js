const express = require("express");
const orderController = require("../controllers/order.controller");

const router = express.Router();

router.post("/checkout", orderController.checkoutCart);
router.get("/orders", orderController.getOrders);
router.get("/orders/:id", orderController.getOrder);
router.patch("/orders/:id/status", orderController.updateOrderStatus);

module.exports = router;
