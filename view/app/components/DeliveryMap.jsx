"use client"

import { useEffect, useState } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents
} from "react-leaflet"
import L from "leaflet"
import { useOutlets } from "../utils/outlets"

const outletIcon = new L.Icon({
  iconUrl: "/img/icons/driptea-marker.svg",
  iconSize: [44, 54],
  iconAnchor: [22, 54],
  popupAnchor: [0, -54]
})

const customerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34]
})

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

function isValidValue(value) {
  return value && value !== "NIL" && value !== "null"
}

function formatOneMapAddress(result) {
  const name = isValidValue(result.SEARCHVAL) ? result.SEARCHVAL : ""
  const block = isValidValue(result.BLK_NO) ? result.BLK_NO : ""
  const road = isValidValue(result.ROAD_NAME) ? result.ROAD_NAME : ""
  const building = isValidValue(result.BUILDING) ? result.BUILDING : ""
  const address = isValidValue(result.ADDRESS) ? result.ADDRESS : ""
  const postal = isValidValue(result.POSTAL) ? result.POSTAL : ""

  const parts = []

  if (name) {
    parts.push(name)
  } else if (building) {
    parts.push(building)
  }

  if (block || road) {
    parts.push(`${block} ${road}`.trim())
  } else if (address) {
    parts.push(address)
  }

  if (postal) {
    parts.push(`Singapore ${postal}`)
  }

  return parts.join(", ") || address || name || "Selected location"
}

