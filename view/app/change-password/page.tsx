'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword } from '../utils/customerApi';
import { getStoredUser } from '../utils/api.base';
import styles from './ChangePassword.module.css';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage('New passwords do not match.');
      return;
    }

    const user = getStoredUser();
    if (!user) {
      setIsError(true);
      setMessage('You are not logged in.');
      return;
    }

    setIsSaving(true);
    try {
      await changePassword(user.id, currentPassword, newPassword);
      setMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setIsSaving(false);
    }
  }

  function EyeIcon({ open }: { open: boolean }) {
    return open ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
            <span className={styles.backBtnArrow}>‹</span>
            Back
          </button>
          <h1 className={styles.heading}>Change Password</h1>
          <div className={styles.headerSpacer} />
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="currentPassword">Current Password</label>
            <div className={styles.inputWrapper}>
              <input
                className={styles.input}
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                autoComplete="current-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowCurrent(v => !v)} aria-label={showCurrent ? 'Hide password' : 'Show password'}>
                <EyeIcon open={showCurrent} />
              </button>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="newPassword">New Password</label>
            <div className={styles.inputWrapper}>
              <input
                className={styles.input}
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(v => !v)} aria-label={showNew ? 'Hide password' : 'Show password'}>
                <EyeIcon open={showNew} />
              </button>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm New Password</label>
            <div className={styles.inputWrapper}>
              <input
                className={styles.input}
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>

          <button className={styles.saveBtn} type="submit" disabled={isSaving}>
            {isSaving ? 'Updating...' : 'Update Password'}
          </button>

          {message && (
            <div className={`${styles.statusMsg} ${isError ? styles.error : styles.success}`}>
              {isError ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {message}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
