// User Story Architecture Trace — purchase-history/page.tsx
//
// #19  View Purchase History
//      View: purchase-history/page.tsx (this file) → Route: purchaseHistory.routes.js → Ctrl: purchaseHistory.controller.js → Model: payment.model.js
//
// #198 Purchase History via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: payment.model.js
import PurchaseHistory from "../components/pages/PurchaseHistory";

export default function Page() {
  return <PurchaseHistory />;
}