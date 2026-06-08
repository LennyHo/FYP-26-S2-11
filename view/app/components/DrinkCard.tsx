import React from "react";
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
};

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
}: DrinkCardProps) {
  const accentClass =
    accent === "green"
      ? styles.green
      : accent === "red"
      ? styles.red
      : styles.brown;

  return (
    <div
      className={`${styles.card} ${accentClass} ${
        active ? styles.active : ""
      }`}
    >
      <img
        src={image}
        alt={name}
        className={styles.image}
        onError={(e) => {
          e.currentTarget.src = "/img/bubble_teas/b001.png";
        }}
      />
      <div className={styles.name}>{name}</div>
      <div className={styles.price}>{price}</div>
      <div className={styles.nutrition}>
        Nutri-Grade: {nutriGrade || "N/A"}<br />
        Sugar: {sugar ?? "N/A"}g<br />
        Calories: {calories ?? "N/A"} kcal
      </div>
      <div className={styles.rating}>⭐⭐⭐⭐☆</div>
      <Link
        href={`/menu/${categorySlug}/${id}`}
        className={styles.exploreButton}
      >
        Explore
      </Link>

      {active && <div className={styles.badge}>EXPLORE</div>}
    </div>
  );
}


/*
import React from 'react';
import styles from './DrinkCard.module.css';

export default function DrinkCard({ name, price, active, accent }: { name: string, price: string, active?: boolean, accent?: 'green' | 'brown' | 'red' }) {
  const accentClass = accent === 'green' ? styles.green : accent === 'red' ? styles.red : styles.brown;
  return (
    <div className={`${styles.card} ${accentClass} ${active ? styles.active : ''}`}>
      <div className={styles.image} />
      <div className={styles.name}>{name}</div>
      <div className={styles.price}>{price}</div>
      <div className={styles.rating}>⭐⭐⭐⭐☆</div>
      {active && <div className={styles.badge}>EXPLORE</div>}
    </div>
  );
}*/
