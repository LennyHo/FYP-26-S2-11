import React from "react";
import styles from "./BackgroundShapes.module.css";

export default function BackgroundShapes() {
  return (
    <div className={styles.background}>
      <svg className={styles.svg} width="100%" height="100%">
        <defs>
          <linearGradient id="shape1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#de6447" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7ba86a" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <ellipse cx="16%" cy="24%" rx="90" ry="44" fill="url(#shape1)" />
        <ellipse cx="80%" cy="72%" rx="120" ry="60" fill="url(#shape1)" />
        <ellipse cx="60%" cy="18%" rx="70" ry="34" fill="url(#shape1)" />
        <ellipse cx="28%" cy="82%" rx="78" ry="38" fill="url(#shape1)" />
        <ellipse cx="50%" cy="48%" rx="150" ry="72" fill="url(#shape1)" />
      </svg>
    </div>
  );
}
