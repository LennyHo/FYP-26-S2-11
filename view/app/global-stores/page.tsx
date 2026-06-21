"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/layout/Header';
import styles from './GlobalStores.module.css';

const StoreMap = dynamic(() => import('./StoreMap'), { ssr: false });

const STORES = [
  {
    storeCode: 'DT-001',
    name: 'DripTea Orchard',
    address: '313 Orchard Road, #B2-01, Singapore 238895',
    phone: '+65 6123 4567',
    openingHours: { weekday: 'Mon – Fri  10:00 – 22:00', weekend: 'Sat – Sun  09:00 – 23:00' },
    variant: 'blue' as const,
  },
  {
    storeCode: 'DT-002',
    name: 'DripTea Jurong East',
    address: '50 Jurong Gateway Road, #03-12 JEM, Singapore 608549',
    phone: '+65 6234 5678',
    openingHours: { weekday: 'Mon – Fri  10:00 – 22:00', weekend: 'Sat – Sun  09:00 – 23:00' },
    variant: 'red' as const,
  },
];

export default function GlobalStoresPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>

        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.heroEyebrow}>Find Us</p>
          <h1 className={styles.heroHeadline}>Our Stores</h1>
          <p className={styles.heroSub}>
            Two locations across Singapore — pick up your order or let us deliver to your door.
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
            {STORES.map((store) => (
              <div key={store.storeCode} className={`${styles.card} ${styles[`card_${store.variant}`]}`}>
                <div className={styles.cardAccent} />
                <div className={styles.cardBody}>
                  <p className={styles.cardCode}>{store.storeCode}</p>
                  <h2 className={styles.cardName}>{store.name}</h2>

                  <div className={styles.infoRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.infoIcon}>
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{store.address}</span>
                  </div>

                  <div className={styles.infoRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.infoIcon}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.4 2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/>
                    </svg>
                    <span>{store.phone}</span>
                  </div>

                  <div className={styles.hoursBlock}>
                    <div className={styles.infoRow}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.infoIcon}>
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{store.openingHours.weekday}</span>
                    </div>
                    <div className={styles.infoRowIndented}>
                      <span>{store.openingHours.weekend}</span>
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
