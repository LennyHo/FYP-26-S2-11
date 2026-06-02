// ==========================================
// CHANGED: New Controller File for MVC Structure
// This controller handles all cart-related business logic
// ==========================================

const { Types } = require("mongoose");
const { MenuItem, CartItem } = require("../models/driptea.models");
const { getDb } = require("../config/mongo");

// CHANGED: Helper function to get active customer (extracted from route)
async function getActiveCustomerForCart(userId) {
  const { User } = require("../models/driptea.models");
  const user = await User.findById(userId).lean();
  if (!user || user.status !== "active") {
    throw new Error("Invalid or inactive user");
  }
  return user;
}

// CHANGED: Helper function to get MongoDB host label (extracted from route)
function getMongoHostLabel() {
  const { env } = require("../config/env");
  if (!env.mongodbUri) return "(MONGODB_URI not set)";

  try {
    const parsed = new URL(env.mongodbUri);
    return parsed.host || "(MongoDB host not reported)";
  } catch {
    return "(MongoDB host not parseable)";
  }
}

// CHANGED: Helper function to convert ObjectId to string (extracted from route)
function toObjectId(value) {
  if (!Types.ObjectId.isValid(String(value || ""))) {
    return null;
  }
  return new Types.ObjectId(String(value));
}

// CHANGED: Helper function to format cart item response (extracted from route)
function toPublicCartItem(item) {
  return {
    id: String(item._id),
    userId: String(item.userId),
    menuItemId: item.menuItemId ? String(item.menuItemId) : null,
    menuItemCode: item.menuItemCode || null,
    name: item.name,
    image: item.image,
    category: item.category,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    customization: item.customization || {},
  };
}

/**
 * CHANGED: New Controller Function - Add Item to Cart
 * 
 * This function handles the business logic for adding a beverage to the cart.
 * It performs validation, retrieves menu item details, creates the cart item,
 * and returns the response with storage information.
 * 
 * @param {Object} requestBody - The request body containing:
 *   - userId: Customer ID
 *   - menuItemId: Menu item ID (optional)
 *   - quantity: Item quantity (default: 1)
 *   - name: Custom item name (if no menuItemId)
 *   - image: Item image URL
 *   - category: Item category
 *   - unitPrice: Unit price (optional, defaults to menu item price)
 *   - lineTotal: Total line price (optional, calculated)
 *   - customization: Object with customizations (size, ice, sugar, toppings, etc.)
 * @param {Object} request - Express request object (for headers info)
 * @returns {Object} Response object with:
 *   - ok: boolean
 *   - data: Public cart item
 *   - storage: MongoDB storage information
 *   - backend: Backend/deployment information
 */
async function addBeverageToCart(requestBody, request) {
  // CHANGED: Validation - extract userId
  const userId = toObjectId(requestBody?.userId);
  if (!userId) {
    const error = new Error("A valid userId is required.");
    error.statusCode = 400;
    throw error;
  }

  // CHANGED: Extract and validate quantity
  const quantity = Math.max(1, Number(requestBody?.quantity || 1));

  // CHANGED: Look up menu item if menuItemId is provided
  const menuItemId = String(requestBody?.menuItemId || "").trim();
  const menuItem = menuItemId
    ? await MenuItem.findOne({
        $or: [
          { itemId: menuItemId },
          ...(Types.ObjectId.isValid(menuItemId) ? [{ _id: new Types.ObjectId(menuItemId) }] : []),
        ],
        status: "active",
      }).lean()
    : null;

  // CHANGED: Verify user is active
  const cartUser = await getActiveCustomerForCart(userId);

  // CHANGED: Calculate prices
  const unitPrice = Number(requestBody?.unitPrice || menuItem?.price || 0);
  const lineTotal = Number(requestBody?.lineTotal || unitPrice * quantity);

  // CHANGED: Build cart item object with customization support
  const cartItem = {
    userId,
    menuItemId: menuItem?._id || null,
    menuItemCode: menuItem?.itemId || menuItemId || null,
    name: String(requestBody?.name || menuItem?.name || "Custom Drink").trim(),
    image: String(requestBody?.image || menuItem?.image || "").trim(),
    category: String(requestBody?.category || menuItem?.category || "").trim(),
    quantity,
    unitPrice,
    lineTotal,
    customization:
      requestBody?.customization && typeof requestBody.customization === "object"
        ? requestBody.customization
        : {},
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // CHANGED: Save to database
  const result = await CartItem.create(cartItem);

  // CHANGED: Build storage metadata
  const db = await getDb();
  const storage = {
    type: "mongodb",
    database: db.databaseName,
    collection: "cart_items",
    mongoHost: getMongoHostLabel(),
  };

  // CHANGED: Build backend metadata from request headers
  const forwardedProto = request.get("x-forwarded-proto");
  const forwardedHost = request.get("x-forwarded-host");
  const backendHost = forwardedHost || request.get("host") || null;
  const backend = {
    host: backendHost,
    url: backendHost ? `${forwardedProto || request.protocol}://${backendHost}` : null,
    origin: request.get("origin") || null,
    renderService: process.env.RENDER_SERVICE_NAME || null,
    renderExternalUrl: process.env.RENDER_EXTERNAL_URL || null,
  };

  // CHANGED: Log success
  console.log(
    `[DripTea add to cart] SUCCESS backend=${backend.renderExternalUrl || backend.url || "(not reported)"} mongoHost=${storage.mongoHost} storage=${storage.type}:${storage.database}.${storage.collection} cartItemId=${String(result._id)} userId=${String(userId)} userEmail=${cartUser.email} item="${result.name}" quantity=${result.quantity}`
  );

  // CHANGED: Return formatted response
  return {
    ok: true,
    data: toPublicCartItem(result),
    storage,
    backend,
  };
}

// CHANGED: Export controller functions
module.exports = {
  addBeverageToCart,
};
