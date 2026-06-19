// User Story Architecture Trace — cart/page.tsx
//
// #16  View Cart
//      View: cart/page.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #17  Edit Cart
//      View: cart/page.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
"use client";

import Cart from '../components/pages/Cart';

export default function CartPageRoute() {
  return <Cart />;
}