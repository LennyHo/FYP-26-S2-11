const mongoose = require("mongoose");
const Order = require("../models/order.model");

function toObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

async function getPurchaseHistory(userId) {
    const userObjectId = toObjectId(userId);

    if (!userObjectId) {
        throw new Error("Invalid userId.");
    }

    return Order.find({ userId: userObjectId })
    .sort({ createdAt: -1 })
    .lean();
}

module.exports = {
    getPurchaseHistory,
};