import React from 'react';

export default function DrinkSidebar() {
  return (
    <aside style={{
      width: 280,
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      padding: 22,
      margin: '32px auto',
      border: '1.5px solid #e0e0e0',
      fontSize: 15,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>DRIPTEA_LOGO</div>
        <span style={{ marginLeft: 'auto', fontSize: 20, opacity: 0.7 }}>☰</span>
      </div>
      <div style={{ width: '100%', height: 120, background: '#e0e7ef', borderRadius: 14, marginBottom: 14 }} />
      <div style={{ fontWeight: 600, marginBottom: 2 }}>Drink name</div>
      <div style={{ color: '#3a8dde', fontWeight: 500, marginBottom: 6 }}>£4.50</div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>⭐⭐⭐⭐☆</div>
      <div style={{ color: '#444', marginBottom: 10, fontSize: 14 }}>
        Amazing, our newest lineup of fruit drips! Refreshing, sweet, and healthy.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <input type="number" min={1} defaultValue={1} style={{ width: 38, borderRadius: 6, border: '1.5px solid #b3e0ff', padding: '4px 6px' }} />
        <button style={{ background: '#3a8dde', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
      </div>
      <div style={{ fontWeight: 700, margin: '18px 0 8px 0', fontSize: 15 }}>NUTRITIONAL INFO</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: '1 1 40%', background: '#f7faff', borderRadius: 10, padding: 10, textAlign: 'center', fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>380kcal</div>
          <div style={{ color: '#3a8dde' }}>Energy</div>
        </div>
        <div style={{ flex: '1 1 40%', background: '#f7faff', borderRadius: 10, padding: 10, textAlign: 'center', fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>12g</div>
          <div style={{ color: '#3a8dde' }}>Fat</div>
        </div>
        <div style={{ flex: '1 1 40%', background: '#f7faff', borderRadius: 10, padding: 10, textAlign: 'center', fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>35g</div>
          <div style={{ color: '#3a8dde' }}>Sugars</div>
        </div>
        <div style={{ flex: '1 1 40%', background: '#f7faff', borderRadius: 10, padding: 10, textAlign: 'center', fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>120mg</div>
          <div style={{ color: '#3a8dde' }}>Caffeine</div>
        </div>
      </div>
    </aside>
  );
}
