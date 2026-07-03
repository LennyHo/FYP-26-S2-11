// User Story Architecture Trace — cart.controller.js
//
// #15  Add to Cart
//      View: buy-driptea/page.tsx → Route: cart.routes.js → Ctrl: cart.controller.js (this file) → Model: cartItem.model.js
//
// #16  View Cart
//      View: cart/page.tsx → Route: cart.routes.js → Ctrl: cart.controller.js (this file) → Model: cartItem.model.js
//
// #17  Edit Cart
//      View: cart/edit/[cartItemId]/page.tsx → Route: cart.routes.js → Ctrl: cart.controller.js (this file) → Model: cartItem.model.js
//
// #18  Apply Vouchers
//      View: checkout/page.tsx → Route: cart.routes.js → Ctrl: cart.controller.js (this file) → Model: voucher.model.js, cartItem.model.js
//
// #199 Add to Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Ctrl: cart.controller.js (this file) → Model: menuItem.model.js, cartItem.model.js
//
// #200 View Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Ctrl: cart.controller.js (this file) → Model: cartItem.model.js
//
// #201 Edit Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Ctrl: cart.controller.js (this file) → Model: cartItem.model.js

const CartItem = require("../models/cartItem.model");
const Voucher = require("../models/voucher.model");
const Order = require("../models/order.model");
async function addToCart(req, res) {
  try {
    const { customerId, userId, beverageId, menuItemId, quantity, customization } = req.body;

    const finalCustomerId = customerId || userId;
    const finalBeverageId = beverageId || menuItemId;

    const cartItem = await CartItem.addToCart(finalCustomerId, finalBeverageId, {
      quantity,
      customization,
    });

    return res.status(201).json({
      ok: true,
      message: "Item added to cart.",
      data: cartItem,
    });
  } catch (error) {
    console.error("[CartController] addToCart error:", error.message);

    return res.status(400).json({
      ok: false,
      message: error.message || "Failed to add item to cart.",
    });
  }
}

// #16  - As a customer, I want to view the beverages in my cart so that I can verify my order before proceeding to payment.
// #200 - As a customer, I want to view my cart through the chatbot so that I can review my selected beverages before checkout.
// Calls CartItem.getCart() → queries cart_items where userId matches and status is active.
async function getCart(req, res) {
  try {
    const customerId = req.query.customerId || req.query.userId;

    const cartItems = await CartItem.getCart(customerId);

    return res.json({
      ok: true,
      data: cartItems,
      itemCount: cartItems.length,
    });
  } catch (error) {
    console.error("[CartController] getCart error:", error.message);

    return res.status(400).json({
      ok: false,
      message: error.message || "Failed to load cart.",
    });
  }
}

// #16  - As a customer, I want to view the beverages in my cart so that I can verify my order before proceeding to payment.
// #200 - As a customer, I want to view my cart through the chatbot so that I can review my selected beverages before checkout.
// Calls CartItem.getCartItemById() → finds a single cart_items document by its _id.
async function getCartItem(req, res) {
  try {
    const item = await CartItem.getCartItemById(req.params.id);

    if (!item) {
      return res.status(404).json({
        ok: false,
        message: "Cart item not found.",
      });
    }

    return res.json({
      ok: true,
      data: item,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "Failed to load cart item.",
    });
  }
}

// #17  - As a customer, I want to edit beverages in my cart so that I can modify my order before completing the checkout process.
// #201 - As a customer, I want to edit items in my cart through the chatbot so that I can modify my order before payment.
// Calls CartItem.removeFromCart() → deletes the cart_items document by _id.
async function removeFromCart(req, res) {
  try {
    const deletedItem = await CartItem.removeFromCart(req.params.id);

    return res.json({
      ok: true,
      message: "Item removed from cart.",
      data: deletedItem,
    });
  } catch (error) {
    console.error("[CartController] removeFromCart error:", error.message);

    return res.status(400).json({
      ok: false,
      message: error.message || "Failed to remove cart item.",
    });
  }
}

