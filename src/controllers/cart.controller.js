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
// #199 Add to Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Ctrl: cart.controller.js (this file) → Model: menuItem.model.js, cartItem.model.js
//
// #200 View Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Ctrl: cart.controller.js (this file) → Model: cartItem.model.js
//
// #201 Edit Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Ctrl: cart.controller.js (this file) → Model: cartItem.model.js

const CartItem = require("../models/cartItem.model");
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

module.exports = {
  addToCart,
  getCart,
  getCartItem,
  removeFromCart,
  updateCartItem,
};
