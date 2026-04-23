import React from 'react';

export default function DrinkCard({ name, price, active, accent }: { name: string, price: string, active?: boolean, accent?: 'green' | 'brown' | 'red' }) {
  let accentColor = '#b77b57';
  let accentBg = '#fff9f3';
  if (accent === 'green') { accentColor = '#7bb661'; accentBg = '#e6f7e4'; }
  if (accent === 'red') { accentColor = '#e94f37'; accentBg = '#fbe4e4'; }
  if (accent === 'brown') { accentColor = '#b77b57'; accentBg = '#fff9f3'; }
  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: 18,
      boxShadow: active ? `0 0 0 3px ${accentColor}` : '0 1.5px 8px rgba(0,0,0,0.04)',
      padding: 20,
      minWidth: 130,
      textAlign: 'center',
      position: 'relative',
      border: active ? `2.5px solid ${accentColor}` : '2px solid var(--border)',
      transition: 'box-shadow 0.2s, border 0.2s',
      marginBottom: 8,
    }}>
      <div style={{ width: 64, height: 84, background: accentBg, borderRadius: 12, margin: '0 auto 10px auto', border: `2.5px solid ${accentColor}` }} />
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--foreground)', fontSize: 16 }}>{name}</div>
      <div style={{ color: accentColor, fontWeight: 600, marginBottom: 6 }}>{price}</div>
      <div style={{ fontSize: 14, color: '#b77b57', marginBottom: 6 }}>⭐⭐⭐⭐☆</div>
      {active && <div style={{ position: 'absolute', top: 10, right: 10, background: '#e94f37', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, boxShadow: '0 1px 4px #e5d6c2' }}>EXPLORE</div>}
    </div>
  );
}