// #17  - As a customer, I want to edit beverages in my cart so that I can modify my order before completing the checkout process.
// #201 - As a customer, I want to edit items in my cart through the chatbot so that I can modify my order before payment.
// Calls CartItem.updateCartItem() → updates quantity, customization, unitPrice, lineTotal in cart_items.
async function updateCartItem(req, res) {
  try {
    const updatedItem = await CartItem.updateCartItem(req.params.id, {
      quantity: req.body.quantity,
      customization: req.body.customization,
      unitPrice: req.body.unitPrice,
      lineTotal: req.body.lineTotal,
    });

    if (!updatedItem) {
      return res.status(404).json({
        ok: false,
        message: "Cart item not found.",
      });
    }

    return res.json({
      ok: true,
      message: "Cart item updated.",
      data: updatedItem,
    });
  } catch (error) {
    console.error("[CartController] updateCartItem error:", error.message);

    return res.status(400).json({
      ok: false,
      message: error.message || "Failed to update cart item.",
    });
  }
}

// #18 - As a customer, I want to see which vouchers I can apply during checkout.
// Returns all active, unexpired vouchers from the vouchers collection.
async function getActiveVouchers(req, res) {
  try {
    const vouchers = await Voucher.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      ok: true,
      data: vouchers.map((voucher) => ({
        code: voucher.code,
        title: voucher.title,
        description: voucher.description,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        maxDiscount: voucher.maxDiscount,
        minSpend: voucher.minSpend,
      })),
    });
  } catch (error) {
    console.error("[CartController] getActiveVouchers error:", error.message);

    return res.status(400).json({
      ok: false,
      message: "Failed to load vouchers.",
    });
  }
}

// #18 - As a customer, I want to apply vouchers during checkout so that I can enjoy discounts.
// Validates the voucher against the customer's cart subtotal (or a client-supplied subtotal
// for guest checkout, where there is no backend cart to look up) and returns the discount preview.
async function applyVoucher(req, res) {
  try {
    const { customerId, userId, voucherCode, subtotal: providedSubtotal } = req.body;
    const finalCustomerId = customerId || userId;

    if (!voucherCode) {
      return res.status(400).json({
        ok: false,
        message: "Voucher code is required.",
      });
    }

    let subtotal = Number(providedSubtotal || 0);

    if (finalCustomerId) {
      const cartItems = await CartItem.getCart(finalCustomerId);
      subtotal = cartItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    }

    const voucher = await Voucher.findValidByCode(voucherCode);

    if (!voucher) {
      return res.status(404).json({
        ok: false,
        message: "Voucher is invalid or has expired.",
      });
    }

    if (subtotal < Number(voucher.minSpend || 0)) {
      return res.status(400).json({
        ok: false,
        message: `Spend at least S$${Number(voucher.minSpend).toFixed(2)} to use this voucher.`,
      });
    }

    const discountAmount = Voucher.calculateDiscount(voucher, subtotal);

    return res.json({
      ok: true,
      data: {
        voucher: {
          code: voucher.code,
          title: voucher.title,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
        },
        subtotal,
        discountAmount,
        total: Math.round((subtotal - discountAmount) * 100) / 100,
      },
    });
  } catch (error) {
    console.error("[CartController] applyVoucher error:", error.message);

    return res.status(400).json({
      ok: false,
      message: error.message || "Failed to apply voucher.",
    });
  }
}

// #18 - As a customer, I want to see the vouchers I've already used so that I can
// track my redemption history. Reads orders where a voucher was actually applied.
async function getUsedVouchers(req, res) {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        message: "User ID is required.",
      });
    }

    const orders = await Order.find({ userId, voucherCode: { $ne: null } })
      .sort({ createdAt: -1 })
      .lean();

    const codes = [...new Set(orders.map((order) => order.voucherCode))];
    const voucherDocs = await Voucher.find({ code: { $in: codes } }).lean();
    const vouchersByCode = new Map(voucherDocs.map((voucher) => [voucher.code, voucher]));

    return res.json({
      ok: true,
      data: orders.map((order) => ({
        orderId: String(order._id),
        orderNo: order.orderNo,
        voucherCode: order.voucherCode,
        voucherTitle: vouchersByCode.get(order.voucherCode)?.title || order.voucherCode,
        discountAmount: Number(order.discountAmount || 0),
        usedAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error("[CartController] getUsedVouchers error:", error.message);

    return res.status(400).json({
      ok: false,
      message: "Failed to load voucher history.",
    });
  }
}

module.exports = {
  addToCart,
  getCart,
  getCartItem,
  removeFromCart,
  updateCartItem,
  getActiveVouchers,
  applyVoucher,
  getUsedVouchers,
};
