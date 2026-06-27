"use client"

import dynamic from "next/dynamic"

const DeliveryMap = dynamic(() => import("../components/DeliveryMap"), {
  ssr: false
})

export default function DeliveryPage() {
  return <DeliveryMap cartTotal={9.7} />
}