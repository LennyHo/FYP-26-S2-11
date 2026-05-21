'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './AdminHeader.module.css';

const logoSvg = `
<svg width="708" height="400" viewBox="0 0 708 400" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M381.468 131.207C410.669 105.311 363.677 70.7046 360.624 10.8213C360.526 8.89642 358.018 8.0941 356.888 9.65518C323.14 56.2615 317.166 81.4181 317.942 104.288C318.744 127.944 343.754 164.652 381.468 131.207Z" fill="url(#paint0_linear_33_1157)"/>
<path d="M520.823 300.14C524.52 283.689 525.507 252.192 523.426 228.74C522.432 217.528 514.408 208.521 503.678 205.119C348.832 156.017 227.458 196.919 209.991 210.882C191.884 225.356 200.937 239.83 200.937 278.428C200.937 317.026 243.186 374.923 285.435 389.397C327.684 403.871 378.987 401.459 427.271 389.397C475.556 377.335 509.506 350.488 520.823 300.14Z" fill="#FAF5CA"/>
<defs>
<linearGradient id="paint0_linear_33_1157" x1="354.434" y1="4.76819" x2="354.434" y2="144.635" gradientUnits="userSpaceOnUse">
<stop stop-color="#F7572B"/>
</linearGradient>
</defs>
</svg>
`;

export default function AdminHeader() {
  const router = useRouter();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div
            className={styles.logoSvg}
            dangerouslySetInnerHTML={{ __html: logoSvg }}
            onClick={() => router.push('/')}
          />
          <span className={styles.brandText}>Admin Panel</span>
        </div>

        <nav className={styles.nav}>
          <Link href="/user-admin-dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/user-admin" className={styles.navLink}>
            User Admin
          </Link>
          <Link href="/global-stores" className={styles.navLink}>
            Global Stores
          </Link>
        </nav>

        <div className={styles.actions}>
          <Link href="/contact" className={styles.navLink}>
            CONTACT
          </Link>
          <button 
            className={styles.logoutBtn}
            onClick={() => router.push('/login')}
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}
