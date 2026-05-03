
import React from 'react';
import Image from 'next/image';
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
        <div className={styles.imageFrame}>
          <Image
            src="/driptea_drinks.jpg"
            alt="A set of bubble tea drinks with milk pouring into a brown sugar milk tea cup"
            fill
            priority
            className={styles.heroImage}
            sizes="(max-width: 900px) 100vw, 430px"
          />
          <div className={styles.imageOverlay}>
            <span className={styles.imageTag}>Signature pour</span>
            <span className={styles.imageNote}>Brown sugar milk tea</span>
          </div>
        </div>
      </div>
    </section>
  );
}
