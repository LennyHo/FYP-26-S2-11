"use client";

import Header from './components/Header';
import Hero from './components/Hero';
import MeetTheCrew from './components/MeetTheCrew';
import styles from './page.module.css';

export default function Home() {
  return (
    <div>
      <Header />
      <main className={styles.main}>
        <Hero />
        <MeetTheCrew />
      </main>
    </div>
  );
}