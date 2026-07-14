"use client"

import { useRouter } from "next/navigation"
import Header from "../components/layout/Header"

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
    <>
      <Header />
      <div className="order-type-page">
        <div className="order-type-card">
          <h1>Choose Your Order Method</h1>
          <p>Select an option to continue to the menu.</p>

          <div className="order-type-options">
            <button type="button" className="order-type-option" onClick={choosePickup}>
              <div className="order-type-icon">🏪</div>
              <h2>Pickup</h2>
              <p>Skip the line. Grab your order at your nearest outlet.</p>
              <strong>No delivery fee</strong>
            </button>

            <button type="button" className="order-type-option" onClick={chooseDelivery}>
              <div className="order-type-icon">🛵</div>
              <h2>Delivery</h2>
              <p>Sit back and get it brought straight to your doorstep.</p>
              <strong>Delivery fee applies</strong>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
