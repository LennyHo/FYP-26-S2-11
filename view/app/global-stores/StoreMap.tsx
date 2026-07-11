"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useOutlets } from '../utils/outlets';

const CENTER: [number, number] = [1.3171, 103.7913];

function makeIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18C0 30 18 44 18 44C18 44 36 30 36 18C36 8.06 27.94 0 18 0Z" fill="${color}"/>
        <circle cx="18" cy="18" r="8" fill="white"/>
      </svg>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  });
}

const blueIcon  = makeIcon('#0257AD');
const redIcon   = makeIcon('#F43B03');
const icons     = [blueIcon, redIcon];

export default function StoreMap() {
  const { outlets: stores } = useOutlets();

  useEffect(() => {
    /* Fix for missing default marker images when using react-leaflet */
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer
      center={CENTER}
      zoom={12}
      style={{ width: '100%', height: '420px', borderRadius: '16px' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stores.map((store, i) => (
        <Marker key={store.storeCode} position={[store.lat, store.lng]} icon={icons[i % icons.length]}>
          <Popup>
            <strong style={{ color: '#0257AD' }}>{store.name}</strong><br />
            {store.address}<br />
            <span style={{ fontSize: '0.82rem', color: '#555' }}>{store.phone}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
