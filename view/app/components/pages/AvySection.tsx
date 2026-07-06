"use client";

import Image from 'next/image';
import styles from './AvySection.module.css';

const FEATURES = [
  {
    label: 'Just say it.',
    desc: "Tell Avy what you're craving and she'll find your perfect match instantly. No browsing, no scrolling required.",
  },
  {
    label: 'Save your taste once.',
    desc: "Set your sugar level, go-to toppings, and usual order once. Avy remembers everything for next time.",
  },
  {
    label: 'Skip the queue.',
    desc: "Order in seconds, any time. Avy's always ready to take your order, even when the line isn't.",
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
          <p className={styles.eyebrow}>Dripconcierge</p>
          <h2 className={styles.headline}>
            Order in seconds.<br />Talk to Avy.
          </h2>
          <p className={styles.sub}>
            Tell Avy what you're in the mood for, she finds the perfect drink, remembers your preferences, and places your order without you lifting a finger.
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
            Meet Avy
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
            height={496}
            className={styles.avyImg}
            priority
          />
        </div>
      </div>
    </section>
  );
}
