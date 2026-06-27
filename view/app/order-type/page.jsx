"use client"

import { useRouter } from "next/navigation"

export default function OrderTypePage() {
  const router = useRouter()

  function choosePickup() {
    localStorage.setItem("driptea_order_type", "pickup")
    localStorage.removeItem("driptea_delivery")
    router.push("/buy-driptea")
  }

  function chooseDelivery() {
    localStorage.setItem("driptea_order_type", "delivery")
    localStorage.removeItem("driptea_delivery")
    router.push("/buy-driptea")
  }

  return (
    <div className="order-type-page">
      <div className="order-type-card">
        <h1>How would you like to receive your order?</h1>
        <p>Choose first, then start ordering your drinks.</p>

        <div className="order-type-options">
          <button type="button" className="order-type-option" onClick={choosePickup}>
            <div className="order-type-icon">🧋</div>
            <h2>Pickup</h2>
            <p>Order now and collect at DripTea Bugis Junction.</p>
            <strong>No delivery fee</strong>
          </button>

          <button type="button" className="order-type-option" onClick={chooseDelivery}>
            <div className="order-type-icon">🛵</div>
            <h2>Delivery</h2>
            <p>Order drinks first, then choose your delivery address before checkout.</p>
            <strong>Delivery fee applies</strong>
          </button>
        </div>
      </div>
    </div>
  )
}