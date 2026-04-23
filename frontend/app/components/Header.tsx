import React from 'react';

export default function Header() {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 32px', borderBottom: '2px solid var(--border)', background: 'var(--background)', position: 'sticky', top: 0, zIndex: 10
    }}>
      <nav style={{ display: 'flex', gap: 28 }}>
        <a href="#" style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', fontSize: 16 }}>BUY DRIPTEA</a>
        <a href="#" style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', fontSize: 16 }}>OUR STORY</a>
        <a href="#" style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', fontSize: 16 }}>SUSTAINABILITY</a>
      </nav>
      <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: 2, fontFamily: 'Quicksand, Arial Rounded MT Bold, Arial, sans-serif' }}>DRIPTEA</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <a href="/login" style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: 600, fontSize: 16 }}>Log in</a>
        <a href="#" style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: 600, fontSize: 16 }}>Store Locator</a>
        <span style={{ fontSize: 22, opacity: 0.8, marginLeft: 8 }}>🛒</span>
      </div>
    </header>
  );
}
