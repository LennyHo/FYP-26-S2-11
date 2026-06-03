'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './register.module.css';
import BackgroundShapes from '../login/BackgroundShapes';
import { registerCustomer } from '../utils/dripteaApi';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setFormData(current => ({ ...current, [field]: value }));
  }

  async function handleRegister(event) {
    event.preventDefault();
    setStatusMessage('');
    setIsError(false);

    if (formData.password !== formData.confirmPassword) {
      setIsError(true);
      setStatusMessage('Passwords do not match.');
      return;
    }

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
      setIsError(true);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <BackgroundShapes />
      <div className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.brandMark}>
              <span className={styles.logoIcon} aria-hidden="true">
                <span className={styles.dropCore} />
                <span className={styles.dropMini} />
                <span className={styles.dropShine} />
                <span className={styles.rippleInner} />
                <span className={styles.rippleMid} />
                <span className={styles.rippleOuter} />
              </span>
              DRIPTEA
            </div>
            <span className={styles.brandTag}>Handcrafted tea bar</span>
          </div>
          <div className={styles.brandStory}>
            <p className={styles.brandLead}>Register for free and start exploring your next favorite drip.</p>
            <p className={styles.brandText}>Create your account to save preferences, access offers, and personalize your tea journey.</p>
          </div>
          <div className={styles.brandPills}>
            <span>Free account</span>
            <span>Order tracking</span>
            <span>Faster checkout</span>
          </div>
        </aside>

        <div className={styles.container}>
          <div className={styles.heading}>
            <span className={styles.kicker}>Welcome to DRIPTEA</span>
            <h1 className={styles.title}>Create your free account</h1>
            <p className={styles.subtitle}>Create your customer account, then sign in to start ordering.</p>
          </div>

          <form className={styles.form} autoComplete="off" onSubmit={handleRegister}>
            <div>
              <label htmlFor="fullName" className={styles.label}>Full name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                className={styles.input}
                placeholder="Your full name"
                value={formData.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className={styles.input}
                placeholder="username@gmail.com"
                value={formData.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={6}
                className={styles.input}
                placeholder="Create password"
                value={formData.password}
                onChange={(event) => updateField('password', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={6}
                className={styles.input}
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
              />
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
      </div>
    </div>
  );
}
