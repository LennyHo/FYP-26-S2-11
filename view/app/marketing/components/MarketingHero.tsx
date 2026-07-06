import Image from 'next/image';
import styles from './MarketingHero.module.css';
import buttons from '../buttons.module.css';
import layout from '../marketing.module.css';

export default function MarketingHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.texture} aria-hidden="true" />
      <div className={`${layout.wrap} ${styles.inner}`}>
        <div>
          <p className={`${layout.eyebrow} ${styles.eyebrowEnter}`}>FYP-26-S2-11</p>
          <h1 className={styles.title}>
            Say what you&apos;re
            <br />
            craving.<span className={styles.titleAccent}> Avy pours it.</span>
          </h1>
          <p className={styles.sub}>
            DripTea is a neighbourhood bubble tea shop. Talk to Avy, the AI concierge who recommends your
            drink, remembers your order, and gets you straight to the front of the line.
          </p>
          <div className={styles.actions}>
            <a
              className={`${buttons.btn} ${buttons.large} ${buttons.blue}`}
              href="https://driptea-ruby.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Start an order
            </a>
          </div>
        </div>

        <div className={styles.visual}>
          <div className={styles.pearlRing} aria-hidden="true" />
          <div className={`${styles.pearlDot} ${styles.dot1}`} aria-hidden="true" />
          <div className={`${styles.pearlDot} ${styles.dot2}`} aria-hidden="true" />
          <div className={`${styles.pearlDot} ${styles.dot3}`} aria-hidden="true" />
          <Image
            src="/avy_flying.png"
            alt="Avy, DripTea's AI mascot"
            width={360}
            height={558}
            className={styles.avyImg}
            style={{ width: 'min(360px, 82%)', height: 'auto' }}
            priority
          />
        </div>
      </div>
      <svg className={styles.wave} viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,40 C 240,90 480,0 720,30 C 960,60 1200,10 1440,45 L1440,90 L0,90 Z" />
      </svg>
    </section>
  );
}
