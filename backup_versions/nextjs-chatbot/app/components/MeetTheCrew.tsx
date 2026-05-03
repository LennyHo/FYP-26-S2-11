
"use client";

import React, { useState } from 'react';
import DrinkCard from './DrinkCard';
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
          <p className={styles.meetEyebrow}>Menu highlights</p>
          <h2 className={styles.meetTitle}>MEET THE CREW</h2>
        </div>
        <button className={styles.meetButton}>VIEW ALL DRIPS</button>
      </div>
      <div className={styles.meetCards}>
        <button
          type="button"
          className={styles.cardTrigger}
          onClick={connectMatchaCard}
          aria-label="Connect Matcha Drip to backend"
          disabled={connectState === 'loading'}
        >
          <DrinkCard name="Matcha Drip" price="£4.50" active accent="green" />
        </button>
        <DrinkCard name="Brown Sugar Boba" price="£4.50" accent="brown" />
        <DrinkCard name="Strawberry Drip" price="£5.00" accent="red" />
      </div>
      <p
        className={`${styles.connectStatus} ${
          connectState === 'ok' ? styles.ok : connectState === 'error' ? styles.error : ''
        }`}
        role="status"
        aria-live="polite"
      >
        {connectState === 'idle'
          ? 'Click the Matcha Drip card to connect this webpage to the backend.'
          : connectMessage}
      </p>
    </section>
  );
}
