// User Story Architecture Trace — register/page.tsx
//
// #191 Create User Account (Customer)
//      View: register/page.tsx (this file) → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './register.module.css';
import { registerCustomer } from '../utils/customerApi';
import ProjectNotice from '../components/layout/ProjectNotice';
import {
  CUSTOMER_EMAIL_DOMAINS,
  PASSWORD_HINT,
  validateEmail,
  validatePassword,
} from '../utils/validation';

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

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<keyof FormData, string>>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  function updateField(field: keyof FormData, value: string) {
    setFormData(current => ({ ...current, [field]: value }));
    // Clears the error once the user starts typing again.
    setFieldErrors(current => (current[field] ? { ...current, [field]: '' } : current));
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('');
    setIsError(false);

    const errors: Record<keyof FormData, string> = {
      fullName: formData.fullName.trim() ? '' : 'Full name is required.',
      email: validateEmail(formData.email, CUSTOMER_EMAIL_DOMAINS),
      password: validatePassword(formData.password),
      confirmPassword: '',
    };

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setIsSubmitting(true);

    try {
      await registerCustomer({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      });
      setStatusMessage('Account created. Redirecting to login...');
      window.setTimeout(() => {
        router.push('/login');
      }, 700);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create account.';
      // Duplicate email is checked in the backend, so show it on the email field.
      if (/already exists/i.test(message)) {
        setFieldErrors(current => ({ ...current, email: message }));
      } else {
        setIsError(true);
        setStatusMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.container}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Create your free account</h1>
            <p className={styles.subtitle}>Create your customer account, then sign in to start ordering.</p>
          </div>

          <form className={styles.form} autoComplete="off" noValidate onSubmit={handleRegister}>
            <div>
              <label htmlFor="fullName" className={styles.label}>Full name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className={`${styles.input} ${fieldErrors.fullName ? styles.inputError : ''}`}
                placeholder="Your full name"
                value={formData.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                aria-invalid={Boolean(fieldErrors.fullName)}
              />
              {fieldErrors.fullName && <span className={styles.fieldError}>{fieldErrors.fullName}</span>}
            </div>
            <div>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                placeholder="username@gmail.com"
                value={formData.email}
                onChange={(event) => updateField('email', event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email
                ? <span className={styles.fieldError}>{fieldErrors.email}</span>
                : <span className={styles.fieldHint}>Accepted: {CUSTOMER_EMAIL_DOMAINS.map(d => `@${d}`).join(', ')}</span>}
            </div>
            <div>
              <label htmlFor="password" className={styles.label}>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {fieldErrors.password
                ? <span className={styles.fieldError}>{fieldErrors.password}</span>
                : <span className={styles.fieldHint}>{PASSWORD_HINT}</span>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {fieldErrors.confirmPassword && <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>}
            </div>
            <button type="submit" className={styles.button} disabled={isSubmitting}>
              {isSubmitting ? 'creating account...' : 'get started with DRIPTEA'}
            </button>
            {statusMessage && (
              <p role="alert" className={`${styles.statusMessage} ${isError ? styles.error : styles.success}`}>
                {statusMessage}
              </p>
            )}
          </form>

          <div className={styles.register}>
            Already have an account?
            <Link href="/login">Sign in</Link>
          </div>
        </div>

        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <img src="/main_logo.svg" alt="DripTea" className={styles.brandLogo} />
            <p className={styles.brandLead}>Everything you need for your perfect cup.</p>
          </div>

          <video
            src="/buy_driptea_1.mp4"
            autoPlay
            loop
            muted
            playsInline
            className={styles.brandVideo}
          />
          <div className={styles.videoOverlay} />

          <ul className={styles.featureList}>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </span>
              <div>
                <strong>Order from anywhere</strong>
                <p>Browse the full menu, customise your drink, and place orders directly from your phone or browser.</p>
              </div>
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </span>
              <div>
                <strong>Real-time order tracking</strong>
                <p>See exactly when your order is being prepared and when it's ready for pickup.</p>
              </div>
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </span>
              <div>
                <strong>Save your favourites</strong>
                <p>Your preferred size, ice level, sugar, and toppings are remembered so reordering takes one tap.</p>
              </div>
            </li>
            <li className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <div>
                <strong>Chat with Avy, our AI barista</strong>
                <p>Get personalised drink recommendations, ask about ingredients, or build a custom order in the chat.</p>
              </div>
            </li>
          </ul>
        </aside>
      </div>

      <footer className={styles.siteFoot}>
        <ProjectNotice standalone />
      </footer>
    </div>
  );
}
