"use client"

import { useRouter } from "next/navigation"
import Header from "../components/layout/Header"
import heroStyles from "../components/pages/OurStory.module.css"

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
        <div className={heroStyles.heroStarfield} />
        <div className={heroStyles.heroStarsBright} />
        <div className={heroStyles.heroNebula} />
        <div className={heroStyles.heroBlob} />
        <div className={heroStyles.heroBlobRed} />
        <div className={heroStyles.heroSpotlight} />
        <div className={heroStyles.heroRingOuter} />
        <div className={heroStyles.heroRingMid} />
        <div className={heroStyles.heroRingInner} />
        <div className={heroStyles.heroBurst} />
        <div className={heroStyles.heroCornerTL} />
        <div className={heroStyles.heroCornerTR} />
        <div className={heroStyles.heroCornerBL} />
        <div className={heroStyles.heroCornerBR} />
        <div className={heroStyles.heroBottomFade} />

        <div className="order-type-card">
          <h1>Choose Your Order Method</h1>
          <p>Select an option to continue to the menu.</p>

          <div className="order-type-options">
            <button type="button" className="order-type-option" onClick={choosePickup}>
              <div className="order-type-icon">🧋</div>
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
