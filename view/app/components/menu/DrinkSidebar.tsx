'use client';

import React, { useState } from 'react';
import styles from './DrinkSidebar.module.css';

export default function DrinkSidebar() {
  const [message, setMessage] = useState('');

  function handleAdd() {
    // Student note: this demo sidebar adds one sample row to the local cart.
    const existingData = window.localStorage.getItem("dripTeaCartData") || "";
    const sampleItem = "Drink name|Qty 1 | Regular | Normal Ice | Normal Sweet|S$ 4.50";
    window.localStorage.setItem("dripTeaCartData", existingData ? `${existingData}\n${sampleItem}` : sampleItem);
    window.dispatchEvent(new Event('cartUpdated'));
    setMessage('Added to cart.');
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topRow}>
        <div className={styles.logo}>DRIPTEA_LOGO</div>
        <span className={styles.menuIcon}>☰</span>
      </div>
      <div className={styles.heroImage} />
      <div className={styles.name}>Drink name</div>
      <div className={styles.price}>£4.50</div>
      <div className={styles.rating}>⭐⭐⭐⭐☆</div>
      <div className={styles.description}>
        Amazing, our newest lineup of fruit drips! Refreshing, sweet, and healthy.
      </div>
      <div className={styles.purchaseRow}>
        <input type="number" min={1} defaultValue={1} className={styles.quantity} title="Quantity" aria-label="Quantity" />
        <button type="button" className={styles.addButton} onClick={handleAdd}>Add</button>
      </div>
      {message && <div className={styles.description}>{message}</div>}
      <div className={styles.sectionTitle}>NUTRITIONAL INFO</div>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <strong>380kcal</strong>
          <span>Energy</span>
        </div>
        <div className={styles.infoItem}>
          <strong>12g</strong>
          <span>Fat</span>
        </div>
        <div className={styles.infoItem}>
          <strong>35g</strong>
          <span>Sugars</span>
        </div>
        <div className={styles.infoItem}>
          <strong>120mg</strong>
          <span>Caffeine</span>
        </div>
      </div>
    </aside>
  );
}
