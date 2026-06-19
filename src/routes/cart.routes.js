// User Story Architecture Trace — cart.routes.js
//
// #15  Add to Cart
//      View: buy-driptea/page.tsx → Route: cart.routes.js (this file) → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #16  View Cart
//      View: cart/page.tsx → Route: cart.routes.js (this file) → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #17  Edit Cart
//      View: cart/edit/[cartItemId]/page.tsx → Route: cart.routes.js (this file) → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #199 Add to Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Route: cart.routes.js (this file) → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #200 View Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Route: cart.routes.js (this file) → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #201 Edit Cart via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Route: cart.routes.js (this file) → Ctrl: cart.controller.js → Model: cartItem.model.js

const express = require("express");
const cartController = require("../controllers/cart.controller");

const router = express.Router();

// #15  Add to Cart | #199 Add to Cart via Chatbot
router.post("/cart-items", cartController.addToCart);

// #16  - As a customer, I want to view the beverages in my cart so that I can verify my order before proceeding to payment.
// #200 - As a customer, I want to view my cart through the chatbot so that I can review my selected beverages before checkout.
router.get("/cart-items", cartController.getCart);
router.get("/cart-items/:id", cartController.getCartItem);

// #17  - As a customer, I want to edit beverages in my cart so that I can modify my order before completing the checkout process.
// #201 - As a customer, I want to edit items in my cart through the chatbot so that I can modify my order before payment.
router.patch("/cart-items/:id", cartController.updateCartItem);
router.delete("/cart-items/:id", cartController.removeFromCart);

module.exports = router;
