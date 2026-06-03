import React from 'react';
import styles from './Contact.module.css';

export default function ContactPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Contact Us</h1>
      <p className={styles.text}>We'd love to hear from you! Reach out for feedback, support, or partnership opportunities.</p>
      <form className={styles.form}>
        <label className={styles.label} htmlFor="name">Name</label>
        <input className={styles.input} id="name" name="name" type="text" required />
        <label className={styles.label} htmlFor="email">Email</label>
        <input className={styles.input} id="email" name="email" type="email" required />
        <label className={styles.label} htmlFor="message">Message</label>
        <textarea className={styles.textarea} id="message" name="message" rows={5} required />
        <button className={styles.button} type="submit">Send Message</button>
      </form>
    </main>
  );
}
