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
                    <p className={styles.cardCode}>{store.storeCode}</p>
                  </div>

                  <div className={styles.crowdPanel}>
                    <div>
                      <span>Current orders</span>
                      <strong>{crowdStats[store.storeCode]?.activeOrderCount ?? 0}</strong>
                    </div>
                    <div>
                      <span>Cups in queue</span>
                      <strong>{crowdStats[store.storeCode]?.activeCupCount ?? 0}</strong>
                    </div>
                    <p className={`${styles.crowdBadge} ${styles[`crowd_${crowdStats[store.storeCode]?.crowdLevel || 'quiet'}`]}`}>
                      {(crowdStats[store.storeCode]?.crowdLevel || "quiet").toUpperCase()}
                    </p>
                  </div>

                  <div className={styles.cardDivider} />

                  <div className={styles.infoRow}>
                    <span className={styles.infoIconChip}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.infoIcon}>
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </span>
                    <span>{store.address}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoIconChip}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.infoIcon}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/>
                      </svg>
                    </span>
                    <span>{store.phone}</span>
                  </div>

                  <div className={styles.hoursBlock}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoIconChip}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.infoIcon}>
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </span>
                      <span>Mon – Fri  {store.openingHours?.weekday}</span>
                    </div>
                    <div className={styles.infoRowIndented}>
                      <span>Sat – Sun  {store.openingHours?.weekend}</span>
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
