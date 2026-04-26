
import React from 'react';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Freshly brewed. Brightly layered.</p>
        <h1 className={styles.heroTitle}>
          UNIQUE BUBBLE TEA<br />& FRUIT DRIPS
        </h1>
        <p className={styles.heroText}>
          Clean tea bases, chewy boba, and fruit-forward drips served in a calmer, more premium rhythm.
        </p>
        <div className={styles.heroActions}>
          <button className={styles.heroButton}>FIND OUT MORE</button>
          <a href="/login" className={styles.heroLink}>SIGN IN</a>
        </div>
        <div className={styles.heroPills}>
          <span>House blend</span>
          <span>Seasonal fruit</span>
          <span>Fresh pearls</span>
        </div>
      </div>
      <div className={styles.heroVisual}>
        <div className={styles.heroCards}>
          <div className={`${styles.heroCard} ${styles.cardRed}`} />
          <div className={`${styles.heroCard} ${styles.cardGold}`} />
          <div className={`${styles.heroCard} ${styles.cardGreen}`} />
        </div>
        <div className={styles.heroPanel}>
          <span className={styles.panelLabel}>Limited pour</span>
          <strong>Strawberry matcha, brown sugar milk, and citrus tea spritzes</strong>
        </div>
      </div>
    </section>
  );
}
