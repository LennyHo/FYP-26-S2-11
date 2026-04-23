
import React from 'react';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.heroSection}>
      <h1 className={styles.heroTitle}>
        UNIQUE BUBBLE TEA<br />& FRUIT DRIPS
      </h1>
      <button className={styles.heroButton}>FIND OUT MORE</button>
      <div className={styles.heroCards}>
        <div className={styles.heroCard} style={{ background: '#fbe4e4', border: '2px solid #e94f37' }} />
        <div className={styles.heroCard} style={{ background: '#fff9f3', border: '3px solid #b77b57' }} />
        <div className={styles.heroCard} style={{ background: '#e6f7e4', border: '2px solid #7bb661' }} />
      </div>
    </section>
  );
}
