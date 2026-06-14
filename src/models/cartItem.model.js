const mongoose = require("mongoose");

// #15  - As a customer, I want to add a selected beverage to my cart so that I can review and purchase it later.
// #16  - As a customer, I want to view the beverages in my cart so that I can verify my order before proceeding to payment.
// #17  - As a customer, I want to edit beverages in my cart so that I can modify my order before completing the checkout process.
// #199 - As a customer, I want to add beverages into my cart through the chatbot.
// #200 - As a customer, I want to view my cart through the chatbot.
// #201 - As a customer, I want to edit items in my cart through the chatbot.
// Collection: cart_items — stores one document per cart line (userId, menuItemId, quantity, customization, lineTotal).
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

    if (name.includes("pearl")) price += 1.2;
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

  const existingItem = await this.findOne({
    userId: userObjectId,
    menuItemId: menuItem._id,
    status: "active",
    "customization.size": options.customization?.size,
    "customization.ice": options.customization?.ice,
    "customization.sugar": options.customization?.sugar,
    "customization.toppings": options.customization?.toppings || [],
  });

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.lineTotal = existingItem.unitPrice * existingItem.quantity;
    await existingItem.save();
    return existingItem.toObject();
  }
  
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

  const items = await this.find({
    userId: userObjectId,
    status: "active",
  })
    .sort({ createdAt: 1 })
    .lean();

  // Merge duplicate entries (same drink + same customization) that may exist
  // from before the addToCart duplicate-check logic was in place.
  const seen = new Map();
  const duplicateIds = [];

  for (const item of items) {
    const key = `${item.menuItemId}_${item.customization?.size || ""}_${item.customization?.ice || ""}_${item.customization?.sugar || ""}_${JSON.stringify(item.customization?.toppings || [])}`;
    if (seen.has(key)) {
      const primary = seen.get(key);
      primary.quantity += item.quantity;
      primary.lineTotal = primary.unitPrice * primary.quantity;
      duplicateIds.push(item._id);
    } else {
      seen.set(key, item);
    }
  }

  if (duplicateIds.length > 0) {
    const updates = [];
    for (const [, item] of seen) {
      updates.push(
        this.findByIdAndUpdate(item._id, { quantity: item.quantity, lineTotal: item.lineTotal })
      );
    }
    await Promise.all([
      ...updates,
      this.deleteMany({ _id: { $in: duplicateIds } }),
    ]);
  }

  return [...seen.values()];
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