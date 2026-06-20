"use client";

import Image from 'next/image';
import styles from './AvySection.module.css';

const FEATURES = [
  {
    label: 'Say it, get it',
    desc: "Describe your craving — Avy searches the whole menu and finds your match instantly. No browsing, no scrolling.",
  },
  {
    label: 'Remembers your taste',
    desc: "Your sugar level, your go-to topping, your usual order — Avy keeps it all ready for next time.",
  },
  {
    label: 'No queue, no wait',
    desc: "Place your order any time in seconds. Avy's always on — even when the line isn't.",
  },
];

export default function AvySection() {
  return (
    <section className={styles.section}>
      {/* Background decorative elements */}
      <div className={styles.blobTopRight} />
      <div className={styles.blobBottomLeft} />
      <div className={styles.gridOverlay} />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Your AI Barista</p>
          <h2 className={styles.headline}>
            Order in seconds.<br />Talk to Avy.
          </h2>
          <p className={styles.sub}>
            Tell Avy what you're in the mood for — she finds the perfect drink, remembers your preferences, and places your order without you lifting a finger.
          </p>

          <ul className={styles.featureList}>
            {FEATURES.map((f) => (
              <li key={f.label} className={styles.featureItem}>
                <span className={styles.featureDot} />
                <div>
                  <p className={styles.featureLabel}>{f.label}</p>
                  <p className={styles.featureDesc}>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={styles.cta}
            onClick={() => window.dispatchEvent(new CustomEvent('openAvyChat'))}
          >
            Talk to Avy
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className={styles.visual}>
          <div className={styles.ringOuter} />
          <div className={styles.ringInner} />
          <div className={styles.avyGlow} />
          <Image
            src="/avy_flying.png"
            alt="Avy"
            width={320}
            height={420}
            className={styles.avyImg}
            priority
          />
        </div>
      </div>
    </section>
  );
}
