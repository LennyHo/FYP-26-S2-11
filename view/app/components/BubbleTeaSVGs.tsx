import React from 'react';

export function RedBubbleTea() {
  return (
    <svg width="110" height="160" viewBox="0 0 110 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="30" width="90" height="110" rx="18" fill="#fbe4e4" stroke="#e94f37" strokeWidth="3" />
      <path d="M20 60 Q55 80 90 60 Q80 120 30 120 Q20 100 20 60" fill="#e94f37" fillOpacity="0.7" />
      <ellipse cx="55" cy="35" rx="35" ry="10" fill="#fff" fillOpacity="0.7" />
    </svg>
  );
}

export function BrownBubbleTea() {
  return (
    <svg width="140" height="180" viewBox="0 0 140 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="30" width="110" height="130" rx="22" fill="#fff9f3" stroke="#b77b57" strokeWidth="4" />
      <path d="M30 80 Q70 120 110 80 Q100 160 40 160 Q30 130 30 80" fill="#b77b57" fillOpacity="0.7" />
      <ellipse cx="70" cy="38" rx="40" ry="12" fill="#fff" fillOpacity="0.7" />
      {/* Boba pearls */}
      <circle cx="50" cy="150" r="7" fill="#b77b57" />
      <circle cx="70" cy="155" r="7" fill="#b77b57" />
      <circle cx="90" cy="150" r="7" fill="#b77b57" />
    </svg>
  );
}

export function GreenBubbleTea() {
  return (
    <svg width="110" height="160" viewBox="0 0 110 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="30" width="90" height="110" rx="18" fill="#e6f7e4" stroke="#7bb661" strokeWidth="3" />
      <path d="M20 60 Q55 80 90 60 Q80 120 30 120 Q20 100 20 60" fill="#7bb661" fillOpacity="0.7" />
      <ellipse cx="55" cy="35" rx="35" ry="10" fill="#fff" fillOpacity="0.7" />
    </svg>
  );
}

export function DoodleLeaf() {
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 16 Q12 2 22 16" stroke="#7bb661" strokeWidth="2" fill="none" />
      <ellipse cx="12" cy="14" rx="2" ry="1.5" fill="#7bb661" />
    </svg>
  );
}

export function DoodleDrop() {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2 Q12 10 6 16 Q0 10 6 2" fill="#e94f37" fillOpacity="0.7" stroke="#e94f37" strokeWidth="1.5" />
    </svg>
  );
}

export function DoodleBean() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="9" cy="6" rx="8" ry="5" fill="#b77b57" fillOpacity="0.7" stroke="#b77b57" strokeWidth="1.5" />
    </svg>
  );
}
