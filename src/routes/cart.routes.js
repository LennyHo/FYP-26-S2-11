const express = require("express");
const cartController = require("../controllers/cart.controller");
const CartItem = require("../models/cartItem.model");
const router = express.Router();

router.post("/cart-items", cartController.addToCart);
router.get("/cart-items", cartController.getCart);
router.delete("/cart-items/:id", cartController.removeFromCart);

module.exports = router;

router.patch("/cart-items/:id", async (req, res) => {
    try {
    const { id } = req.params;
    const { quantity } = req.body;

    const nextQuantity = Number(quantity);

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
        return res.status(400).json({
        ok: false,
        message: "Invalid quantity.",
        });
    }

    const cartItem = await CartItem.findById(id);

    if (!cartItem) {
        return res.status(404).json({
        ok: false,
        message: "Cart item not found.",
        });
    }

    cartItem.quantity = nextQuantity;
    cartItem.lineTotal = Number(cartItem.unitPrice || 0) * nextQuantity;

    await cartItem.save();

    res.json({
        ok: true,
        data: {
        id: cartItem._id.toString(),
        name: cartItem.name,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        lineTotal: cartItem.lineTotal,
        customization: cartItem.customization,
        },
    });
    } catch (error) {
    console.error("[Cart] Failed to update quantity:", error);
    res.status(500).json({
        ok: false,
        message: "Unable to update cart item.",
    });
    }
});