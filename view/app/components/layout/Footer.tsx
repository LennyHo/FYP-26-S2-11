"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
          <div className={`${styles.section} ${styles.brandSection}`}>
            <h3 className={styles.sectionTitle}>DripTea</h3>
            <p className={styles.description}>
              Freshly brewed. Brightly layered. Premium bubble tea crafted with passion.
            </p>
            <p className={styles.copyright}>
            &copy; 2026 DripTea. All rights reserved.
          </p>
          </div>

          <div className={styles.section}>
            <h4 className={styles.subtitle}>Tea Series</h4>
            <ul className={styles.links}>
              <li><Link href="/buy-driptea?category=milk-tea" className={styles.link}>Milk Tea</Link></li>
              <li><Link href="/buy-driptea?category=matcha-teas" className={styles.link}>Matcha Teas</Link></li>
              <li><Link href="/buy-driptea?category=ice-blended" className={styles.link}>Ice Blended</Link></li>
              <li><Link href="/buy-driptea?category=fruit-teas" className={styles.link}>Fruit Teas</Link></li>
            </ul>
          </div>

          <div className={styles.section}>
            <h4 className={styles.subtitle}>Quick Links</h4>
            <ul className={styles.links}>
              <li><Link href="/order-type" className={styles.link}>Buy DripTea</Link></li>
              <li><Link href="/our-story" className={styles.link}>Our Story</Link></li>
              <li><Link href="/global-stores" className={styles.link}>Stores</Link></li>
            </ul>
          </div>
        </div>
        <p className={styles.disclaimer}>
          <strong>Health &amp; Nutritional Disclaimer:</strong> The AI chatbot recommendations and nutritional information on this website are for general informational purposes only and do not constitute medical or dietary advice. Nutritional values are estimates and may vary. Individuals with medical conditions (including diabetes) should consult a qualified healthcare professional before making dietary decisions. Consume at your own risk. DripTea is not liable for any health consequences arising from reliance on this information.
        </p>
      </div>
    </footer>
  );
}
