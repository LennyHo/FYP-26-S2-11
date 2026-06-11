
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';
import styles from './MeetTheCrew.module.css';

const dancingScript = Dancing_Script({ subsets: ['latin'], weight: '700' });

export default function MeetTheCrew() {
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
          <p className={styles.eyebrow}>Now Serving</p>
          <h2 className={styles.headline}>Your next favourite<br />drip is one tap away.</h2>
          <Link href="/buy-driptea" className={styles.ctaButton}>
            VIEW ALL DRIPS
          </Link>
        </div>
      </div>

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
    </section>
  );
}
