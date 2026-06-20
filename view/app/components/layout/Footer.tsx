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
            <p className={styles.copyright}>
            &copy; 2026 DripTea. All rights reserved.
          </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
