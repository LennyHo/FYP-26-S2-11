const cartService = require("../services/cart.service");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");
const Payment = require("../models/payment.model");
const CartItem = require("../models/cartItem.model");
const User = require("../models/user.model");

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
        name: item.name || "Drink",
        quantity: Number(item.quantity || 1),
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

async function processPayment(req, res) {
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
        voucherCode: voucherCode || null,
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
