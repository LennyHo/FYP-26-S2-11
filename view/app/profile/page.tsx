// #246 - As a customer, I want to update my user profile so that my information remains accurate.
// Frontend: Loads profile form pre-filled from localStorage → on save calls PATCH /api/users/:id
// → user.controller.js → User.updateUser() → updates fullName, email, profilePic fields in users collection.
"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Profile.module.css';
import { getStoredUser, storeUser, updateUser } from '../utils/dripteaApi';

export default function ProfilePage() {
  const router = useRouter();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = getStoredUser();
    if (user) {
      try {
        const response = await updateUser(user.id, { profilePic, fullName: name, email });
        storeUser(response.data);
        window.dispatchEvent(new Event('profileUpdated'));
        setStatus("Profile updated!");
        setTimeout(() => setStatus(""), 2500);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Profile update failed.");
      }
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Profile Settings</h1>

        {/* Avatar */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            <img
              src={profilePic || "/profile_empty.png"}
              alt="Profile"
              className={styles.avatarImg}
            />
            <label htmlFor="profilePic" className={styles.avatarEditBtn} aria-label="Change profile picture">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </label>
            <input id="profilePic" name="profilePic" type="file" accept="image/*" onChange={handlePicChange} className={styles.fileInput} />
          </div>
          <p className={styles.avatarHint}>Tap to change your profile photo</p>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="name">Full Name</label>
            <input
              className={styles.input}
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="off"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="off"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordRow}>
              <span className={styles.passwordDots}>••••••••</span>
              <button
                type="button"
                className={styles.changePasswordBtn}
                onClick={() => router.push('/change-password')}
              >
                Change Password
              </button>
            </div>
          </div>

          <button className={styles.saveBtn} type="submit">Save Changes</button>

          {status && (
            <div className={styles.successMsg}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {status}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
