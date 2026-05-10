"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './Footer.module.css';

export default function Footer() {
  const router = useRouter();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Brand Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>DripTea</h3>
            <p className={styles.description}>
              Freshly brewed. Brightly layered. Premium bubble tea crafted with passion.
            </p>
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="Facebook">f</a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">📷</a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">𝕏</a>
            </div>
          </div>

          {/* Quick Links */}
          <div className={styles.section}>
            <h4 className={styles.subtitle}>Quick Links</h4>
            <ul className={styles.links}>
              <li><a href="/buy-driptea" className={styles.link}>Buy DripTea</a></li>
              <li><a href="/our-story" className={styles.link}>Our Story</a></li>
              <li><a href="#" className={styles.link}>Menu</a></li>
              <li><a href="#" className={styles.link}>Locations</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className={styles.section}>
            <h4 className={styles.subtitle}>Support</h4>
            <ul className={styles.links}>
              <li><a href="#" className={styles.link}>Contact Us</a></li>
              <li><a href="#" className={styles.link}>FAQ</a></li>
              <li><a href="#" className={styles.link}>Shipping Info</a></li>
              <li><a href="#" className={styles.link}>Returns</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className={styles.section}>
            <h4 className={styles.subtitle}>Legal</h4>
            <ul className={styles.links}>
              <li><a href="#" className={styles.link}>Privacy Policy</a></li>
              <li><a href="#" className={styles.link}>Terms of Service</a></li>
              <li><a href="#" className={styles.link}>Cookie Policy</a></li>
              <li><a href="#" className={styles.link}>Accessibility</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className={styles.section}>
            <h4 className={styles.subtitle}>Newsletter</h4>
            <p className={styles.description}>Subscribe to get exclusive offers and updates.</p>
            <div className={styles.newsletter}>
              <input
                type="email"
                className={styles.emailInput}
                placeholder="Enter your email"
                aria-label="Email subscription"
              />
              <button className={styles.subscribeBtn}>Subscribe</button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            &copy; 2026 DripTea. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
