import React from 'react';
import styles from './Profile.module.css';

export default function ProfilePage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Profile Settings</h1>
      <form className={styles.form}>
        <label className={styles.label} htmlFor="profilePic">Profile Picture</label>
        <input className={styles.input} id="profilePic" name="profilePic" type="file" accept="image/*" />
        <label className={styles.label} htmlFor="name">Name</label>
        <input className={styles.input} id="name" name="name" type="text" />
        <label className={styles.label} htmlFor="email">Email</label>
        <input className={styles.input} id="email" name="email" type="email" />
        <button className={styles.button} type="submit">Save Changes</button>
      </form>
    </main>
  );
}
