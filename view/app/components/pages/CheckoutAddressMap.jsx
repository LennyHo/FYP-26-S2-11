"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"

function makeIcon(color) {
  return L.divIcon({
    className: "",
    html: `
      <svg width="32" height="40" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18C0 30 18 44 18 44C18 44 36 30 36 18C36 8.06 27.94 0 18 0Z" fill="${color}"/>
        <circle cx="18" cy="18" r="8" fill="white"/>
      </svg>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  })
}

const outletIcon = makeIcon("#0257AD")
const locationIcon = makeIcon("#9b6a3e")

function MapMover({ outlet, location }) {
  const map = useMap()

  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 16)
    } else {
      map.flyTo([outlet.lat, outlet.lng], 14)
    }
  }, [location, outlet, map])

  return null
}

export default function CheckoutAddressMap({ outlet, location }) {
  useEffect(() => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    })
  }, [])

  return (
    <MapContainer
      center={[outlet.lat, outlet.lng]}
      zoom={14}
      scrollWheelZoom={false}
      className="checkout-address-map"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapMover outlet={outlet} location={location} />

      <Marker position={[outlet.lat, outlet.lng]} icon={outletIcon}>
        <Popup>{outlet.name}</Popup>
      </Marker>

      {location && (
        <Marker position={[location.lat, location.lng]} icon={locationIcon}>
          <Popup>{location.address}</Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
