"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { updateUser } from "../../utils/customerApi"
import { getStoredUser, storeUser, type DripTeaAddress, type DripTeaUser } from "../../utils/api.base"
import { useOutlets, type DripTeaOutlet } from "../../utils/outlets"
import OrderTypeSelect from "./OrderTypeSelect"
import type { DeliveryData } from "./Checkout"

const CheckoutAddressMap = dynamic(() => import("./CheckoutAddressMap"), {
  ssr: false,
})

type OneMapResult = Record<string, any>

function getOutletFromDelivery(delivery: DeliveryData | null, outlets: DripTeaOutlet[]) {
  if (!delivery) return outlets[0]

  return (
    outlets.find(
      (outlet) =>
        outlet.name === delivery.outletName ||
        outlet.address === delivery.outletAddress ||
        (Math.abs(outlet.lat - Number(delivery.outletLat)) < 0.000001 &&
          Math.abs(outlet.lng - Number(delivery.outletLng)) < 0.000001)
    ) || outlets[0]
  )
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function isValidValue(value: unknown) {
  return value && value !== "NIL" && value !== "null"
}

function formatOneMapAddress(result: OneMapResult) {
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

  if (postal) parts.push(`Singapore ${postal}`)

  return parts.join(", ") || address || name || "Selected location"
}

function getOneMapLatLng(result: OneMapResult) {
  const lat = Number(
    result.LATITUDE ??
      result.latitude ??
      result.Latitude ??
      result.LAT ??
      result.lat
  )
  const lng = Number(
    result.LONGITUDE ??
      result.longitude ??
      result.Longitude ??
      result.LNG ??
      result.lng
  )

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function getSearchQueries(query: string) {
  const cleaned = query
    .trim()
    .replace(/\s+/g, " ")
    .replace(/#[\w-]+/g, "")
    .replace(/\s*,\s*/g, ", ")
  const postalMatch = cleaned.match(/\b\d{6}\b/)
  const withoutSingaporePostal = cleaned
    .replace(/,?\s*Singapore\s+\d{6}\b/i, "")
    .replace(/\bSingapore\b/i, "")
    .trim()
  const firstSegment = cleaned.split(",")[0]?.trim()

  return [
    cleaned,
    postalMatch?.[0],
    withoutSingaporePostal,
    firstSegment,
  ].filter(
    (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index
  )
}

function getSavedAddresses(user: DripTeaUser | null = getStoredUser()) {
  const addresses: DripTeaAddress[] = Array.isArray(user?.addresses) ? user.addresses : []
  return addresses
    .map((entry) => ({
      label: String(entry?.label || "").trim(),
      address: String(entry?.address || "").trim(),
      isDefault: Boolean(entry?.isDefault),
    }))
    .filter((entry) => entry.address)
}

function getDefaultSavedAddress(addresses = getSavedAddresses()) {
  const defaultAddress = addresses.find((item) => item.isDefault) || addresses[0]
  return defaultAddress?.address || ""
}

function normalizeAddress(address: string) {
  return String(address || "").trim().replace(/\s+/g, " ").toLowerCase()
}

export default function CheckoutDeliveryAddress({
  delivery,
  onConfirm,
  onPreviewChange,
  onConfirmed,
  orderType,
  onOrderTypeChange,
}: {
  delivery: DeliveryData | null
  onConfirm: (deliveryData: DeliveryData) => void
  onPreviewChange?: (deliveryData: DeliveryData | null) => void
  onConfirmed?: () => void
  orderType: string
  onOrderTypeChange: (nextOrderType: string) => void
}) {
  const { outlets } = useOutlets()
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const [currentUser, setCurrentUser] = useState<DripTeaUser | null>(() => getStoredUser())
  const [savedAddresses, setSavedAddresses] = useState(() => getSavedAddresses())
  const [savedAddress, setSavedAddress] = useState(() =>
    getDefaultSavedAddress(getSavedAddresses())
  )
  const [selectedOutletCode, setSelectedOutletCode] = useState("")
  const [mode, setMode] = useState("saved")
  const [addressInput, setAddressInput] = useState(
    delivery?.customerAddress || savedAddress
  )
  const [selectedSavedAddress, setSelectedSavedAddress] = useState(
    delivery?.customerAddress || savedAddress
  )
  const [selectedLocation, setSelectedLocation] = useState(
    delivery
      ? {
          lat: delivery.customerLat,
          lng: delivery.customerLng,
          address: delivery.customerAddress || "",
        }
      : null
  )
  const [searchResults, setSearchResults] = useState<OneMapResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [message, setMessage] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [saveAddress, setSaveAddress] = useState(false)
  const [saveAddressLabel, setSaveAddressLabel] = useState("")
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const selectedOutlet =
    outlets.find((outlet) => outlet.storeCode === selectedOutletCode) ||
    outlets[0] ||
    null

  const distanceKm = selectedLocation && selectedOutlet
    ? calculateDistanceKm(
        selectedOutlet.lat,
        selectedOutlet.lng,
        selectedLocation.lat,
        selectedLocation.lng
      )
    : 0

  const deliveryFee = selectedLocation ? 3 + Math.ceil(distanceKm) * 0.5 : 0

  function buildDeliveryData(): DeliveryData | null {
    if (!selectedLocation || !selectedOutlet) return null

    return {
      type: "delivery",
      storeCode: selectedOutlet.storeCode,
      outletName: selectedOutlet.name,
      outletAddress: selectedOutlet.address,
      outletLat: selectedOutlet.lat,
      outletLng: selectedOutlet.lng,
      customerLat: selectedLocation.lat,
      customerLng: selectedLocation.lng,
      customerAddress: selectedLocation.address,
      distanceKm,
      deliveryFee,
      deliveryStatus: "pending",
    }
  }

  async function fetchOneMapResults(query: string): Promise<OneMapResult[]> {
    const response = await fetch(
      `/api/onemap/search?q=${encodeURIComponent(query)}`
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Address search failed.")
    }

    return data.results || []
  }

  async function fetchSearchResults(query: string, sourceMode = mode, autoSelect = false) {
    const cleanQuery = query.trim()

    if (cleanQuery.length < 3) {
      setSearchResults([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    setMessage("")

    try {
      let results: OneMapResult[] = []

      for (const searchQuery of getSearchQueries(cleanQuery)) {
        results = await fetchOneMapResults(searchQuery)
        if (results.length > 0) break
      }

      if (results.length === 0) {
        setSelectedLocation(null)
        setSearchResults([])
        setShowSuggestions(false)
        setMessage(
          sourceMode === "saved"
            ? "Could not find your saved address on the map. Try entering a new one instead."
            : "No matching address found."
        )
        return
      }

      if (sourceMode === "saved" || autoSelect) {
        selectSearchResult(results[0], false)
        return
      }

      setSearchResults(results.slice(0, 6))
      setShowSuggestions(true)
    } catch (error) {
      console.error("[Checkout delivery search]", error)
      setSelectedLocation(null)
      setMessage(error instanceof Error ? error.message : "Address search failed. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  function selectSearchResult(result: OneMapResult, keepSuggestionsOpen = false) {
    const coords = getOneMapLatLng(result)

    if (!coords) {
      setMessage("This address has invalid map coordinates.")
      return
    }

    const address = formatOneMapAddress(result)
    setSelectedLocation({ lat: coords.lat, lng: coords.lng, address })
    setAddressInput(address)
    setMessage("")
    setSearchResults([])
    setShowSuggestions(keepSuggestionsOpen)
  }

  function chooseSavedAddress() {
    setMode("saved")
    setAddressInput(savedAddress)
    setSelectedSavedAddress(savedAddress)
    setSelectedLocation(null)
    setSearchResults([])
    setShowSuggestions(false)

    if (savedAddress) {
      void fetchSearchResults(savedAddress, "saved")
    } else {
      setMessage("No saved address found. Enter a new address instead.")
    }
  }

  function chooseSavedAddressEntry(addressEntry: { address?: string }) {
    const nextAddress = String(addressEntry?.address || "").trim()
    if (!nextAddress) return

    setMode("saved")
    setSavedAddress(nextAddress)
    setAddressInput(nextAddress)
    setSelectedSavedAddress(nextAddress)
    setSelectedLocation(null)
    setSearchResults([])
    setShowSuggestions(false)
    void fetchSearchResults(nextAddress, "saved")
  }

  function chooseNewAddress() {
    setMode("new")
    setAddressInput("")
    setSelectedSavedAddress("")
    setSelectedLocation(null)
    setMessage("")
    setSearchResults([])
    setShowSuggestions(false)
  }

  async function saveSelectedAddress(deliveryData: DeliveryData) {
    if (!saveAddress || !currentUser) return "not-requested"

    const cleanAddress = String(deliveryData.customerAddress || "").trim()
    if (!cleanAddress) return "not-requested"

    const existingAddresses = Array.isArray(currentUser.addresses)
      ? currentUser.addresses
      : []
    const alreadySaved = existingAddresses.some(
      (entry) => normalizeAddress(entry.address) === normalizeAddress(cleanAddress)
    )

    if (alreadySaved) return "already-saved"

    const nextAddresses = [
      ...existingAddresses.map((entry) => ({
        label: String(entry.label || "").trim(),
        address: String(entry.address || "").trim(),
        isDefault: Boolean(entry.isDefault),
      })),
      {
        label: saveAddressLabel.trim() || "Delivery",
        address: cleanAddress,
        isDefault: existingAddresses.length === 0,
      },
    ].filter((entry) => entry.address)

    setIsSavingAddress(true)

    try {
      const response = await updateUser(currentUser.id, {
        addresses: nextAddresses,
      })
      const refreshedAddresses = getSavedAddresses(response.data)

      storeUser(response.data)
      setCurrentUser(response.data)
      setSavedAddresses(refreshedAddresses)
      setSavedAddress(cleanAddress)
      setAddressInput(cleanAddress)
      setMode("saved")
      window.dispatchEvent(new Event("profileUpdated"))
      return "saved"
    } finally {
      setIsSavingAddress(false)
    }
  }

  async function confirmDeliveryAddress() {
    const deliveryData = buildDeliveryData()

    if (!deliveryData) return

    window.localStorage.setItem("driptea_delivery", JSON.stringify(deliveryData))
    onConfirm(deliveryData)

    try {
      const saveResult = await saveSelectedAddress(deliveryData)
      if (saveResult === "saved") {
        setSaveAddress(false)
        setSaveAddressLabel("")
        setMessage("Delivery address confirmed and saved.")
      } else if (saveResult === "already-saved") {
        setSaveAddress(false)
        setMessage("Delivery address confirmed. This address is already saved.")
      } else {
        setMessage("Delivery address confirmed.")
      }
    } catch (error) {
      console.error("[Checkout save address]", error)
      setMessage("Delivery address confirmed, but the address could not be saved.")
    } finally {
      onConfirmed?.()
    }
  }

  useEffect(() => {
    if (!outlets.length || selectedOutletCode) return
    setSelectedOutletCode(getOutletFromDelivery(delivery, outlets).storeCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlets])

  useEffect(() => {
    if (delivery) return
    if (!savedAddress) {
      setMessage("No saved address found. Enter a new address instead.")
      return
    }

    void fetchSearchResults(savedAddress, "saved")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function refreshSavedAddresses() {
      const user = getStoredUser()
      const addresses = getSavedAddresses(user)
      const defaultSavedAddress = getDefaultSavedAddress(addresses)

      setCurrentUser(user)
      setSavedAddresses(addresses)
      setSavedAddress(defaultSavedAddress)

      if (mode === "saved" && !delivery) {
        setAddressInput(defaultSavedAddress)
        setSelectedSavedAddress(defaultSavedAddress)

        if (defaultSavedAddress) {
          void fetchSearchResults(defaultSavedAddress, "saved")
        } else {
          setSelectedLocation(null)
          setMessage("No saved address found. Enter a new address instead.")
        }
      }
    }

    window.addEventListener("authUpdated", refreshSavedAddresses)
    window.addEventListener("profileUpdated", refreshSavedAddresses)

    return () => {
      window.removeEventListener("authUpdated", refreshSavedAddresses)
      window.removeEventListener("profileUpdated", refreshSavedAddresses)
    }
  }, [delivery, mode])

  useEffect(() => {
    if (mode !== "new") return
    const cleanQuery = addressInput.trim()

    if (cleanQuery.length < 3) {
      setSearchResults([])
      setShowSuggestions(false)
      return
    }

    const timer = window.setTimeout(() => {
      const shouldAutoSelect =
        /\b\d{6}\b/.test(cleanQuery) || cleanQuery.includes(",")
      void fetchSearchResults(cleanQuery, "new", shouldAutoSelect)
    }, 450)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressInput, mode])

  useEffect(() => {
    if (!showSuggestions) return

    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showSuggestions])

  useEffect(() => {
    onPreviewChange?.(buildDeliveryData())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, selectedOutletCode, distanceKm, deliveryFee])

  return (
    <section className="checkout-address-card">
      <div className="checkout-outlet-selector">
        <div className="checkout-outlet-selector-header">
          <p>Deliver from</p>
          <OrderTypeSelect value={orderType} onChange={onOrderTypeChange} />
        </div>
        <div className="checkout-outlet-options">
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

      <div className="checkout-address-tabs">
        <button
          type="button"
          className={mode === "saved" ? "active" : ""}
          onClick={chooseSavedAddress}
        >
          Use my saved address
        </button>
        <button
          type="button"
          className={mode === "new" ? "active" : ""}
          onClick={chooseNewAddress}
        >
          Enter a new address
        </button>
      </div>

      {mode === "saved" && (
        <div className="checkout-saved-address-list">
          {savedAddresses.length > 0 ? (
            savedAddresses.map((entry, index) => (
              <button
                type="button"
                key={`${entry.address}-${index}`}
                className={
                  normalizeAddress(selectedSavedAddress) === normalizeAddress(entry.address)
                    ? "active"
                    : ""
                }
                onClick={() => chooseSavedAddressEntry(entry)}
              >
                <strong>{entry.label || `Address ${index + 1}`}</strong>
                <span>{entry.address}</span>
              </button>
            ))
          ) : (
            <p>No saved addresses yet.</p>
          )}
        </div>
      )}

      {mode === "new" && (
        <>
          <div className="checkout-address-map-wrap">
            {selectedOutlet && (
              <CheckoutAddressMap outlet={selectedOutlet} location={selectedLocation} />
            )}
          </div>

          <div className="checkout-address-search" ref={searchWrapperRef}>
            <input
              value={addressInput}
              onChange={(event) => {
                setAddressInput(event.target.value)
                setSelectedLocation(null)
                setShowSuggestions(true)
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowSuggestions(true)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void fetchSearchResults(addressInput, mode, true)
                }
                if (event.key === "Escape") setShowSuggestions(false)
              }}
              placeholder="Enter building, road name, or postal code"
            />

            {showSuggestions && searchResults.length > 0 && (
              <div className="checkout-address-results">
                {searchResults.map((result, index) => (
                  <button
                    type="button"
                    key={`${result.SEARCHVAL}-${result.POSTAL}-${index}`}
                    onClick={() => selectSearchResult(result)}
                  >
                    <strong>{result.SEARCHVAL}</strong>
                    <span>{formatOneMapAddress(result)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="checkout-save-address">
        <label className="checkout-save-address-check">
          <input
            type="checkbox"
            checked={saveAddress}
            disabled={!currentUser || !selectedLocation}
            onChange={(event) => setSaveAddress(event.target.checked)}
          />
          <span>Save this address for next time</span>
        </label>

        {!currentUser && (
          <p>Log in to save delivery addresses.</p>
        )}

        {currentUser && saveAddress && (
          <input
            value={saveAddressLabel}
            onChange={(event) => setSaveAddressLabel(event.target.value)}
            placeholder="Address label, e.g. Home"
            maxLength={32}
          />
        )}
      </div>

      {message && (
        <p
          className={`checkout-address-message ${
            message.includes("confirmed") ? "success" : ""
          }`}
        >
          {message}
        </p>
      )}

      <div className={`checkout-address-meta ${isSearching ? "is-updating" : ""}`}>
        <span>
          {selectedLocation && selectedOutlet
            ? `${distanceKm.toFixed(2)} km from ${selectedOutlet.name}`
            : "Select an address to see distance"}
        </span>
        <span>
          {selectedLocation ? `Delivery fee: S$ ${deliveryFee.toFixed(2)}` : "Delivery fee: —"}
        </span>
      </div>

      <button
        type="button"
        className="checkout-address-confirm"
        disabled={!selectedLocation || isSearching || isSavingAddress}
        onClick={confirmDeliveryAddress}
      >
        {isSavingAddress ? "Saving Address..." : "Confirm Address"}
      </button>
    </section>
  )
}
