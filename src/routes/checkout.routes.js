const express = require("express");
const orderController = require("../controllers/order.controller");

const router = express.Router();

router.post("/checkout", orderController.checkoutCart);

module.exports = router;