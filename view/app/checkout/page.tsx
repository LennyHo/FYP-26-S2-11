// #18 - As a customer, I want to apply vouchers during checkout so that I can enjoy discounts.
// #23 - As a customer, I want to make payment on the checkout page so that I can complete my order.
// Frontend: Loads Checkout component → customer enters voucher + selects payment method → calls POST /api/checkout
// → order.controller.js → creates orders, order_items, payments records → clears cart_items collection.
import CheckoutPage from "../components/pages/Checkout";

export default function Page() {
  return <CheckoutPage />;
}