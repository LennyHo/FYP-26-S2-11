const cartService = require("../services/cart.service");
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const CartItem = require("../models/cartItem.model");

async function checkoutCart(req, res) {
    try {
    const { userId, paymentMethod, voucherCode } = req.body;

    if (!userId) {
        return res.status(400).json({
        ok: false,
        message: "User ID is required.",
        });
    }

    const cartItems = await cartService.getCart(userId);

    if (!cartItems.length) {
        return res.status(400).json({
        ok: false,
        message: "Cart is empty.",
        });
    }

    const totalAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
    );

    const orderCount = await Order.countDocuments();
    const displayOrderNo = String(orderCount + 1).padStart(4, "0");

    const order = await Order.create({
        userId,
        orderNo: `DT-${Date.now()}`,
        displayOrderNo,
        items: cartItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        customization: item.customization,
        })),
        totalAmount,
        orderType: "online",
        status: "pending",
        paymentStatus: "paid",
        voucherCode: voucherCode || null,
    });

    const payment = await Payment.create({
        orderId: order._id,
        userId,
        amount: totalAmount,
        method: paymentMethod || "fake_card",
        status: "paid",
    });

    await CartItem.deleteMany({
        userId,
        status: "active",
    });

    res.json({
        ok: true,
        order: {
        id: order._id.toString(),
        status: order.status,
        totalAmount: order.totalAmount,
        orderType: order.orderType,
        },
        payment: {
        id: payment._id.toString(),
        status: payment.status,
        method: payment.method,
        },
    });
    } catch (error) {
    console.error("[OrderController] Checkout failed:", error);
    res.status(500).json({
        ok: false,
        message: "Checkout failed.",
    });
    }
}

module.exports = {
    checkoutCart,
};