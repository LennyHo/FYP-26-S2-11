"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './Footer.module.css';

export default function Footer() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');

  function handleSubscribe() {
    if (!email.trim()) {
      setMessage('Enter your email first.');
      return;
    }

    // Student note: save newsletter signups locally for demo because no email service is built.
    const saved = JSON.parse(window.localStorage.getItem('dripTeaNewsletterEmails') || '[]');
    window.localStorage.setItem('dripTeaNewsletterEmails', JSON.stringify([...saved, email.trim()]));
    setEmail('');
    setMessage('Subscribed.');
  }

  function showDemoMessage(text: string) {
    setMessage(text);
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>DripTea</h3>
            <p className={styles.description}>
              Freshly brewed. Brightly layered. Premium bubble tea crafted with passion.
            </p>
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="Facebook">f</a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">IG</a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">X</a>
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.subtitle}>Quick Links</h4>
            <ul className={styles.links}>
              <li><a href="/buy-driptea" className={styles.link}>Buy DripTea</a></li>
              <li><a href="/our-story" className={styles.link}>Our Story</a></li>
              <li><a href="/menu/milk-tea" className={styles.link}>Menu</a></li>
              <li><a href="/global-stores" className={styles.link}>Locations</a></li>
            </ul>
          </div>

          <div className={styles.section}>
            <h4 className={styles.subtitle}>Support</h4>
            <ul className={styles.links}>
              <li><a href="/contact" className={styles.link}>Contact Us</a></li>
              <li><button type="button" className={styles.linkButton} onClick={() => router.push('/buy-driptea')}>FAQ</button></li>
              <li><button type="button" className={styles.linkButton} onClick={() => showDemoMessage('Shipping info is shown during checkout.')}>Shipping Info</button></li>
              <li><button type="button" className={styles.linkButton} onClick={() => showDemoMessage('Returns request noted. Please contact support for help.')}>Returns</button></li>
            </ul>
          </div>

          <div className={styles.section}>
            <h4 className={styles.subtitle}>Legal</h4>
            <ul className={styles.links}>
              <li><button type="button" className={styles.linkButton} onClick={() => showDemoMessage('Privacy policy opened for this demo.')}>Privacy Policy</button></li>
              <li><button type="button" className={styles.linkButton} onClick={() => showDemoMessage('Terms of service opened for this demo.')}>Terms of Service</button></li>
              <li><button type="button" className={styles.linkButton} onClick={() => showDemoMessage('Cookie policy opened for this demo.')}>Cookie Policy</button></li>
              <li><button type="button" className={styles.linkButton} onClick={() => showDemoMessage('Accessibility info opened for this demo.')}>Accessibility</button></li>
            </ul>
          </div>

          <div className={styles.section}>
            <h4 className={styles.subtitle}>Newsletter</h4>
            <p className={styles.description}>Subscribe to get exclusive offers and updates.</p>
            <div className={styles.newsletter}>
              <input
                type="email"
                className={styles.emailInput}
                placeholder="Enter your email"
                aria-label="Email subscription"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button type="button" className={styles.subscribeBtn} onClick={handleSubscribe}>Subscribe</button>
              {message && <p className={styles.description}>{message}</p>}
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            &copy; 2026 DripTea. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
