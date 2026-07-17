'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { clearStoredUser, getStoredUser } from '../../utils/api.base';
import styles from './AdminHeader.module.css';

export default function AdminHeader() {
  const router = useRouter();
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    function syncAdmin() {
      setAdminName(getStoredUser()?.fullName || null);
    }
    syncAdmin();
    window.addEventListener('authUpdated', syncAdmin);
    return () => window.removeEventListener('authUpdated', syncAdmin);
  }, []);

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
          <span className={styles.brandText}>Admin Panel</span>
        </div>

        <div className={styles.actions}>
          {adminName && <span className={styles.storeBadge}>{adminName}</span>}
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
