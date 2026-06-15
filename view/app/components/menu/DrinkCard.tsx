"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./DrinkCard.module.css";



type DrinkCardProps = {
  id: string;
  name: string;
  price: string;
  image: string;
  categorySlug: string;
  active?: boolean;
  accent?: "green" | "brown" | "red";
  nutriGrade?: string;
  sugar?: number;
  calories?: number;
  rating?: number;
  wrapClassName?: string;
  drinkInfo?: {
    ingredients: string[];
    diabeticAdvice: string;
    insulinImpact: string;
  };
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.rating}>
      <span className={styles.stars}>
        {Array.from({ length: 5 }, (_, i) => {
          if (rating >= i + 1) return <span key={i} className={styles.star}>★</span>;
          if (rating >= i + 0.5) return <span key={i} className={styles.star}>⯨</span>;
          return <span key={i} className={styles.star}>☆</span>;
        })}
      </span>
      <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
    </div>
  );
}

export default function DrinkCard({
  id,
  name,
  price,
  image,
  categorySlug,
  active,
  accent,
  nutriGrade,
  sugar,
  calories,
  rating = 0,
  wrapClassName,
  drinkInfo,
}: DrinkCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const accentClass =
    accent === "green" ? styles.green : accent === "red" ? styles.red : styles.brown;

  const info = drinkInfo;

  return (
    <div className={`${styles.cardWrap} ${accentClass} ${active ? styles.active : ""} ${wrapClassName ?? ""}`}>
      <button
        type="button"
        className={`${styles.card} ${isFlipped ? styles.flipped : ""}`}
        onClick={() => setIsFlipped((f) => !f)}
        aria-label={`${isFlipped ? "Hide" : "Show"} details for ${name}`}
      >
        <div className={styles.cardInner}>
          {/* Front */}
          <div className={styles.cardFront}>
            <div className={styles.imageWrapper}>
              <img
                src={image}
                alt={name}
                className={styles.image}
                onError={(e) => {
                  e.currentTarget.src = "/img/bubble_teas/b001.png";
                }}
              />
            </div>

            <div className={styles.name}>{name}</div>
            <StarRating rating={rating} />

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>GRADE</span>
                <span className={styles.statValue}>{nutriGrade || "N/A"}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>SUGAR</span>
                <span className={styles.statValue}>
                  {sugar ?? "N/A"}
                  <small>g</small>
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>CAL</span>
                <span className={styles.statValue}>
                  {calories ?? "N/A"}
                  <small> kcal</small>
                </span>
              </div>
            </div>

            <div className={styles.tapHint}>Tap for details ↺</div>
          </div>

          {/* Back */}
          <div className={styles.cardBack}>
            {info ? (
              <>
                <div className={styles.backSection}>
                  <div className={styles.backTitle}>Ingredients:</div>
                  <ul className={styles.backList}>
                    {info.ingredients.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.backSection}>
                  <div className={styles.backTitle}>For Diabetics:</div>
                  <div className={styles.backText}>{info.diabeticAdvice}</div>
                </div>
                <div className={styles.backSection}>
                  <div className={styles.backTitle}>Insulin Impact:</div>
                  <div className={styles.backText}>{info.insulinImpact}</div>
                </div>
              </>
            ) : (
              <div className={styles.backText}>No detailed info available.</div>
            )}
          </div>
        </div>
      </button>

      <Link
        href={`/menu/${categorySlug}/${id}`}
        className={styles.tapLink}
        onClick={(e) => e.stopPropagation()}
      >
        Customize
      </Link>

      {active && <div className={styles.badge}>EXPLORE</div>}
    </div>
  );
}
