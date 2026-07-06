import styles from './ShopSection.module.css';
import layout from '../marketing.module.css';

export default function ShopSection() {
  return (
    <section className={styles.section} id="shop">
      <div className={layout.wrap}>
        <div className={styles.hero}>
          <div className={styles.heroStarfield} />
          <div className={styles.heroStarsBright} />
          <div className={styles.heroNebula} />
          <div className={styles.heroBlob} />
          <div className={styles.heroBlobRed} />
          <div className={styles.heroSpotlight} />
          <div className={styles.heroRingOuter} />
          <div className={styles.heroRingMid} />
          <div className={styles.heroRingInner} />
          <div className={styles.heroBurst} />
          <div className={styles.heroCornerTL} />
          <div className={styles.heroCornerTR} />
          <div className={styles.heroCornerBL} />
          <div className={styles.heroCornerBR} />
          <div className={styles.heroBottomFade} />
          <div className={styles.heroInner}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/main_logo.svg" alt="DripTea" className={styles.heroLogo} />
            <p className={styles.heroEyebrow}>Our Story</p>
            <h2 className={styles.heroHeadline}>
              From one small shop
              <br />
              to a cup you crave.
            </h2>
            <p className={styles.heroSub}>
              Driptea. A decade of passion, craft, and community, brewed into every drop. Freshly Brwed, Brightly Layered.
            </p>
            <div className={styles.heroRule} />
          </div>
        </div>
      </div>
    </section>
  );
}
