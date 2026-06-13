// #16 - As a customer, I want to view the beverages in my cart so that I can verify my order before proceeding to payment.
// #17 - As a customer, I want to edit beverages in my cart so that I can modify my order before completing the checkout process.
// Frontend: Loads Cart component → calls GET /api/cart-items?userId=<id> → cart.controller.js
// → CartItem.getCart() → reads cart_items collection (status: active) → displays items with edit/remove options.
"use client";

import Cart from '../components/pages/Cart';

export default function CartPageRoute() {
  return <Cart />;
}