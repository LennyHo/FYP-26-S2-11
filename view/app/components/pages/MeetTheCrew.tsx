"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';
import { getStoredUser } from '../../utils/api.base';
import { useOutlets } from '../../utils/outlets';
import styles from './MeetTheCrew.module.css';

const dancingScript = Dancing_Script({ subsets: ['latin'], weight: '700' });

function storeHoursLines(store: { openingHours?: { weekday: string; weekend: string } }) {
  if (!store.openingHours) return ['', ''];
  return [`Mon – Fri: ${store.openingHours.weekday}`, `Sat – Sun: ${store.openingHours.weekend}`];
}

function storeMapsUrl(store: { address: string }) {
  return `https://maps.google.com/?q=${encodeURIComponent(store.address)}`;
}

function addressLines(address: string) {
  const parts = address.split(',').map((p) => p.trim());
  const last = parts.pop() ?? '';
  return [parts.join(', '), last];
}

export default function MeetTheCrew() {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { outlets: storeLocations } = useOutlets();

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
          <Link href="/order-type" className={styles.ctaButton}>
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
            {storeLocations.map((store) => (
              <div key={store.storeCode} className={styles.storeCard}>
                <p className={styles.storeCardName}>{store.name}</p>
                <p className={styles.storeCardAddress}>
                  {addressLines(store.address).map((line, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </p>
                <p className={styles.storeCardHours}>
                  {storeHoursLines(store).map((line, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </p>
                <a href={storeMapsUrl(store)} target="_blank" rel="noopener noreferrer" className={styles.storeCardLink}>
                  Get Directions
                </a>
              </div>
            ))}
          </div>

          <div className={styles.voucherBanner}>
            <span className={styles.voucherTitle}>Welcome Voucher Included</span>
            <span className={styles.voucherDesc}>Sign up for a free account and a welcome voucher drops into your account automatically. Redeem it on your first order at any location.</span>
          </div>

          <Link href="/order-type" className={styles.ctaBannerBtn}>
            ORDER NOW
          </Link>
        </div>
      )}
    </section>
  );
}
