const mongoose = require("mongoose");
const CartItem = require("../models/cartItem.model");
const MenuItem = require("../models/menuItem.model");

function toObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

async function addToCart(customerId, beverageId, options = {}) {
    const userObjectId = toObjectId(customerId);
    const beverageObjectId = toObjectId(beverageId);

    if (!userObjectId) {
    throw new Error("Invalid customerId.");
    }

    let menuItem;

    if (beverageObjectId) {
    menuItem = await MenuItem.findById(beverageObjectId).lean();
    } else {
    menuItem = await MenuItem.findOne({ itemId: beverageId }).lean();
    }

    if (!menuItem || menuItem.status !== "active") {
    throw new Error("Beverage not found.");
    }

    const quantity = Number(options.quantity || 1);
    const unitPrice = Number(menuItem.price);
    const lineTotal = unitPrice * quantity;

    const cartItem = await CartItem.create({
    userId: userObjectId,
    menuItemId: menuItem._id,
    menuItemCode: menuItem.itemId,
    name: menuItem.name,
    image: menuItem.image,
    category: menuItem.category,
    quantity,
    unitPrice,
    lineTotal,
    customization: options.customization || {},
    status: "active",
    });

    return cartItem.toObject();
    }

async function getCart(customerId) {
    const userObjectId = toObjectId(customerId);

    if (!userObjectId) {
    throw new Error("Invalid customerId.");
    }

    return CartItem.find({
    userId: userObjectId,
    status: "active",
    })
    .sort({ createdAt: -1 })
    .lean();
}

async function removeFromCart(cartItemId) {
    const itemObjectId = toObjectId(cartItemId);

    if (!itemObjectId) {
    throw new Error("Invalid cart item id.");
    }

    return CartItem.findByIdAndDelete(itemObjectId).lean();
}

module.exports = {
    addToCart,
    getCart,
    removeFromCart,
};