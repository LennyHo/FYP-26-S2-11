// User Story Architecture Trace — login/LoginPage.tsx
// Rendered at both "/" (landing page) and "/login" — see page.tsx in each directory.
//
// #11  Login (User Admin)
//      View: login/LoginPage.tsx (this file) → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js
//
// #22  Login (Customer)
//      View: login/LoginPage.tsx (this file) → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js
//
// #37  Login (Store Staff)
//      View: login/LoginPage.tsx (this file) → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js
'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import styles from './login.module.css';
import { useRouter } from 'next/navigation';
import { syncStoredCartFromBackend, loginCustomer } from '../utils/customerApi';
import { LOGIN_EMAIL_DOMAINS, validateEmail } from '../utils/validation';

export default function LoginPage() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const testCredentials = {
    admin: { email: 'yiyuanzhuan@driptea.com', password: 'Admin@123' },
    staff: { email: 'williamsbilly@driptea.com', password: 'Staff@123' },
    customer: { email: 'customer@gmail.com', password: 'Customer@123' },
  };

  const fillTestCredentials = (role: 'admin' | 'staff' | 'customer') => {
    const creds = testCredentials[role];
    if (emailRef.current && passwordRef.current) {
      emailRef.current.value = creds.email;
      passwordRef.current.value = creds.password;
    }
  };

  const validateForm = () => {
    const email = emailRef.current?.value.trim() || '';
    const password = passwordRef.current?.value || '';
    const newErrors = { email: '', password: '' };

    // Allows @driptea.com here because staff and admin log in on this page.
    // No password rule on login, older accounts may not match the new rule.
    newErrors.email = validateEmail(email, LOGIN_EMAIL_DOMAINS);

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const clearFieldError = (field: 'email' | 'password') => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = await loginCustomer({
        email: emailRef.current?.value.trim() || '',
        password: passwordRef.current?.value || '',
      });

      if (payload.user?.id && payload.user.role === 'customer') {
        try {
          // Hydrate the local cart-badge mirror from the backend cart (source of truth).
          await syncStoredCartFromBackend(payload.user.id);
        } catch (error) {
          console.warn('[DripTea login cart sync]', error);
          localStorage.removeItem('dripTeaCartData');
        }
      } else {
        localStorage.removeItem('dripTeaCartData');
      }
      window.dispatchEvent(new Event('cartUpdated'));

      if (payload.user.role === 'user_admin') {
        router.push('/user-admin-dashboard');
      } else if (payload.user.role === 'store_staff') {
        router.push('/store-staff');
      } else {
        router.push('/home');
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card}>
          <div className={styles.copyPanel}>
            <div className={styles.brandTop}>
              <h1 className={styles.title}>Your next sip is waiting.</h1>
            </div>

            <div className={styles.heroCopy}>
              <p className={styles.subtitle}>
                Sign in to keep your tea orders, favorites, and usual blends close.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleLogin}>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  ref={emailRef}
                  type="email"
                  id="email"
                  name="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  autoComplete="username"
                  placeholder="username@gmail.com"
                  onChange={() => clearFieldError('email')}
                />
                {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
              </div>

              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    autoComplete="current-password"
                    placeholder="Password"
                    onChange={() => clearFieldError('password')}
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
              </div>

              <div className={styles.actionsRow}>
                <button type="button" className={styles.forgot} onClick={() => router.push('/forgot-password')}>Forgot password?</button>
              </div>

              <button type="submit" className={styles.button} disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
              {statusMessage && (
                <p role="alert" className={styles.fieldError} style={{ margin: 0 }}>
                  {statusMessage}
                </p>
              )}
            </form>

            <div className={styles.footerRow}>
              <span>Don&apos;t have an account?</span>
              <Link href="/register" className={styles.registerLink}>Register for free</Link>
            </div>

          </div>

          <div className={styles.visualPanel}>
            <div className={styles.visualFrame}>
              <div className={styles.visualGlow} />
              <div className={styles.visualImageWrap}>
                <img
                  src="/buy_dripTea_cover.png"
                  alt="DripTea drinks"
                  className={styles.visualImage}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
