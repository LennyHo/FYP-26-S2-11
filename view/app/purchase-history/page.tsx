// #19 - As a customer, I want to view my purchase history so that I can track my past orders.
// #198 - As a customer, I want to ask the AI chatbot to show my purchase history so that I can track my spending.
// Frontend: Loads PurchaseHistory component → calls GET /api/purchase-history?userId=<id>
// → purchaseHistory.controller.js → Payment.getPurchaseHistory() → reads payments + orders + order_items collections.
import PurchaseHistory from "../components/pages/PurchaseHistory";

export default function Page() {
  return <PurchaseHistory />;
}