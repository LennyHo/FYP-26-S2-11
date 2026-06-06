const mongoose = require("mongoose");
const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");
const Payment = require("../models/payment.model");

function toObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

async function getPurchaseHistory(userId) {
    const userObjectId = toObjectId(userId);

    if (!userObjectId) {
        throw new Error("Invalid userId.");
    }

    const orders = await Order.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .lean();

    const orderIds = orders.map((order) => order._id);
    const [orderItems, payments] = await Promise.all([
        orderIds.length ? OrderItem.find({ orderId: { $in: orderIds } }).lean() : [],
        orderIds.length ? Payment.find({ orderId: { $in: orderIds } }).lean() : [],
    ]);

    const itemsByOrderId = new Map();
    for (const item of orderItems) {
        const key = String(item.orderId);
        const list = itemsByOrderId.get(key) || [];
        list.push(item);
        itemsByOrderId.set(key, list);
    }

    const paymentByOrderId = new Map(payments.map((payment) => [String(payment.orderId), payment]));

    // Add item/payment data here so the purchase history button shows real order details.
    return orders.map((order) => ({
        ...order,
        paymentStatus: paymentByOrderId.get(String(order._id))?.status || "unpaid",
        items: (itemsByOrderId.get(String(order._id)) || []).map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            customization: item.customization || {},
        })),
    }));
}

module.exports = {
    getPurchaseHistory,
};
