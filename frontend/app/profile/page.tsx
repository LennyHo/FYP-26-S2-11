"use client";
import React, { useEffect, useState } from 'react';
import styles from './Profile.module.css';
import { getStoredUser } from '../utils/dripteaApi';

export default function ProfilePage() {
  const [profilePic, setProfilePic] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    setProfilePic(user?.profilePic || "/profile_empty.png");
    setName(user?.fullName || "");
    setEmail(user?.email || "");
  }, []);

  function handlePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setProfilePic(url);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Save to localStorage (and backend if needed)
    const user = getStoredUser();
    if (user) {
      const updated = { ...user, profilePic, fullName: name, email };
      window.localStorage.setItem('dripTeaCurrentUser', JSON.stringify(updated));
      window.dispatchEvent(new Event('profileUpdated'));
      window.dispatchEvent(new Event('authUpdated'));
      setStatus("Profile updated!");
      setTimeout(() => setStatus(""), 2000);
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Profile Settings</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.avatarPreview}>
          <label htmlFor="profilePic" style={{ cursor: 'pointer' }}>
            {profilePic && (
              <img src={profilePic} alt="Profile preview" className={styles.avatarImg} />
            )}
          </label>
        </div>
        <input className={styles.input} id="profilePic" name="profilePic" type="file" accept="image/*" onChange={handlePicChange} style={{ marginBottom: 0 }} />

        <label className={styles.label} htmlFor="name">Name</label>
        <input className={styles.input} id="name" name="name" type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="off" />

        <label className={styles.label} htmlFor="email">Email</label>
        <input className={styles.input} id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />

        <button className={styles.button} type="submit">Save Changes</button>
        {status && <div style={{ color: '#7b4b2a', textAlign: 'center', marginTop: '0.7rem', fontWeight: 600 }}>{status}</div>}
      </form>
    </main>
  );
}
