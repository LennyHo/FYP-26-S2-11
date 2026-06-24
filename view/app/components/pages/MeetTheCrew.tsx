"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';
import { getStoredUser } from '../../utils/api.base';
import styles from './MeetTheCrew.module.css';

const dancingScript = Dancing_Script({ subsets: ['latin'], weight: '700' });

const STORE_LOCATIONS = [
  { name: 'DripTea Orchard', address: '1 Orchard Road, #B1-01, Singapore 238801', hours: 'Mon – Sun: 10am – 10pm', mapsUrl: 'https://maps.google.com/?q=1+Orchard+Road+Singapore' },
  { name: 'DripTea Jurong East', address: '2 Jurong East Central, #02-15, Singapore 609731', hours: 'Mon – Sun: 10am – 9:30pm', mapsUrl: 'https://maps.google.com/?q=2+Jurong+East+Central+Singapore' },
];

export default function MeetTheCrew() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section className={styles.meetSection}>
      <div className={styles.videoWrapper}>
        <video
          className={styles.meetVideo}
          src="/buy_driptea_3.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className={styles.overlay}>
          <p className={styles.eyebrow}>Purhcase your First Drink</p>
          <h2 className={styles.headline}>Your next favourite<br />drip is one tap away.</h2>
          <Link href="/buy-driptea" className={styles.ctaButton}>
            VIEW ALL DRIPS
          </Link>
        </div>
      </div>

      {!user ? (
        <>
          <div className={styles.perksRow}>
            <div className={styles.perkCardBrew}>
              <Image
                src="/ingredients.png"
                alt="Fresh ingredients"
                fill
                className={styles.perkBrewImg}
              />
              <div className={styles.perkAvyOverlay}>
                <span className={styles.perkChipLight}>Made Fresh</span>
                <h3 className={styles.perkTitleLight}>Crafted to Order</h3>
                <p className={styles.perkDescLight}>Made from scratch, every time. No pre-mixes, no funny business.</p>
              </div>
            </div>

            <div className={styles.perkCardAvy}>
              <Image
                src="/avy_staring.png"
                alt="Avy"
                width={120}
                height={120}
                className={styles.perkAvyImg}
              />
              <div className={styles.perkAvyOverlay}>
                <span className={styles.perkChipLight}>Members Only</span>
                <h3 className={styles.perkTitleLight}>Avy Remembers You</h3>
                <p className={styles.perkDescLight}>You will gain full access to Avy features. Register now!</p>
              </div>
            </div>
          </div>

          <div className={styles.ctaBanner}>
            <p className={`${styles.ctaBannerEyebrow} ${dancingScript.className}`}>Join the Crew</p>
            <h2 className={styles.ctaBannerHeadline}>Your first order is on us.</h2>
            <p className={styles.ctaBannerSub}>Sign up free and your first drink's on the house. Avy keeps your go-to orders saved, you rack up points every sip, and reordering takes literally one message.</p>
            <Link href="/register" className={styles.ctaBannerBtn}>
              CREATE FREE ACCOUNT
            </Link>
          </div>
        </>
      ) : (
        <div className={styles.memberSection}>
          <div className={styles.memberHeader}>
            <p className={`${styles.memberEyebrow} ${dancingScript.className}`}>Come visit us</p>
            <h2 className={styles.memberHeadline}>Find a DripTea near you.</h2>
            <p className={styles.memberSub}>Walk in or order ahead. We're brewing fresh at every location.</p>
          </div>
          <div className={styles.memberBenefitsGrid}>
            {STORE_LOCATIONS.map((store) => (
              <div key={store.name} className={styles.storeCard}>
                <div className={styles.storeCardName}>
                  <svg className={styles.storeCardIcon} viewBox="0 0 24 24" fill="none" stroke="rgba(255,185,100,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  {store.name}
                </div>
                <div className={styles.storeCardMeta}>
                  <div className={styles.storeCardRow}>
                    <svg className={styles.storeCardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    {store.address}
                  </div>
                  <div className={styles.storeCardRow}>
                    <svg className={styles.storeCardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {store.hours}
                  </div>
                </div>
                <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.storeCardLink}>
                  Get Directions
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                  </svg>
                </a>
              </div>
            ))}
          </div>

          <div className={styles.voucherBanner}>
            <svg className={styles.voucherIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
            </svg>
            <div className={styles.voucherText}>
              <span className={styles.voucherTitle}>Welcome Voucher Included</span>
              <span className={styles.voucherDesc}>Sign up for a free account and a welcome voucher drops into your account automatically. Redeem it on your first order at any location.</span>
            </div>
          </div>

          <Link href="/buy-driptea" className={styles.ctaBannerBtn}>
            ORDER NOW
          </Link>
        </div>
      )}
    </section>
  );
}
