
import React from 'react';
import DrinkCard from './DrinkCard';
import styles from './MeetTheCrew.module.css';

export default function MeetTheCrew() {
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
        <DrinkCard name="Matcha Drip" price="£4.50" active accent="green" />
        <DrinkCard name="Brown Sugar Boba" price="£4.50" accent="brown" />
        <DrinkCard name="Strawberry Drip" price="£5.00" accent="red" />
      </div>
    </section>
  );
}
