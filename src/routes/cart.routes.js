const express = require("express");
const cartController = require("../controllers/cart.controller");

const router = express.Router();

router.post("/cart-items", cartController.addToCart);
router.get("/cart-items", cartController.getCart);
router.get("/cart-items/:id", cartController.getCartItem);
router.patch("/cart-items/:id", cartController.updateCartItem);
router.delete("/cart-items/:id", cartController.removeFromCart);

module.exports = router;