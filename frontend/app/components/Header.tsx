import React from 'react';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <a href="#">BUY DRIPTEA</a>
        <a href="#">OUR STORY</a>
        <a href="#">SUSTAINABILITY</a>
      </nav>
      <div className={styles.brand}>
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
      <div className={styles.actions}>
        <a href="/login" className={styles.loginLink}>Log in</a>
        <a href="#">Store Locator</a>
        <span className={styles.cart}>🛒</span>
      </div>
    </header>
  );
}
