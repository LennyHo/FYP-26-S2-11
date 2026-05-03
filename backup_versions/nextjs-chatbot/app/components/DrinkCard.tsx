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
}
