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
//
// #310 Create Inventory Item (Store Staff)
//      View: store-staff/page.tsx (this file) → Route: inventory.routes.js → Ctrl: inventory.controller.js → Model: inventory.model.js
//
// #311  View Inventory (Store Staff)
//      View: store-staff/page.tsx (this file) → Route: inventory.routes.js → Ctrl: inventory.controller.js → Model: inventory.model.js
//
// #312  Update Inventory (Store Staff)
//      View: store-staff/page.tsx (this file) → Route: inventory.routes.js → Ctrl: inventory.controller.js → Model: inventory.model.js
//
// #313  Delete Inventory Item (Store Staff)
//     View: store-staff/page.tsx (this file) → Route: inventory.routes.js → Ctrl: inventory.controller.js → Model: inventory.model.js
'use client';

import StaffHeader from '../components/layout/StaffHeader';
import styles from './page.module.css';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getMenuItems } from '../utils/customerApi';
import {
  updateMenuItemStatus,
  toggleMenuItemNewArrival,
  createMenuItem,
  updateMenuItem,
  type DripTeaMenuItem,
  getInventory,
  createInventoryItem,
  updateInventoryQty,
  deleteInventoryItem,
  type DripTeaInventoryItem,
} from '../utils/staffApi';

type StaffSection = 'menu' | 'inventory';

type CreateInventoryForm = {
  name: string;
  quantity: string;
  unit: string;
  lowStockThreshold: string;
  description: string;
};

const EMPTY_INVENTORY_FORM: CreateInventoryForm = {
  name: '',
  quantity: '0',
  unit: '',
  lowStockThreshold: '5',
  description: '',
};

