"use client";

import Header from '../components/layout/Header';
import OurStory from '../components/pages/OurStory';
import styles from './our-story.module.css';

export default function OurStoryPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <OurStory />
      </main>
    </>
  );
}
