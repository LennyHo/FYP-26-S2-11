"use client";

import Header from '../components/layout/Header';
import Hero from '../components/pages/Hero';
import MeetTheCrew from '../components/pages/MeetTheCrew';
import AboutUs from '../components/pages/AboutUs';
import AvySection from '../components/pages/AvySection';
import styles from './page.module.css';

export default function Home() {
  return (
    <div>
      <Header />
      <main className={styles.main}>
        <Hero />
        <AboutUs />
        <AvySection />
        <MeetTheCrew />
      </main>
    </div>
  );
}
