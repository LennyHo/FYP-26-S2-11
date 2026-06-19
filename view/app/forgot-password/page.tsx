// User Story Architecture Trace — forgot-password/page.tsx
//
// #14  Reset Password
//      View: forgot-password/page.tsx (this file) → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkEmailExists, resetPassword } from '../utils/dripteaApi';
import styles from './ForgotPassword.module.css';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await checkEmailExists(email.trim());
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify email.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim(), newPassword);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsLoading(false);
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

        {/* Header */}
        <div className={styles.header}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => step === 'reset' ? setStep('email') : router.push('/login')}
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className={styles.heading}>Reset Password</h1>
          <div className={styles.headerSpacer} />
        </div>

        {/* Step indicators */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${step !== 'email' ? styles.stepDone : styles.stepActive}`}>
            <span className={styles.stepNum}>1</span>
            <span className={styles.stepLabel}>Verify email</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step === 'done' ? styles.stepDone : step === 'reset' ? styles.stepActive : styles.stepIdle}`}>
            <span className={styles.stepNum}>2</span>
            <span className={styles.stepLabel}>New password</span>
          </div>
        </div>

        {/* Step 1 — Email */}
        {step === 'email' && (
          <form className={styles.form} onSubmit={handleEmailSubmit}>
            <p className={styles.hint}>Enter the email address linked to your account.</p>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="email">Email Address</label>
              <input
                className={styles.input}
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.submitBtn} type="submit" disabled={isLoading}>
              {isLoading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2 — New password */}
        {step === 'reset' && (
          <form className={styles.form} onSubmit={handleReset}>
            <p className={styles.hint}>
              Setting a new password for <strong>{email}</strong>.
            </p>
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
                  autoFocus
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(v => !v)} aria-label={showNew ? 'Hide' : 'Show'}>
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
                <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide' : 'Show'}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.submitBtn} type="submit" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className={styles.doneState}>
            <div className={styles.doneIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className={styles.doneTitle}>Password Reset!</h2>
            <p className={styles.doneText}>Your password has been updated. You can now sign in with your new password.</p>
            <button className={styles.submitBtn} type="button" onClick={() => router.push('/login')}>
              Go to Sign In
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
