"use client";

import Image from 'next/image';
import styles from './AvySection.module.css';

const FEATURES = [
  { label: 'Just talk to her', desc: "Craving taro? Less sugar? Avy gets it. No tapping through menus." },
  { label: "She's got your back", desc: "Your faves are saved. Reorder in seconds without starting from scratch." },
  { label: 'Always around', desc: "Skip the queue, skip the wait. Avy's here whenever the craving hits." },
];

export default function AvySection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Say hi to Avy</p>
          <h2 className={styles.headline}>
            Skip the menu.<br />chat with Her.
          </h2>
          <p className={styles.sub}>
            Just drop Avy a message and she'll take it from there.
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
            CHAT WITH AVY
          </button>
        </div>

        <div className={styles.visual}>
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
