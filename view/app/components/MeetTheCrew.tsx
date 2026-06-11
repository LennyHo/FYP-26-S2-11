"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';
import { getStoredUser } from '../utils/dripteaApi';
import styles from './MeetTheCrew.module.css';

const dancingScript = Dancing_Script({ subsets: ['latin'], weight: '700' });

const MEMBER_BENEFITS = [
  { title: 'First Drink On Us', desc: 'Your first order is completely free — no catch, just good drinks.' },
  { title: 'Your Faves, Saved', desc: 'Your size, ice, and sugar preferences are remembered so every order feels effortless.' },
  { title: 'Avy Remembers You', desc: 'Avy saves your fave orders so reordering takes literally one message.' },
  { title: 'Members-Only Deals', desc: 'Get early access to new drops and exclusive offers just for members.' },
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
          <p className={styles.eyebrow}>Now Serving</p>
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
            <p className={`${styles.memberEyebrow} ${dancingScript.className}`}>Welcome back, {user.fullName?.split(' ')[0] || 'friend'}</p>
            <h2 className={styles.memberHeadline}>Good to have you here.</h2>
            <p className={styles.memberSub}>Here's a reminder of everything you've got as a DripTea member.</p>
          </div>
          <div className={styles.memberBenefitsGrid}>
            {MEMBER_BENEFITS.map((b) => (
              <div key={b.title} className={styles.memberBenefitCard}>
                <div>
                  <h3 className={styles.memberBenefitTitle}>{b.title}</h3>
                  <p className={styles.memberBenefitDesc}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/buy-driptea" className={styles.ctaBannerBtn}>
            ORDER NOW
          </Link>
        </div>
      )}
    </section>
  );
}
