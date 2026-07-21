'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { clearStoredUser, getStoredUser } from '../../utils/api.base';
import { useOutlets } from '../../utils/outlets';
import styles from './StaffHeader.module.css';

export default function StaffHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { outlets } = useOutlets();
  const [storeCode, setStoreCode] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function syncStore() {
      setStoreCode(getStoredUser()?.storeCode || null);
    }
    syncStore();
    window.addEventListener('authUpdated', syncStore);
    return () => window.removeEventListener('authUpdated', syncStore);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const storeName = outlets.find((outlet) => outlet.storeCode === storeCode)?.name || storeCode;

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
          />
          <span className={styles.brandText}>Store Staff</span>
        </div>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <Link
            href="/store-staff"
            className={`${styles.navLink} ${pathname.startsWith('/store-staff') && !pathname.startsWith('/store-staff-dashboard') && !pathname.startsWith('/store-staff-voucher') ? styles.active : ''}`}
          >
            Menu Management
          </Link>
          <Link
            href="/store-staff-dashboard"
            className={`${styles.navLink} ${pathname.startsWith('/store-staff-dashboard') ? styles.active : ''}`}
          >
            Orders Dashboard
          </Link>
          <Link
            href="/store-staff-voucher"
            className={`${styles.navLink} ${pathname.startsWith('/store-staff-voucher') ? styles.active : ''}`}
          >
            Vouchers
          </Link>
          <button type="button" className={`${styles.navLink} ${styles.navLogoutBtn}`} onClick={handleLogout}>
            Log Out
          </button>
        </nav>

        <div className={styles.actions}>
          {storeName && <span className={styles.storeBadge}>{storeName}</span>}
          <button
            className={`${styles.logoutBtn} ${styles.logoutBtnDesktop}`}
            onClick={handleLogout}
          >
            Log Out
          </button>
          <button
            type="button"
            className={`${styles.menuBtn} ${menuOpen ? styles.menuBtnOpen : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
              {menuOpen ? (
                <>
                  <path d="M2 2L18 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M18 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M0 1h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M0 8h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M0 15h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
