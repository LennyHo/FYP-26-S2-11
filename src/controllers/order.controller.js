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
const MenuItem = require("../models/menuItem.model");
const User = require("../models/user.model");
const Voucher = require("../models/voucher.model");
const Store = require("../models/store.model");

const QUEUE_STATUSES = ["pending", "paid", "preparing"];
const ACTIVE_ORDER_STATUSES = ["pending", "paid", "preparing", "ready"];

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
        deliveryDetails: order.deliveryDetails || null,
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
    const { userId, paymentMethod, voucherCode, deliveryDetails } = req.body;
    const requestedOrderType = String(req.body.orderType || "").trim().toLowerCase();
    const orderType = requestedOrderType === "delivery" ? "delivery" : "pickup";

    if (!userId) {
        return res.status(400).json({
        ok: false,
        message: "User ID is required.",
        });
    }

    // The store a customer picked at checkout (pickup outlet, or delivery's
    // "from" outlet) is what determines which store's dashboard the order lands in.
    const storeCode = String(
        orderType === "delivery" ? deliveryDetails?.storeCode || "" : req.body.storeCode || ""
    ).trim();

    if (!storeCode) {
        return res.status(400).json({
            ok: false,
            message: "A store must be selected to place an order.",
        });
    }

    const store = await Store.findOne({ storeCode }).lean();

    if (!store) {
        return res.status(400).json({
            ok: false,
            message: "The selected store could not be found.",
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

    const deliveryFee = orderType === "delivery" ? Number(deliveryDetails?.deliveryFee || 0) : 0;
    const totalAmount = Math.round((subtotal - discountAmount + deliveryFee) * 100) / 100;

    const order = await createOrderWithUniqueNumber({
        userId,
        storeId: store._id,
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
        orderType,
        status: "pending",
        voucherCode: appliedVoucherCode,
        discountAmount,
        deliveryDetails: orderType === "delivery"
            ? (deliveryDetails || null)
            : { type: "pickup", storeCode: store.storeCode, outletName: store.name, outletAddress: store.address },
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
        deliveryDetails: order.deliveryDetails || null,
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
        query.storeId = req.user.storeId;
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

// #301 - Customer queue/crowd status for a specific pickup or delivery order.
async function getOrderQueueStatus(req, res) {
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

        const status = String(order.status || "").toLowerCase();
        const orderIsQueued = QUEUE_STATUSES.includes(status);
        const store = order.storeId ? await Store.findById(order.storeId).lean() : null;
        const activeStoreOrders = order.storeId
            ? await Order.find({
                storeId: order.storeId,
                status: { $in: ACTIVE_ORDER_STATUSES },
            }).sort({ createdAt: 1 }).lean()
            : [];

        const ordersBefore = orderIsQueued
            ? activeStoreOrders.filter((row) =>
                ACTIVE_ORDER_STATUSES.includes(String(row.status || "").toLowerCase()) &&
                String(row._id) !== String(order._id) &&
                new Date(row.createdAt).getTime() < new Date(order.createdAt).getTime()
            )
            : [];

        const relevantOrderIds = [
            ...new Set([
                ...activeStoreOrders.map((row) => String(row._id)),
                ...ordersBefore.map((row) => String(row._id)),
                String(order._id),
            ]),
        ].map((id) => new mongoose.Types.ObjectId(id));
        const cupsByOrderId = new Map();

        if (relevantOrderIds.length) {
            const cupRows = await OrderItem.aggregate([
                { $match: { orderId: { $in: relevantOrderIds } } },
                { $group: { _id: "$orderId", cups: { $sum: "$quantity" } } },
            ]);

            cupRows.forEach((row) => {
                cupsByOrderId.set(String(row._id), Number(row.cups || 0));
            });
        }

        const cupsBefore = ordersBefore.reduce(
            (sum, row) => sum + Number(cupsByOrderId.get(String(row._id)) || 0),
            0
        );
        const activeCupCount = activeStoreOrders.reduce(
            (sum, row) => sum + Number(cupsByOrderId.get(String(row._id)) || 0),
            0
        );

        return res.json({
            ok: true,
            data: {
                orderId: String(order._id),
                orderNo: order.orderNo,
                status: order.status,
                orderType: order.orderType,
                storeCode: store?.storeCode || order.deliveryDetails?.storeCode || "",
                storeName: store?.name || order.deliveryDetails?.outletName || "Selected store",
                activeOrderCount: activeStoreOrders.length,
                activeCupCount,
                ordersBefore: ordersBefore.length,
                cupsBefore,
                orderCupCount: Number(cupsByOrderId.get(String(order._id)) || 0),
                position: orderIsQueued ? ordersBefore.length + 1 : 0,
                isQueueActive: orderIsQueued,
                deliveryStatus: order.orderType === "delivery" ? order.status : null,
                updatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("[OrderController] Failed to load order queue status:", error);
        return res.status(500).json({
            ok: false,
            message: "Failed to load order queue status.",
        });
    }
}

// Development helper for testing #301 without needing several real checkouts.
async function createTestQueueOrders(req, res) {
    try {
        if (process.env.NODE_ENV === "production") {
            return res.status(404).json({ ok: false, message: "Not found." });
        }

        const storeCode = String(req.body?.storeCode || "DT-001").trim();
        const orderCount = Math.min(Math.max(Number(req.body?.orders || 3), 0), 10);
        const cupsPerOrder = Math.min(Math.max(Number(req.body?.cupsPerOrder || 2), 1), 10);
        const clearExisting = Boolean(req.body?.clearExisting);

        const [store, customer, menuItem] = await Promise.all([
            Store.findOne({ storeCode }).lean(),
            User.findOne({ role: "customer" }).lean(),
            MenuItem.findOne({ status: "active" }).lean(),
        ]);

        if (!store) {
            return res.status(400).json({ ok: false, message: "Store not found." });
        }

        if (!customer) {
            return res.status(400).json({ ok: false, message: "No customer user found." });
        }

        if (!menuItem) {
            return res.status(400).json({ ok: false, message: "No active menu item found." });
        }

        if (clearExisting) {
            const existing = await Order.find({
                storeId: store._id,
                status: { $in: ACTIVE_ORDER_STATUSES },
                "deliveryDetails.isTestQueue": true,
            }).lean();
            const existingIds = existing.map((order) => order._id);

            if (existingIds.length) {
                await Promise.all([
                    OrderItem.deleteMany({ orderId: { $in: existingIds } }),
                    Order.deleteMany({ _id: { $in: existingIds } }),
                ]);
            }
        }

        if (orderCount === 0) {
            return res.status(200).json({
                ok: true,
                message: `Cleared test queue orders for ${store.name}.`,
                data: {
                    storeCode: store.storeCode,
                    storeName: store.name,
                    orders: [],
                },
            });
        }

        const created = [];
        const unitPrice = Number(menuItem.price || 5.2);

        for (let index = 0; index < orderCount; index += 1) {
            const quantity = cupsPerOrder;
            const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
            const order = await createOrderWithUniqueNumber({
                userId: customer._id,
                storeId: store._id,
                totalAmount: lineTotal,
                orderType: "pickup",
                status: "pending",
                voucherCode: null,
                discountAmount: 0,
                deliveryDetails: {
                    type: "pickup",
                    storeCode: store.storeCode,
                    outletName: store.name,
                    outletAddress: store.address,
                    isTestQueue: true,
                },
            });

            await OrderItem.create({
                orderId: order._id,
                userId: customer._id,
                menuItemId: menuItem._id,
                menuItemCode: menuItem.code || menuItem.id || "test",
                name: menuItem.name || "Test Drink",
                image: menuItem.image || "",
                category: menuItem.category || "Milk Tea",
                quantity,
                unitPrice,
                lineTotal,
                customization: {
                    size: "Regular",
                    ice: "Normal Ice",
                    sugar: "100% Sugar",
                    toppings: [],
                },
            });

            created.push({
                id: String(order._id),
                orderNo: order.orderNo,
                cups: quantity,
            });
        }

        return res.status(201).json({
            ok: true,
            message: `Created ${created.length} test queue orders for ${store.name}.`,
            data: {
                storeCode: store.storeCode,
                storeName: store.name,
                orders: created,
            },
        });
    } catch (error) {
        console.error("[OrderController] Failed to create test queue orders:", error);
        return res.status(500).json({
            ok: false,
            message: "Failed to create test queue orders.",
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
    getOrderQueueStatus,
    createTestQueueOrders,
    updateOrderStatus,
};