async function getAddressFromCoords(lat, lng) {
  try {
    const oneMapResponse = await fetch(
      `https://www.onemap.gov.sg/api/public/revgeocode?location=${lat},${lng}&buffer=500&addressType=All&otherFeatures=N`
    )

    const oneMapData = await oneMapResponse.json()
    const oneMapResults = oneMapData.GeocodeInfo || []

    if (oneMapResults.length > 0) {
      const bestResult =
        oneMapResults.find(
          (item) =>
            isValidValue(item.BUILDINGNAME) ||
            isValidValue(item.BLOCK) ||
            isValidValue(item.ROAD)
        ) || oneMapResults[0]

      const buildingName = isValidValue(bestResult.BUILDINGNAME)
        ? bestResult.BUILDINGNAME
        : ""

      const block = isValidValue(bestResult.BLOCK) ? bestResult.BLOCK : ""
      const road = isValidValue(bestResult.ROAD) ? bestResult.ROAD : ""
      const postal = isValidValue(bestResult.POSTALCODE)
        ? bestResult.POSTALCODE
        : ""

      const addressParts = []

      if (buildingName) addressParts.push(buildingName)
      if (block || road) addressParts.push(`${block} ${road}`.trim())
      if (postal) addressParts.push(`Singapore ${postal}`)

      const shortAddress = addressParts.join(", ")

      if (shortAddress) return shortAddress
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch (error) {
    console.error("Reverse geocode failed:", error)
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

function MapMover({ customerLocation, outlet }) {
  const map = useMap()

  useEffect(() => {
    if (customerLocation) {
      map.flyTo([customerLocation.lat, customerLocation.lng], 17)
    } else {
      map.flyTo([outlet.lat, outlet.lng], 14)
    }
  }, [customerLocation, map, outlet])

  return null
}

function LocationPicker({ onPick }) {
  useMapEvents({
    async click(e) {
      const lat = e.latlng.lat
      const lng = e.latlng.lng

      onPick({
        lat,
        lng,
        address: "Finding address..."
      })

      const address = await getAddressFromCoords(lat, lng)

      onPick({
        lat,
        lng,
        address
      })
    }
  })

  return null
}

export default function DeliveryMap({ cartTotal = 0 }) {
  const { outlets } = useOutlets()
  const [selectedOutletCode, setSelectedOutletCode] = useState("")
  const [customerLocation, setCustomerLocation] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchMessage, setSearchMessage] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const selectedOutlet =
    outlets.find((outlet) => outlet.storeCode === selectedOutletCode) ||
    outlets[0] ||
    null

  useEffect(() => {
    if (!selectedOutletCode && outlets.length > 0) {
      setSelectedOutletCode(outlets[0].storeCode)
    }
  }, [outlets, selectedOutletCode])

  const distanceKm = customerLocation && selectedOutlet
    ? calculateDistanceKm(
        selectedOutlet.lat,
        selectedOutlet.lng,
        customerLocation.lat,
        customerLocation.lng
      )
    : 0

  const deliveryFee = customerLocation ? 3 + Math.ceil(distanceKm) * 0.5 : 0

  const totalWithDelivery = cartTotal + deliveryFee

  useEffect(() => {
  const cleanQuery = searchQuery.trim()

  if (cleanQuery.length < 3) {
    setSearchResults([])
    setShowSuggestions(false)
    setSearchMessage("")
    return
  }

  const timer = setTimeout(() => {
    fetchSearchResults(cleanQuery, "suggest")
  }, 450)

  return () => clearTimeout(timer)
}, [searchQuery])

 async function fetchSearchResults(query, mode = "suggest") {
  const cleanQuery = query.trim()

  if (!cleanQuery || cleanQuery.length < 3) {
    setSearchResults([])
    setSearchMessage("")
    setShowSuggestions(false)
    return
  }

  setIsSearching(true)
  setSearchMessage("")

  try {
    const response = await fetch(
      `/api/onemap/search?q=${encodeURIComponent(cleanQuery)}`
    )

    const data = await response.json()

    if (!response.ok) {
      setSearchResults([])
      setShowSuggestions(false)
      setSearchMessage(data.error || "Search failed.")
      return
    }

    const results = data.results || []

    if (results.length === 0) {
      setSearchResults([])
      setShowSuggestions(false)

      if (mode === "search") {
        setSearchMessage("No matching location found.")
      }

      return
    }

    if (mode === "search") {
      selectSearchResult(results[0])
      return
    }

    setSearchResults(results.slice(0, 6))
    setShowSuggestions(true)
  } catch (error) {
    console.error("Search failed:", error)
    setSearchResults([])
    setShowSuggestions(false)
    setSearchMessage("Search failed. Please try again.")
  } finally {
    setIsSearching(false)
  }
}

function searchLocation() {
  if (!searchQuery.trim()) {
    setSearchMessage("Please enter a landmark, address, or postal code.")
    return
  }

  fetchSearchResults(searchQuery, "search")
}

  function selectSearchResult(result) {
    const lat = Number(result.LATITUDE)
    const lng = Number(result.LONGITUDE)

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setSearchMessage("This location has invalid map coordinates.")
      return
    }

    const address = formatOneMapAddress(result)

    setCustomerLocation({
      lat,
      lng,
      address
    })

    setSearchQuery(address)
    setSearchResults([])
    setShowSuggestions(false)
    setSearchMessage("")
  }

  function saveDeliveryLocation() {
    if (!customerLocation || !selectedOutlet) return

    const deliveryData = {
      type: "delivery",
      outletName: selectedOutlet.name,
      outletAddress: selectedOutlet.address,
      outletLat: selectedOutlet.lat,
      outletLng: selectedOutlet.lng,
      customerLat: customerLocation.lat,
      customerLng: customerLocation.lng,
      customerAddress: customerLocation.address,
      distanceKm,
      deliveryFee,
      deliveryStatus: "pending"
    }

    localStorage.setItem("driptea_delivery", JSON.stringify(deliveryData))
    window.location.href = "/checkout"
  }

  return (
    <div className="delivery-page">
      <h1>Delivery Location</h1>
      <p>Search for your building, landmark, road name, or postal code.</p>

      <div className="delivery-outlet-selector">
        <h2>Choose Store Location</h2>
        <div className="delivery-outlet-options">
          {outlets.map((outlet) => (
            <button
              type="button"
              key={outlet.storeCode}
              className={selectedOutletCode === outlet.storeCode ? "active" : ""}
              onClick={() => setSelectedOutletCode(outlet.storeCode)}
            >
              <strong>{outlet.name}</strong>
              <span>{outlet.address}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="delivery-search-box">
        <label className="delivery-search-label">Delivery address</label>

        <div className="delivery-search-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => {
              if (searchResults.length > 0) setShowSuggestions(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") searchLocation()
              if (e.key === "Escape") setShowSuggestions(false)
            }}
            placeholder="Example: Bugis Junction, 200 Victoria Street, Singapore 188021"
          />

          <button type="button" onClick={searchLocation} disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {searchMessage && (
          <p className="delivery-search-message">{searchMessage}</p>
        )}

        {showSuggestions && searchResults.length > 0 && (
          <div className="delivery-search-results">
            {searchResults.map((result, index) => (
              <button
                key={`${result.SEARCHVAL}-${result.POSTAL}-${index}`}
                type="button"
                onClick={() => selectSearchResult(result)}
                className="delivery-search-result"
              >
                <strong>{result.SEARCHVAL}</strong>
                <span>{formatOneMapAddress(result)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedOutlet ? (
        <p>Loading store locations...</p>
      ) : (
      <div className="delivery-layout">
        <div className="delivery-map-card">
          <MapContainer
            center={[selectedOutlet.lat, selectedOutlet.lng]}
            zoom={15}
            scrollWheelZoom={true}
            className="delivery-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapMover customerLocation={customerLocation} outlet={selectedOutlet} />

            <Marker
              position={[selectedOutlet.lat, selectedOutlet.lng]}
              icon={outletIcon}
            >
              <Popup>
                <strong>{selectedOutlet.name}</strong>
                <br />
                {selectedOutlet.address}
              </Popup>
            </Marker>

            {customerLocation && (
              <Marker
                position={[customerLocation.lat, customerLocation.lng]}
                icon={customerIcon}
              >
                <Popup>{customerLocation.address}</Popup>
              </Marker>
            )}

            <LocationPicker onPick={setCustomerLocation} />
          </MapContainer>
        </div>

        <div className="delivery-details-card">
          <h2>Delivery Summary</h2>

          <p>
            <strong>Outlet:</strong> {selectedOutlet.name}
          </p>

          <p>
            <strong>Outlet Address:</strong> {selectedOutlet.address}
          </p>

          <p>
           <strong>Selected Location:</strong>{" "}
            {customerLocation
            ? customerLocation.address
            : "No location selected"}
          </p>

          {customerLocation && (
            <>
              <p>
                <strong>Distance:</strong> {distanceKm.toFixed(2)} km
              </p>

              <p>
                <strong>Delivery Fee:</strong>{" "}
                S$ {deliveryFee.toFixed(2)}
              </p>

              <p>
                <strong>Total:</strong> S$ {totalWithDelivery.toFixed(2)}
              </p>

            </>
          )}

          <button
            type="button"
            className="primary-btn"
            disabled={!customerLocation}
            onClick={saveDeliveryLocation}
          >
            Save Location & Continue
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
