'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './AdminHeader.module.css';

export default function AdminHeader() {
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
          <span className={styles.brandText}>Admin Panel</span>
        </div>

        <div className={styles.actions}>
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
