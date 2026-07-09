"use client";

import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

type TrackingDelivery = {
  outletName: string;
  outletAddress: string;
  outletLat: number;
  outletLng: number;
  customerLat: number;
  customerLng: number;
  customerAddress?: string;
};

const outletIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const customerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const driverIcon = L.divIcon({
  className: "tracking-driver-marker",
  html: `
    <div class="tracking-bike-marker" aria-label="Delivery motorbike">
      <span class="tracking-bike-frame"></span>
      <span class="tracking-bike-wheel tracking-bike-wheel-left"></span>
      <span class="tracking-bike-wheel tracking-bike-wheel-right"></span>
      <span class="tracking-bike-handle"></span>
      <span class="tracking-bike-seat"></span>
      <span class="tracking-bike-box"></span>
    </div>
  `,
  iconSize: [56, 38],
  iconAnchor: [28, 22],
});

const outletLabelIcon = L.divIcon({
  className: "tracking-map-label tracking-map-label-outlet",
  html: "<span>DripTea Outlet</span>",
  iconSize: [132, 30],
  iconAnchor: [10, 36],
});

const customerLabelIcon = L.divIcon({
  className: "tracking-map-label tracking-map-label-customer",
  html: "<span>Your Location</span>",
  iconSize: [118, 30],
  iconAnchor: [20, 38],
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export default function TrackingDeliveryMap({
  delivery,
  progress,
  showRider = true,
}: {
  delivery: TrackingDelivery;
  progress: number;
  showRider?: boolean;
}) {
  const center: [number, number] = [
    (delivery.outletLat + delivery.customerLat) / 2,
    (delivery.outletLng + delivery.customerLng) / 2,
  ];
  const safeProgress = clamp(progress, 0, 1);
  const driverPosition: [number, number] = [
    interpolate(delivery.outletLat, delivery.customerLat, safeProgress),
    interpolate(delivery.outletLng, delivery.customerLng, safeProgress),
  ];
  const routePositions: [number, number][] = [
    [delivery.outletLat, delivery.outletLng],
    [
      interpolate(delivery.outletLat, delivery.customerLat, 0.35) + 0.006,
      interpolate(delivery.outletLng, delivery.customerLng, 0.35) - 0.01,
    ],
    [
      interpolate(delivery.outletLat, delivery.customerLat, 0.66) - 0.004,
      interpolate(delivery.outletLng, delivery.customerLng, 0.66) + 0.012,
    ],
    [delivery.customerLat, delivery.customerLng],
  ];

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      className="tracking-map"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[delivery.outletLat, delivery.outletLng]} icon={outletIcon}>
        <Popup>
          <strong>{delivery.outletName}</strong>
          <br />
          {delivery.outletAddress}
        </Popup>
      </Marker>
      <Marker position={[delivery.outletLat, delivery.outletLng]} icon={outletLabelIcon} />
      <Marker position={[delivery.customerLat, delivery.customerLng]} icon={customerIcon}>
        <Popup>{delivery.customerAddress || "Your location"}</Popup>
      </Marker>
      <Marker position={[delivery.customerLat, delivery.customerLng]} icon={customerLabelIcon} />
      {showRider && (
        <Marker position={driverPosition} icon={driverIcon}>
          <Popup>Delivery rider en route</Popup>
        </Marker>
      )}
      <Polyline
        positions={routePositions}
        pathOptions={{ color: "#8a4e28", dashArray: "8 10", weight: 4 }}
      />
    </MapContainer>
  );
}
