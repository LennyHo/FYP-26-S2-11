"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/layout/Header';
import { useOutlets } from '../utils/outlets';
import { getStoreCrowdStats } from '../utils/customerApi';
import type { DripTeaStoreCrowdStat } from '../utils/api.base';
import styles from './GlobalStores.module.css';

const StoreMap = dynamic(() => import('./StoreMap'), { ssr: false });

export default function GlobalStoresPage() {
  const { outlets: stores } = useOutlets();
  const [crowdStats, setCrowdStats] = React.useState<Record<string, DripTeaStoreCrowdStat>>({});

  React.useEffect(() => {
    let isActive = true;

    async function loadCrowdStats() {
      try {
        const response = await getStoreCrowdStats();
        if (!isActive) return;

        setCrowdStats(
          Object.fromEntries((response.data || []).map((stat) => [stat.storeCode, stat]))
        );
      } catch (error) {
        console.error("[Stores crowd]", error);
      }
    }

    void loadCrowdStats();
    const timer = window.setInterval(() => void loadCrowdStats(), 5000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <Header />
      <main className={styles.main}>

        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.heroEyebrow}>Find Us</p>
          <h1 className={styles.heroHeadline}>Our Stores</h1>
          <p className={styles.heroSub}>
            Pick up your order or let us deliver to your door with our two outlets.
          </p>
        </section>

        {/* Content */}
        <div className={styles.content}>

          {/* Map */}
          <div className={styles.mapPanel}>
            <StoreMap />
          </div>

          {/* Store cards */}
          <div className={styles.cardsRow}>
            {stores.map((store) => (
              <div key={store.storeCode} className={styles.card}>
                <div className={styles.cardBody}>
                  <div className={styles.cardHead}>
                    <h2 className={styles.cardName}>{store.name}</h2>
                    <span className={styles.cardCode}>{store.storeCode}</span>
                  </div>

                  <div className={styles.crowdRow}>
                    <div className={styles.crowdStat}>
                      <strong>{crowdStats[store.storeCode]?.activeOrderCount ?? 0}</strong>
                      <span>current orders</span>
                    </div>
                    <div className={styles.crowdStat}>
                      <strong>{crowdStats[store.storeCode]?.activeCupCount ?? 0}</strong>
                      <span>cups in queue</span>
                    </div>
                    <div className={styles.crowdStatus}>
                      <span className={`${styles.crowdDot} ${styles[`crowd_${crowdStats[store.storeCode]?.crowdLevel || 'quiet'}`]}`} />
                      {(crowdStats[store.storeCode]?.crowdLevel || "quiet")}
                    </div>
                  </div>

                  <div className={styles.cardDivider} />

                  <div className={styles.infoRow}>{store.address}</div>

                  <div className={styles.infoRow}>{store.phone}</div>

                  <div className={styles.hoursBlock}>
                    <div className={styles.infoRow}>
                      Mon – Fri  {store.openingHours?.weekday}
                    </div>
                    <div className={styles.infoRow}>
                      Sat – Sun  {store.openingHours?.weekend}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
