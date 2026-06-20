// User Story Architecture Trace — store-staff/page.tsx
//
// #33  Create Menu Items
//      View: store-staff/page.tsx (this file) → Route: menu.routes.js → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #34  View Menu Items
//      View: store-staff/page.tsx (this file) → Route: menu.routes.js → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #35  Update Menu Items
//      View: store-staff/page.tsx (this file) → Route: menu.routes.js → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #36  Search Menu Items
//      View: store-staff/page.tsx (this file) → Route: menu.routes.js → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #37  Login (Store Staff)
//      View: login/page.tsx → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js
//
// #38  Logout (Store Staff)
//      View: store-staff/page.tsx (this file) — client-side: JWT cleared from localStorage
'use client';

import StaffHeader from '../components/layout/StaffHeader';
import styles from './page.module.css';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getMenuItems } from '../utils/customerApi';
import { updateMenuItemStatus, createMenuItem, type DripTeaMenuItem } from '../utils/adminApi';

export default function StoreStaffPage() {
  const [items, setItems] = useState<DripTeaMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: '', price: '', description: '', tags: '', status: 'active' });
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

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

  async function handleAddDrink(e: React.SyntheticEvent) {
    e.preventDefault();
    setAddError('');
    const price = parseFloat(addForm.price);
    if (!addForm.name.trim() || !addForm.category.trim() || isNaN(price) || price < 0) {
      setAddError('Name, category, and a valid price are required.');
      return;
    }
    setAdding(true);
    try {
      const res = await createMenuItem({
        name: addForm.name.trim(),
        category: addForm.category.trim(),
        price,
        description: addForm.description.trim(),
        tags: addForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: addForm.status,
      });
      setItems(prev => [...prev, res.data]);
      setShowAddModal(false);
      setAddForm({ name: '', category: '', price: '', description: '', tags: '', status: 'active' });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add drink.');
    } finally {
      setAdding(false);
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
            <div>
              <span className={styles.statLabel}>Total Items</span>
              <strong className={styles.statValue}>{items.length}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statLabel}>Active</span>
              <strong className={`${styles.statValue} ${styles.green}`}>{activeCount}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${inactiveCount > 0 ? styles.statAlert : ''}`}>
            <div>
              <span className={styles.statLabel}>Inactive</span>
              <strong className={`${styles.statValue} ${inactiveCount > 0 ? styles.orange : ''}`}>{inactiveCount}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statLabel}>Categories</span>
              <strong className={styles.statValue}>{categories.length - 1}</strong>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <button type="button" className={styles.addBtn} onClick={() => setShowAddModal(true)}>
            + Add Drink
          </button>
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
                            <div className={styles.itemImgPlaceholder} />
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

      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Drink</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddDrink} className={styles.modalForm}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Name <span className={styles.required}>*</span></label>
                <input className={styles.formInput} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Taro Milk Tea" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Category <span className={styles.required}>*</span></label>
                <input className={styles.formInput} value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Milk Tea" list="cat-list" />
                <datalist id="cat-list">
                  {Array.from(new Set(items.map(i => i.category))).sort().map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Price (S$) <span className={styles.required}>*</span></label>
                <input className={styles.formInput} type="number" min="0" step="0.01" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 5.90" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Description</label>
                <input className={styles.formInput} value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description (optional)" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Tags <span className={styles.formHint}>(comma-separated)</span></label>
                <input className={styles.formInput} value={addForm.tags} onChange={e => setAddForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. sweet, popular, vegan" />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Status</label>
                <select className={styles.formInput} title="Status" value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {addError && <p className={styles.formError}>{addError}</p>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={adding}>{adding ? 'Adding…' : 'Add Drink'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
