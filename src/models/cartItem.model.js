const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    menuItemCode: String,

    name: { type: String, required: true },
    image: String,
    category: String,

    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },

    customization: mongoose.Schema.Types.Mixed,

    status: {
      type: String,
      enum: ["active", "checked_out", "removed"],
      default: "active",
    },
  },
  { timestamps: true, collection: "cart_items" }
);

function toObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : null;
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

cartItemSchema.statics.addToCart = async function addToCart(customerId, beverageId, options = {}) {
  const MenuItem = require("./menuItem.model");

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
  const unitPrice = calculateCustomizedPrice(
    menuItem.price,
    options.customization
  );
  const lineTotal = unitPrice * quantity;

  const cartItem = await this.create({
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
};

cartItemSchema.statics.getCart = async function getCart(customerId) {
  const userObjectId = toObjectId(customerId);

  if (!userObjectId) {
    throw new Error("Invalid customerId.");
  }

  return this.find({
    userId: userObjectId,
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();
};

cartItemSchema.statics.getCartItemById = async function (cartItemId) {
  return this.findById(cartItemId).lean();
};

cartItemSchema.statics.removeFromCart = async function removeFromCart(cartItemId) {
  const itemObjectId = toObjectId(cartItemId);

  if (!itemObjectId) {
    throw new Error("Invalid cart item id.");
  }

  return this.findByIdAndDelete(itemObjectId).lean();
};

cartItemSchema.statics.updateCartItem = async function updateCartItem(cartItemId, payload = {}) {
  const itemObjectId = toObjectId(cartItemId);

  if (!itemObjectId) {
    throw new Error("Invalid cart item id.");
  }

  const updateData = {};

  if (payload.quantity !== undefined) {
    updateData.quantity = Number(payload.quantity);
  }

  if (payload.customization !== undefined) {
    updateData.customization = payload.customization;
  }

  if (payload.unitPrice !== undefined) {
    updateData.unitPrice = Number(payload.unitPrice);
  }

  if (payload.lineTotal !== undefined) {
    updateData.lineTotal = Number(payload.lineTotal);
  } else if (payload.quantity !== undefined) {
    // lineTotal not supplied — recalculate from the stored unitPrice so the
    // displayed price stays correct when only the quantity changes.
    const existing = await this.findById(itemObjectId).select('unitPrice').lean();
    if (existing?.unitPrice) {
      updateData.lineTotal = Number(existing.unitPrice) * Number(payload.quantity);
    }
  }

  // Use $set so only the specified fields are updated — a plain object in
  // Mongoose 7+ is treated as a replacement document and drops all other fields.
  return this.findByIdAndUpdate(itemObjectId, { $set: updateData }, {
    new: true,
  }).lean();
};

module.exports = mongoose.model("CartItem", cartItemSchema);