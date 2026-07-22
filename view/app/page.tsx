"use client";

import Header from './components/layout/Header';
import Hero from './components/pages/Hero';
import AboutUs from './components/pages/AboutUs';
import styles from './page.module.css';

export default function Home() {
  return (
    <div>
      <Header />
      <main className={styles.main}>
        <Hero />
        <AboutUs />
      </main>
    </div>
  );
}
