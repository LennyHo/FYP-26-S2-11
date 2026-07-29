"use client";

// User Story Architecture Trace — checkout/page.tsx
//
// #18  Apply Vouchers
//      View: checkout/page.tsx (this file) → Route: checkout.routes.js → Ctrl: cart.controller.js → Model: voucher.model.js
//
// #23  Make Payment
//      View: checkout/page.tsx (this file) → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js, payment.model.js

import CheckoutPage from "../components/pages/Checkout";

// Order method (pickup/delivery) is no longer chosen before browsing the menu —
// CheckoutPage itself prompts for it as the first step whenever it isn't set yet.
export default function Page() {
  return <CheckoutPage />;
}
