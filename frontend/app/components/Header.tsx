"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const isStaffDashboard = pathname.startsWith('/user-admin') || pathname.startsWith('/store-staff');

  // Read the AI's saved cart data from localStorage
  const updateCartDisplay = () => {
    const savedData = localStorage.getItem("dripTeaCartData");
    if (savedData) {
      const drinks = savedData.split('\n').filter(line => line.trim() !== '');
      let total = 0;
      
      drinks.forEach(drink => {
        const parts = drink.split('|');
        if (parts.length >= 3) {
          const price = parseFloat(parts[2].replace(/[^0-9.]/g, ''));
          if (!isNaN(price)) total += price;
        }
      });
      
      setCartCount(drinks.length);
      setCartTotal(total);
    } else {
      setCartCount(0);
      setCartTotal(0);
    }
  };

  // Listen for the custom "cartUpdated" event triggered by the AI
  useEffect(() => {
    updateCartDisplay(); 
    window.addEventListener('cartUpdated', updateCartDisplay);
    return () => window.removeEventListener('cartUpdated', updateCartDisplay);
  }, []);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <a href="/buy-driptea">BUY DRIPTEA</a>
        <a href="/our-story">OUR STORY</a>
      </nav>
      
      {/* Make the brand clickable to return to the home page */}
      <div 
        className={styles.brand} 
        onClick={() => router.push('/')}
      >
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
        {isStaffDashboard ? (
          <button className={styles.loginLink} onClick={() => router.push('/login')}>
            Log out
          </button>
        ) : (
          <a href="/login" className={styles.loginLink}>Log in</a>
        )}
        
        {/* Upgraded Cart to be a clickable button with dynamic data */}
        <button 
          className={styles.cartButton}
          onClick={() => router.push('/cart')}
        >
          <span className={styles.cart}>🛒</span>
          {cartCount > 0 && (
            <span className={styles.cartSummary}>
              {cartCount} Items (S$ {cartTotal.toFixed(2)})
            </span>
          )}
        </button>
      </div>
    </header>
  );
}