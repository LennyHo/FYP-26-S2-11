// User Story Architecture Trace — order.controller.js
//
// #18  Apply Vouchers
//      View: checkout/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js (this file) → Model: order.model.js
//
// #23  Make Payment
//      View: checkout/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js (this file) → Model: order.model.js, payment.model.js
//
// #28  Track Order Status
//      View: order-status/[orderId]/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js (this file) → Model: order.model.js
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Ctrl: order.controller.js (this file) → Model: order.model.js

const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");
const Payment = require("../models/payment.model");
const CartItem = require("../models/cartItem.model");
const User = require("../models/user.model");
const Voucher = require("../models/voucher.model");

function toObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function formatOrderNo(sequence) {
    return String(sequence).padStart(4, "0");
}

async function getMaxExistingOrderSequence() {
    const [result] = await Order.aggregate([
        { $match: { orderNo: /^\d+$/ } },
        { $project: { sequence: { $toInt: "$orderNo" } } },
        { $group: { _id: null, maxSequence: { $max: "$sequence" } } },
    ]);

    return Number(result?.maxSequence || 0);
}

async function getNextOrderSequence() {
    const counters = mongoose.connection.collection("counters");
    const counterId = "orderNo";
    const existingCounter = await counters.findOne({ _id: counterId });

    if (!existingCounter) {
        await counters.updateOne(
            { _id: counterId },
            { $setOnInsert: { seq: await getMaxExistingOrderSequence() } },
            { upsert: true }
        );
    }

    const updatedCounter = await counters.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );
    const counterDocument = updatedCounter?.value || updatedCounter;
    const sequence = Number(counterDocument?.seq);

    if (!Number.isInteger(sequence) || sequence < 1) {
        throw new Error("Unable to generate the next order number.");
    }

    return sequence;
}

async function createOrderWithUniqueNumber(payload) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            return await Order.create({
                ...payload,
                orderNo: formatOrderNo(await getNextOrderSequence()),
            });
        } catch (error) {
            if (error?.code !== 11000 || !error?.keyPattern?.orderNo) {
                throw error;
            }
        }
    }

    throw new Error("Unable to generate a unique order number.");
}

function toPublicOrderItem(item) {
    return {
        id: String(item._id),
        menuItemId: item.menuItemId ? String(item.menuItemId) : "",
        menuItemCode: item.menuItemCode || "",
        name: item.name || "Drink",
        image: item.image || "",
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.lineTotal || 0),
        customization: item.customization || {},
    };
}
function toPublicOrder(order, user, items, payment) {
    return {
        id: String(order._id),
        orderNo: order.orderNo,
        customer: user?.fullName || user?.email || "Customer",
        status: order.status,
        orderType: order.orderType,
        totalAmount: Number(order.totalAmount || 0),
        paymentStatus: payment?.status || order.paymentStatus || "unpaid",
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: items.map(toPublicOrderItem),
    };
}