export default function StoreStaffPage() {
  const [items, setItems] = useState<DripTeaMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingNewArrivalId, setTogglingNewArrivalId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: '', price: '', description: '', ingredients: '', calories: '', sugar: '', nutriGrade: 'B', tags: '', status: 'active', image: '' });
  const [addError, setAddError] = useState('');
  const [nameError, setNameError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<DripTeaMenuItem | null>(null);

  // Inventory
  const [activeSection, setActiveSection] = useState<StaffSection>('menu');
  const [inventory, setInventory] = useState<DripTeaInventoryItem[]>([]);
  const [inventoryError, setInventoryError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DripTeaInventoryItem | null>(null);
  const [createForm, setCreateForm] = useState<CreateInventoryForm>(EMPTY_INVENTORY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setAddForm(f => ({ ...f, name: value }));
    const normalized = value.trim().toLowerCase();
    if (!normalized) { setNameError(''); return; }
    const duplicate = items.some(i => i.name.trim().toLowerCase() === normalized && i.mongoId !== editingMenuItem?.mongoId);
    setNameError(duplicate ? `A drink named "${value.trim()}" already exists.` : '');
  }

  function closeAddModal() {
    setShowAddModal(false);
    setAddError('');
    setNameError('');
    setEditingMenuItem(null);
  }

  function openEditModal(item: DripTeaMenuItem) {
    setEditingMenuItem(item);
    setAddForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description || '',
      ingredients: (item.drinkInfo?.ingredients || []).join(', '),
      calories: item.base_calories != null ? String(item.base_calories) : '',
      sugar: item.base_sugar_g != null ? String(item.base_sugar_g) : '',
      nutriGrade: item.nutri_grade || 'B',
      tags: (item.tags || []).join(', '),
      status: item.status,
      image: item.image || '',
    });
    setAddError('');
    setNameError('');
    setShowAddModal(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAddForm(f => ({ ...f, image: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }

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

  async function loadInventory() {
    try {
      const res = await getInventory();
      setInventory(res.data);
      setInventoryError('');
    } catch (err) {
      console.error('[Store staff inventory]', err);
      setInventoryError('Unable to load inventory from the backend.');
    }
  }

  useEffect(() => { void fetchItems(); void loadInventory(); }, []);

  const adjustQty = async (item: DripTeaInventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    setInventory(prev => prev.map(i => i._id === item._id ? { ...i, quantity: newQty } : i));
    try {
      await updateInventoryQty(item._id, newQty);
    } catch (err) {
      console.error('[Store staff inventory adjust]', err);
      setInventory(prev => prev.map(i => i._id === item._id ? { ...i, quantity: item.quantity } : i));
    }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    setDeletingId(id);
    setInventoryError('');
    try {
      await deleteInventoryItem(id);
      setInventory(prev => prev.filter(i => i._id !== id));
      if (selectedItem?._id === id) setSelectedItem(null);
    } catch (err) {
      console.error('[Store staff inventory delete]', err);
      setInventoryError('Failed to delete inventory item.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateInventorySubmit = async () => {
    const name = createForm.name.trim();
    const unit = createForm.unit.trim();
    const quantity = Number(createForm.quantity);
    const lowStockThreshold = Number(createForm.lowStockThreshold);
    const description = createForm.description.trim();

    if (!name || !unit) {
      setInventoryError('Name and unit are required.');
      return;
    }

    setIsCreating(true);
    setInventoryError('');
    try {
      const res = await createInventoryItem({ name, quantity, unit, lowStockThreshold, description });
      setInventory(prev => [...prev, res.data]);
      setShowCreateModal(false);
      setCreateForm(EMPTY_INVENTORY_FORM);
    } catch (err) {
      console.error('[Store staff inventory create]', err);
      setInventoryError('Failed to create inventory item.');
    } finally {
      setIsCreating(false);
    }
  };

  async function toggleNewArrival(item: DripTeaMenuItem) {
    setTogglingNewArrivalId(item.mongoId);
    try {
      const res = await toggleMenuItemNewArrival(item.mongoId);
      setItems(prev => prev.map(i => i.mongoId === item.mongoId ? { ...i, isNewArrival: res.data.isNewArrival } : i));
    } catch {
      setError('Failed to update new arrival flag.');
    } finally {
      setTogglingNewArrivalId(null);
    }
  }

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
    if (nameError) return;
    const price = parseFloat(addForm.price);
    if (!addForm.name.trim() || !addForm.category.trim() || isNaN(price) || price < 0) {
      setAddError('Name, category, and a valid price are required.');
      return;
    }
    setAdding(true);
    try {
      const payload = {
        name: addForm.name.trim(),
        category: addForm.category.trim(),
        price,
        description: addForm.description.trim(),
        ingredients: addForm.ingredients.split(',').map(t => t.trim()).filter(Boolean),
        calories: addForm.calories ? parseFloat(addForm.calories) : undefined,
        sugar: addForm.sugar ? parseFloat(addForm.sugar) : undefined,
        nutriGrade: addForm.nutriGrade || 'B',
        tags: addForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        image: addForm.image,
      };

      if (editingMenuItem) {
        const res = await updateMenuItem(editingMenuItem.mongoId, payload);
        setItems(prev => prev.map(i => i.mongoId === editingMenuItem.mongoId ? res.data : i));
      } else {
        const res = await createMenuItem({ ...payload, status: addForm.status });
        setItems(prev => [...prev, res.data]);
      }
      setShowAddModal(false);
      setNameError('');
      setEditingMenuItem(null);
      setAddForm({ name: '', category: '', price: '', description: '', ingredients: '', calories: '', sugar: '', nutriGrade: 'B', tags: '', status: 'active', image: '' });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : `Failed to ${editingMenuItem ? 'update' : 'add'} drink.`);
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

  const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(search.trim().toLowerCase()));
  const lowStockCount = inventory.filter(i => i.quantity <= i.lowStockThreshold).length;

  return (
    <div className={styles.page}>
      <StaffHeader />
      <main className={styles.main}>

        {/* Section tabs */}
        <div className={styles.sectionTabsBar}>
          <button
            type="button"
            className={`${styles.sectionTab} ${activeSection === 'menu' ? styles.sectionTabActive : ''}`}
            onClick={() => setActiveSection('menu')}
          >
            Menu Items
          </button>
          <button
            type="button"
            className={`${styles.sectionTab} ${activeSection === 'inventory' ? styles.sectionTabActive : ''}`}
            onClick={() => setActiveSection('inventory')}
          >
            Inventory
            {lowStockCount > 0 && <span className={`${styles.sectionBadge} ${styles.sectionBadgeRed}`}>{lowStockCount}</span>}
          </button>
        </div>

        {activeSection === 'menu' && (
        <>
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
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => {
              setEditingMenuItem(null);
              setAddForm({ name: '', category: '', price: '', description: '', ingredients: '', calories: '', sugar: '', nutriGrade: 'B', tags: '', status: 'active', image: '' });
              setAddError('');
              setNameError('');
              setShowAddModal(true);
            }}
          >
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
                    <th>New Arrival</th>
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
                            <button type="button" className={styles.itemNameLink} onClick={() => openEditModal(item)}>
                              {item.name}
                            </button>
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
                          className={`${styles.toggleBtn} ${item.isNewArrival ? styles.toggleOff : styles.toggleOn}`}
                          onClick={() => void toggleNewArrival(item)}
                          disabled={togglingNewArrivalId === item.mongoId}
                        >
                          {togglingNewArrivalId === item.mongoId ? '…' : item.isNewArrival ? 'Remove' : 'Mark New'}
                        </button>
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
                    <tr><td colSpan={7} className={styles.empty}>No items match your search</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}

        {activeSection === 'inventory' && (
        <>
        {/* Inventory toolbar */}
        <div className={styles.toolbar}>
          <button type="button" className={styles.addBtn} onClick={() => { setInventoryError(''); setShowCreateModal(true); }}>
            + New Item
          </button>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {inventoryError && <p className={styles.errorBanner}>{inventoryError}</p>}

        <div className={styles.tableCard}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Stock</th>
                  <th>Unit</th>
                  <th>Adjust</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length > 0 ? filteredInventory.map(item => (
                  <tr key={item._id} className={item.quantity <= item.lowStockThreshold ? styles.rowLowStock : ''}>
                    <td>
                      <button
                        type="button"
                        className={styles.itemNameLink}
                        onClick={() => setSelectedItem(item)}
                      >
                        {item.name}
                      </button>
                      {item.quantity <= item.lowStockThreshold && <span className={styles.lowBadge}>Low stock</span>}
                    </td>
                    <td className={`${styles.qtyCell} ${item.quantity <= item.lowStockThreshold ? styles.qtyLow : ''}`}>{item.quantity}</td>
                    <td className={styles.unitCell}>{item.unit}</td>
                    <td>
                      <div className={styles.qtyControls}>
                        <button type="button" className={styles.qtyBtn} onClick={() => void adjustQty(item, -1)} disabled={item.quantity === 0}>-</button>
                        <button type="button" className={`${styles.qtyBtn} ${styles.qtyBtnAdd}`} onClick={() => void adjustQty(item, 1)}>+</button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.btnDelete}
                        onClick={() => void handleDeleteInventoryItem(item._id)}
                        disabled={deletingId === item._id}
                      >
                        {deletingId === item._id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className={styles.empty}>No items found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

      </main>

      {showAddModal && (
        <div className={styles.modalOverlay} onClick={closeAddModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editingMenuItem ? 'Edit Drink' : 'Add New Drink'}</h2>
              <button type="button" className={styles.modalClose} onClick={closeAddModal} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleAddDrink}>
              <div className={styles.modalBody}>

                {/* Image upload */}
                <div className={styles.imageUploadRow}>
                  <label htmlFor="drinkImage" className={styles.imageUploadZone}>
                    {addForm.image
                      ? <img src={addForm.image} alt="Preview" className={styles.imagePreview} />
                      : (
                        <div className={styles.imageUploadPlaceholder}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span>Upload photo</span>
                        </div>
                      )
                    }
                    {addForm.image && (
                      <div className={styles.imageOverlay}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                        Change
                      </div>
                    )}
                  </label>
                  <input id="drinkImage" type="file" accept="image/*" className={styles.fileInputHidden} onChange={handleImageChange} />
                  <div className={styles.imageUploadMeta}>
                    <p className={styles.imageUploadTitle}>Drink Photo</p>
                    <p className={styles.imageUploadHint}>Shown on the menu and chatbot recommendations.</p>
                    {addForm.image && (
                      <button type="button" className={styles.imageClearBtn} onClick={() => setAddForm(f => ({ ...f, image: '' }))}>Remove photo</button>
                    )}
                  </div>
                </div>

                {/* Name + Category + Price */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Name <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.formInput} ${nameError ? styles.formInputError : ''}`}
                    value={addForm.name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="e.g. Taro Milk Tea"
                  />
                  {nameError && <p className={styles.fieldError}>{nameError}</p>}
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Category <span className={styles.required}>*</span></label>
                    <input className={styles.formInput} value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Milk Tea" list="cat-list" />
                    <datalist id="cat-list">
                      {Array.from(new Set(items.map(i => i.category))).sort().map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Price (S$) <span className={styles.required}>*</span></label>
                    <input className={styles.formInput} type="number" min="0" step="0.01" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} placeholder="5.90" />
                  </div>
                </div>

                {/* Description + Ingredients */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Description</label>
                  <input className={styles.formInput} value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Smooth taro blended with milk and ice" />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Ingredients <span className={styles.formHint}>(comma-separated)</span></label>
                  <input className={styles.formInput} value={addForm.ingredients} onChange={e => setAddForm(f => ({ ...f, ingredients: e.target.value }))} placeholder="e.g. taro, milk, ice, sugar syrup" />
                </div>

                {/* Nutrition row */}
                <div className={styles.formRow3}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Calories (kcal)</label>
                    <input className={styles.formInput} type="number" min="0" step="1" value={addForm.calories} onChange={e => setAddForm(f => ({ ...f, calories: e.target.value }))} placeholder="180" />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Sugar (g)</label>
                    <input className={styles.formInput} type="number" min="0" step="0.1" value={addForm.sugar} onChange={e => setAddForm(f => ({ ...f, sugar: e.target.value }))} placeholder="24" />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Nutri-Grade</label>
                    <div className={styles.gradeChips}>
                      {(['A', 'B', 'C', 'D'] as const).map(g => (
                        <button key={g} type="button"
                          className={`${styles.gradeChip} ${addForm.nutriGrade === g ? styles.gradeChipActive : ''} ${styles[`grade${g}`]}`}
                          onClick={() => setAddForm(f => ({ ...f, nutriGrade: g }))}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tags + Status */}
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Tags <span className={styles.formHint}>(comma-separated)</span></label>
                    <input className={styles.formInput} value={addForm.tags} onChange={e => setAddForm(f => ({ ...f, tags: e.target.value }))} placeholder="sweet, popular, vegan" />
                  </div>
                  {!editingMenuItem && (
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Status</label>
                      <select className={styles.formInput} title="Status" value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>

                {addError && <p className={styles.formError}>{addError}</p>}
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeAddModal}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={adding || Boolean(nameError)}>
                  {adding ? (editingMenuItem ? 'Saving…' : 'Adding…') : (editingMenuItem ? 'Save Changes' : 'Add Drink')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New Inventory Item</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowCreateModal(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Name <span className={styles.required}>*</span></label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. Oolong Tea"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Quantity <span className={styles.required}>*</span></label>
                  <input
                    type="number"
                    min="0"
                    className={styles.formInput}
                    value={createForm.quantity}
                    onChange={e => setCreateForm(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Unit <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. bags, kg, pcs"
                    value={createForm.unit}
                    onChange={e => setCreateForm(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Low Stock Threshold</label>
                <input
                  type="number"
                  min="0"
                  className={styles.formInput}
                  value={createForm.lowStockThreshold}
                  onChange={e => setCreateForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Description</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Optional notes"
                  value={createForm.description}
                  onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              {inventoryError && <p className={styles.formError}>{inventoryError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="button" className={styles.saveBtn} onClick={() => void handleCreateInventorySubmit()} disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedItem.name}</h2>
              <button type="button" className={styles.modalClose} onClick={() => setSelectedItem(null)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Stock</span>
                  <span className={styles.detailValue}>
                    {selectedItem.quantity} {selectedItem.unit}
                    {selectedItem.quantity <= selectedItem.lowStockThreshold && (
                      <span className={styles.lowBadge} style={{ marginLeft: 8 }}>Low stock</span>
                    )}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Unit</span>
                  <span className={styles.detailValue}>{selectedItem.unit}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Low Stock Alert</span>
                  <span className={styles.detailValue}>≤ {selectedItem.lowStockThreshold} {selectedItem.unit}</span>
                </div>
                {selectedItem.description && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Description</span>
                    <span className={styles.detailValue}>{selectedItem.description}</span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setSelectedItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
