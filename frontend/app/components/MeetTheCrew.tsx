
"use client";

import React, { useState } from 'react';
import styles from './MeetTheCrew.module.css';

export default function MeetTheCrew() {
  const [connectState, setConnectState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [connectMessage, setConnectMessage] = useState('');

  async function connectMatchaCard() {
    setConnectState('loading');
    setConnectMessage('Connecting Matcha Drip to backend...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'I want Matcha Drip with 25% sugar',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.reply || `Request failed with status ${response.status}`);
      }

      const preview = (data?.reply || 'Connected successfully.').slice(0, 140);
      setConnectState('ok');
      setConnectMessage(`Connected. AI reply: ${preview}${preview.length === 140 ? '...' : ''}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect to backend';
      setConnectState('error');
      setConnectMessage(`Connection failed: ${message}`);
    }
  }

  return (
    <section className={styles.meetSection}>
      <div className={styles.meetHeader}>
        <div>
          <p className={styles.meetEyebrow}>Drip highlights</p>
          <h2 className={styles.meetTitle}>MEET THE CREW</h2>
        </div>
        <a className={styles.meetButton} href="/buy-driptea">VIEW ALL DRIPS</a>
      </div>
      <div className={styles.meetShowcase}>
        <button
          type="button"
          className={`${styles.featureCard} ${styles.featureCardLarge}`}
          onClick={connectMatchaCard}
          aria-label="Connect Matcha Cloud to backend"
          disabled={connectState === 'loading'}
        >
          <div className={styles.featureCopy}>
            <p className={styles.cardLabel}>New drop</p>
            <h3>Matcha Cloud</h3>
            <p>Soft cream top, fresh matcha, and a clean finish.</p>
          </div>
          <div className={`${styles.featureVisual} ${styles.matchaTone}`} />
        </button>

        <article className={`${styles.featureCard} ${styles.featureCardSmall} ${styles.brownTone}`}>
          <div className={styles.featureCopy}>
            <p className={styles.cardLabel}>New drop</p>
            <h3>Brown Sugar Drift</h3>
            <p>Caramel ribbons with a deeper roasted tea base.</p>
          </div>
          <div className={`${styles.featureVisual} ${styles.brownVisual}`} />
        </article>

        <article className={`${styles.featureCard} ${styles.featureCardSmall} ${styles.redTone}`}>
          <div className={styles.featureCopy}>
            <p className={styles.cardLabel}>New drop</p>
            <h3>Berry Rose Float</h3>
            <p>Strawberry brightness with a floral, chilled finish.</p>
          </div>
          <div className={`${styles.featureVisual} ${styles.redVisual}`} />
        </article>
      </div>
      <div
        className={`${styles.connectStatus} ${
          connectState === 'ok' ? styles.ok : connectState === 'error' ? styles.error : ''
        }`}
        role="status"
        aria-live="polite"
      >
        {connectState === 'idle'
          ? 'Tap Matcha Cloud to connect this showcase to the backend.'
          : connectMessage}
      </div>
    </section>
  );
}
