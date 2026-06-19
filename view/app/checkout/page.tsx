// User Story Architecture Trace — checkout/page.tsx
//
// #18  Apply Vouchers
//      View: checkout/page.tsx (this file) → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js
//
// #23  Make Payment
//      View: checkout/page.tsx (this file) → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js, payment.model.js
import CheckoutPage from "../components/pages/Checkout";

export default function Page() {
  return <CheckoutPage />;
}