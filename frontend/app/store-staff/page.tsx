'use client';

import StaffHeader from '../components/StaffHeader';
import styles from './page.module.css';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getMenuItems, updateMenuItemStatus, type DripTeaMenuItem } from '../utils/dripteaApi';

export default function StoreStaffPage() {
  const [items, setItems] = useState<DripTeaMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function fetchItems() {
    try {
      const res = await getMenuItems('all');
      setItems(res.data);
      setError('');
    } catch {
      setError('Could not load menu items from the database.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchItems(); }, []);

  async function toggleStatus(item: DripTeaMenuItem) {
    const next = item.status === 'active' ? 'inactive' : 'active';
    setTogglingId(item.mongoId);
    try {
      await updateMenuItemStatus(item.mongoId, next);
      setItems(prev => prev.map(i => i.mongoId === item.mongoId ? { ...i, status: next } : i));
    } catch {
      setError('Failed to update item status.');
    } finally {
      setTogglingId(null);
    }
  }

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category))).sort()];

  const filtered = items.filter(i => {
    const matchesCat = filterCat === 'all' || i.category === filterCat;
    const q = search.toLowerCase();
    const matchesSearch = !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || (i.tags || []).some(t => t.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const activeCount   = items.filter(i => i.status === 'active').length;
  const inactiveCount = items.filter(i => i.status === 'inactive').length;

  return (
    <div className={styles.page}>
      <StaffHeader />
      <main className={styles.main}>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🍵</span>
            <div>
              <span className={styles.statLabel}>Total Items</span>
              <strong className={styles.statValue}>{items.length}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>✅</span>
            <div>
              <span className={styles.statLabel}>Active</span>
              <strong className={`${styles.statValue} ${styles.green}`}>{activeCount}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${inactiveCount > 0 ? styles.statAlert : ''}`}>
            <span className={styles.statIcon}>⏸️</span>
            <div>
              <span className={styles.statLabel}>Inactive</span>
              <strong className={`${styles.statValue} ${inactiveCount > 0 ? styles.orange : ''}`}>{inactiveCount}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🗂️</span>
            <div>
              <span className={styles.statLabel}>Categories</span>
              <strong className={styles.statValue}>{categories.length - 1}</strong>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.catTabs}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`${styles.catTab} ${filterCat === cat ? styles.catTabActive : ''}`}
                onClick={() => setFilterCat(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, category, or tag…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}

        {/* Table */}
        <div className={styles.tableCard}>
          {loading ? (
            <p className={styles.empty}>Loading menu items…</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Tags</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? filtered.map(item => (
                    <tr key={item.mongoId} className={item.status === 'inactive' ? styles.rowInactive : ''}>
                      <td>
                        <div className={styles.itemCell}>
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={40}
                              height={40}
                              className={styles.itemImg}
                              unoptimized
                            />
                          ) : (
                            <div className={styles.itemImgPlaceholder}>🍵</div>
                          )}
                          <div>
                            <span className={styles.itemName}>{item.name}</span>
                            {item.description && (
                              <span className={styles.itemDesc}>{item.description}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><span className={styles.categoryBadge}>{item.category}</span></td>
                      <td>
                        <div className={styles.tagList}>
                          {(item.tags || []).slice(0, 3).map(tag => (
                            <span key={tag} className={styles.tag}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className={styles.price}>S$ {Number(item.price).toFixed(2)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${item.status === 'active' ? styles.active : styles.inactive}`}>
                          {item.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.toggleBtn} ${item.status === 'active' ? styles.toggleOff : styles.toggleOn}`}
                          onClick={() => void toggleStatus(item)}
                          disabled={togglingId === item.mongoId}
                        >
                          {togglingId === item.mongoId ? '…' : item.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className={styles.empty}>No items match your search</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
