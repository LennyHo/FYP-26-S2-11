"use client";

import Header from './components/Header';
import Hero from './components/Hero';
import MeetTheCrew from './components/MeetTheCrew';
import AboutUs from './components/AboutUs';
import AvySection from './components/AvySection';
// import FAQ from './components/FAQ';
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
        {/* <FAQ /> */}
      </main>
    </div>
  );
}