'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { clearStoredUser } from '../../utils/api.base';
import styles from './AdminHeader.module.css';

export default function AdminHeader() {
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
          <span className={styles.brandText}>Admin Panel</span>
        </div>

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
