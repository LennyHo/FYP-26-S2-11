'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { clearStoredUser } from '../../utils/api.base';
import styles from './StaffHeader.module.css';

export default function StaffHeader() {
  const router = useRouter();

  const handleLogout = () => {
    clearStoredUser();
    router.push('/login');
  };

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
          <Link href="/store-staff-dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/store-staff-voucher" className={styles.navLink}>
            Vouchers
          </Link>
        </nav>

        <div className={styles.actions}>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}
