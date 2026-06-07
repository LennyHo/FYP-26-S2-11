const mongoose = require("mongoose");
const CartItem = require("../models/cartItem.model");
const MenuItem = require("../models/menuItem.model");

function toObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function calculateCustomizedPrice(basePrice, customization = {}) {
    let price = Number(basePrice || 0);

    if (String(customization.size || "").toLowerCase() === "large") {
        price += 1.5;
    }

    const toppings = Array.isArray(customization.toppings)
        ? customization.toppings
        : [];

    toppings.forEach((topping) => {
    const name = String(topping).toLowerCase();

    if (name.includes("pearl")) price += 1.0;
    else if (name.includes("aloe")) price += 1.0;
    else if (name.includes("cheese")) price += 1.5;
    });

    return price;
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
    const unitPrice = calculateCustomizedPrice(menuItem.price, options.customization);
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