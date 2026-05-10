"use client";

import Header from './components/Header';
import Hero from './components/Hero';
import MeetTheCrew from './components/MeetTheCrew';
import AboutUs from './components/AboutUs';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import styles from './page.module.css';

export default function Home() {
  return (
    <div>
      <Header />
      <main className={styles.main}>
        <Hero />
        <AboutUs />
        <MeetTheCrew />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}