"use client";

import Image from 'next/image';
import styles from './AvySection.module.css';

export default function AvySection() {
  return (
    <section className={styles.section}>
      {/* Background decorative elements */}
      <div className={styles.blobTopRight} />
      <div className={styles.blobBottomLeft} />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Dripconcierge</p>
          <h2 className={styles.headline}>
            Order in seconds.<br />Talk to Avy.
          </h2>
          <p className={styles.sub}>
            Tell Avy what you're in the mood for, she finds the perfect drink, remembers your preferences, and places your order without you lifting a finger.
          </p>

          <button
            type="button"
            className={styles.cta}
            onClick={() => window.dispatchEvent(new CustomEvent('openAvyChat'))}
          >
            Meet Avy
          </button>
        </div>

        <div className={styles.visual}>
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
