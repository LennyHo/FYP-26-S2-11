'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './StaffHeader.module.css';

export default function StaffHeader() {
  const router = useRouter();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Image
            src="/main_logo.svg"
            alt="DripTea logo"
            width={48}
            height={27}
            className={styles.logoSvg}
            onClick={() => router.push('/')}
            style={{ cursor: 'pointer' }}
          />
        </div>

        <nav className={styles.nav}>
          <Link href="/store-staff" className={styles.navLink}>
            Menu Management
          </Link>
          {/* <Link href="/store-staff-dashboard" className={styles.navLink}>
            Dashboard
          </Link> */}
          {/* <Link href="/global-stores" className={styles.navLink}>Global Stores</Link> */}
        </nav>

        <div className={styles.actions}>
          {/* <Link href="/contact" className={styles.navLink}>CONTACT</Link> */}
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
