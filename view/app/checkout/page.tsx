"use client";

// User Story Architecture Trace — checkout/page.tsx
//
// #18  Apply Vouchers
//      View: checkout/page.tsx (this file) → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js
//
// #23  Make Payment
//      View: checkout/page.tsx (this file) → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js, payment.model.js

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CheckoutPage from "../components/pages/Checkout";

export default function Page() {
  const router = useRouter();
  const [canShowCheckout, setCanShowCheckout] = useState(false);

  useEffect(() => {
    const orderType = window.localStorage.getItem("driptea_order_type");
    const deliveryData = window.localStorage.getItem("driptea_delivery");

    // If customer came directly to checkout without choosing pickup/delivery
    if (!orderType && !deliveryData) {
      router.replace("/order-type");
      return;
    }

    // If customer selected delivery but has not chosen delivery address
    if (orderType === "delivery" && !deliveryData) {
      router.replace("/delivery");
      return;
    }

    // If customer selected pickup, remove any old delivery address
    if (orderType === "pickup") {
      window.localStorage.removeItem("driptea_delivery");
    }

    setCanShowCheckout(true);
  }, [router]);

  if (!canShowCheckout) {
    return (
      <div className="checkout-page">
        <main className="checkout-main">
          <p>Loading checkout...</p>
        </main>
      </div>
    );
  }

  return <CheckoutPage />;
}