// #18 - As a customer, I want to apply vouchers during checkout so that I can enjoy discounts.
// #23 - As a customer, I want to make payment on the checkout page so that I can complete my order.
// Reads cart_items → creates order in orders → inserts order_items → creates payment → clears cart_items.
async function processPayment(req, res) {
    try {
    const { userId, paymentMethod, voucherCode } = req.body;

    if (!userId) {
        return res.status(400).json({
        ok: false,
        message: "User ID is required.",
        });
    }

    const cartItems = await CartItem.getCart(userId);

    if (!cartItems.length) {
        return res.status(400).json({
        ok: false,
        message: "Cart is empty.",
        });
    }

    const subtotal = cartItems.reduce(
        (sum, item) => sum + Number(item.lineTotal || 0),
        0
    );

    // Recompute the discount server-side rather than trusting a client-supplied
    // amount — the voucher code is the only input we accept for the charge.
    let discountAmount = 0;
    let appliedVoucherCode = null;

    if (voucherCode) {
        const voucher = await Voucher.findValidByCode(voucherCode);

        if (voucher && subtotal >= Number(voucher.minSpend || 0)) {
            discountAmount = Voucher.calculateDiscount(voucher, subtotal);
            appliedVoucherCode = voucher.code;
        }
    }

    const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;

    const order = await createOrderWithUniqueNumber({
        userId,
        orderNo: `DT-${Date.now()}`,
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
        voucherCode: appliedVoucherCode,
        discountAmount,
    });

    const orderItems = cartItems.map((item) => ({
        orderId: order._id,
        userId,
        menuItemId: item.menuItemId,
        menuItemCode: item.menuItemCode,
        name: item.name,
        image: item.image,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        customization: item.customization || {},
    }));

    await OrderItem.insertMany(orderItems);

    const payment = await Payment.create({
        orderId: order._id,
        userId,
        amount: totalAmount,
        method: paymentMethod || "fake_card",
        status: "paid",
        transactionRef: `FAKE-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
    });

    await CartItem.deleteMany({
        userId,
        status: "active",
    });

    res.json({
        ok: true,
        order: {
        id: order._id.toString(),
        orderNo: order.orderNo,
        displayOrderNo: order.orderNo,
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

// Store staff: view all customer orders from the staff dashboard, filtered by status.
// Queries orders → joins users, order_items, payments collections → returns combined order list.
async function getOrders(req, res) {
    try {
        const status = String(req.query.status || "all").trim().toLowerCase();
        const allowedStatuses = new Set(["all", "pending", "preparing", "ready", "completed", "cancelled"]);

        if (!allowedStatuses.has(status)) {
            return res.status(400).json({
                ok: false,
                message: "A valid order status is required.",
            });
        }

        const query = status === "all" ? {} : { status };
        const orders = await Order.find(query).sort({ createdAt: -1 }).limit(200).lean();
        const orderIds = orders.map((order) => order._id);
        const userIds = [
            ...new Set(orders.map((order) => String(order.userId)).filter(Boolean)),
        ].map((id) => new mongoose.Types.ObjectId(id));

        const [users, orderItems, payments] = await Promise.all([
            userIds.length ? User.find({ _id: { $in: userIds } }).lean() : [],
            orderIds.length ? OrderItem.find({ orderId: { $in: orderIds } }).lean() : [],
            orderIds.length ? Payment.find({ orderId: { $in: orderIds } }).lean() : [],
        ]);

        const usersById = new Map(users.map((user) => [String(user._id), user]));
        const paymentsByOrderId = new Map(payments.map((payment) => [String(payment.orderId), payment]));
        const itemsByOrderId = new Map();

        for (const item of orderItems) {
            const key = String(item.orderId);
            const existing = itemsByOrderId.get(key) || [];
            existing.push(item);
            itemsByOrderId.set(key, existing);
        }

        return res.json({
            ok: true,
            data: orders.map((order) =>
                toPublicOrder(
                    order,
                    usersById.get(String(order.userId)),
                    itemsByOrderId.get(String(order._id)) || [],
                    paymentsByOrderId.get(String(order._id))
                )
            ),
        });
    } catch (error) {
        console.error("[OrderController] Failed to load orders:", error);
        return res.status(500).json({
            ok: false,
            message: "Failed to load orders.",
        });
    }
}

async function getOrder(req, res) {
    try {
        const orderId = toObjectId(req.params.id);

        if (!orderId) {
            return res.status(400).json({
                ok: false,
                message: "A valid order id is required.",
            });
        }

        const order = await Order.findById(orderId).lean();

        if (!order) {
            return res.status(404).json({
                ok: false,
                message: "Order not found.",
            });
        }

        const [user, items, payment] = await Promise.all([
            User.findById(order.userId).lean(),
            OrderItem.find({ orderId }).lean(),
            Payment.findOne({ orderId }).lean(),
        ]);

        return res.json({
            ok: true,
            data: toPublicOrder(order, user, items, payment),
        });
    } catch (error) {
        console.error("[OrderController] Failed to load order:", error);
        return res.status(500).json({
            ok: false,
            message: "Failed to load order.",
        });
    }
}

// #28  - As a customer, I want to track my order status so that I know when my drink will be ready.
// #203 - As a customer, I want to track my order status through the chatbot so that I know when my drink will be ready.
// Updates the status field (pending → preparing → ready → completed) in the orders collection.
async function updateOrderStatus(req, res) {
    try {
        const orderId = toObjectId(req.params.id);
        const status = String(req.body?.status || "").trim().toLowerCase();
        const allowedStatuses = new Set(["pending", "preparing", "ready", "completed", "cancelled"]);

        if (!orderId || !allowedStatuses.has(status)) {
            return res.status(400).json({
                ok: false,
                message: "A valid order id and status are required.",
            });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { $set: { status } },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedOrder) {
            return res.status(404).json({
                ok: false,
                message: "Order not found.",
            });
        }

        return res.json({
            ok: true,
            data: {
                id: String(updatedOrder._id),
                status: updatedOrder.status,
            },
        });
    } catch (error) {
        console.error("[OrderController] Failed to update order status:", error);
        return res.status(500).json({
            ok: false,
            message: "Failed to update order status.",
        });
    }
}

module.exports = {
    processPayment,
    getOrders,
    getOrder,
    updateOrderStatus,
};
