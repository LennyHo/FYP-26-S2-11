'use client';

import React, { useState } from 'react';
import styles from './Contact.module.css';

export default function ContactPage() {
  const [status, setStatus] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    // Student note: this stores enquiries locally because there is no email backend yet.
    const enquiry = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      message: String(formData.get('message') || ''),
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(window.localStorage.getItem('dripTeaContactMessages') || '[]');
    window.localStorage.setItem('dripTeaContactMessages', JSON.stringify([...existing, enquiry]));

    form.reset();
    setStatus('Message saved. Our team will get back to you soon.');
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Contact Us</h1>
      <p className={styles.text}>We'd love to hear from you! Reach out for feedback, support, or partnership opportunities.</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="name">Name</label>
        <input className={styles.input} id="name" name="name" type="text" required />
        <label className={styles.label} htmlFor="email">Email</label>
        <input className={styles.input} id="email" name="email" type="email" required />
        <label className={styles.label} htmlFor="message">Message</label>
        <textarea className={styles.textarea} id="message" name="message" rows={5} required />
        <button className={styles.button} type="submit">Send Message</button>
        {status && <p className={styles.text}>{status}</p>}
      </form>
    </main>
  );
}
