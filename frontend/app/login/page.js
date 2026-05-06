
"use client";

import { useState } from 'react';
import styles from './login.module.css';
import BackgroundShapes from './BackgroundShapes';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const autofillCredentials = (accountType) => {
    const demoAccounts = {
      admin: { email: 'admin@driptea.com', password: 'Admin@123' },
      staff: { email: 'staff@driptea.com', password: 'Staff@123' },
      customer: { email: 'customer@driptea.com', password: 'Customer@123' },
    };

    const selected = demoAccounts[accountType];
    if (selected) {
      setEmail(selected.email);
      setPassword(selected.password);
    }
  };

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
            <p className={styles.brandLead}>A calmer login experience for a brighter menu.</p>
            <p className={styles.brandText}>Layered tea, fruit-forward drips, and boba built to feel more premium than a standard sign-in page.</p>
          </div>
          <div className={styles.brandImageCard}>
            <img
              src="/driptea_background.png"
              alt="DripTea background visual"
              className={styles.brandBackgroundImage}
              onError={(event) => {
                event.currentTarget.src = '/driptea_drinks.jpg';
              }}
            />
          </div>
          <div className={styles.brandPills}>
            <span>Fast access</span>
            <span>Saved favorites</span>
            <span>Seasonal drops</span>
          </div>
        </aside>
        <div className={styles.container}>
          <div className={styles.heading}>
            <span className={styles.kicker}>Welcome back</span>
            <h1 className={styles.title}>Sign in to DripTea</h1>
            <p className={styles.subtitle}>Use your account to track orders, save favorites, and keep your usual blend close.</p>
          </div>
          <form className={styles.form} autoComplete="off">
            <div>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className={styles.input}
                placeholder="username@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className={styles.input}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className={styles.actionsRow}>
              <button type="button" className={styles.forgot}>Forgot password?</button>
            </div>
            <button type="submit" className={styles.button}>Sign in</button>
          </form>
          <div className={styles.divider}>or continue with</div>
          <div className={styles.socials}>
            <button className={styles.socialBtn} aria-label="Sign in with Google">G</button>
            <button className={styles.socialBtn} aria-label="Sign in with GitHub">B</button>
            <button className={styles.socialBtn} aria-label="Sign in with Microsoft">M</button>
          </div>
          <div className={styles.quickFillSection}>
            <p className={styles.quickFillLabel}>Quick fill demo accounts:</p>
            <div className={styles.quickFillButtons}>
              <button type="button" className={styles.quickFillBtn} onClick={() => autofillCredentials('admin')}>
                User Admin
              </button>
              <button type="button" className={styles.quickFillBtn} onClick={() => autofillCredentials('staff')}>
                Store Staff
              </button>
              <button type="button" className={styles.quickFillBtn} onClick={() => autofillCredentials('customer')}>
                Customer
              </button>
            </div>
          </div>
          <div className={styles.register}>
            Don&apos;t have an account?
            <a href="/register">Register for free</a>
          </div>
        </div>
      </div>
    </div>
  );
}
