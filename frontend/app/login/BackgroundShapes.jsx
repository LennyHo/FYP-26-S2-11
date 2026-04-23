import React from "react";

export default function BackgroundShapes() {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 0,
      overflow: "hidden",
      borderRadius: 24,
      background: "linear-gradient(135deg, #3a8dde 0%, #1e2a78 100%)"
    }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="shape1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b3e0ff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <ellipse cx="20%" cy="30%" rx="80" ry="40" fill="url(#shape1)" />
        <ellipse cx="80%" cy="70%" rx="100" ry="50" fill="url(#shape1)" />
        <ellipse cx="60%" cy="20%" rx="60" ry="30" fill="url(#shape1)" />
        <ellipse cx="30%" cy="80%" rx="70" ry="35" fill="url(#shape1)" />
        <ellipse cx="50%" cy="50%" rx="120" ry="60" fill="url(#shape1)" />
      </svg>
    </div>
  );
}
