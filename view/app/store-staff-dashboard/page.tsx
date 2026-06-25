// User Story Architecture Trace — store-staff-dashboard/page.tsx
//
// #28  Track Order Status (Store Staff updates status; Customer tracks via order-status/page.tsx)
//      View: store-staff-dashboard/page.tsx (this file) → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js
//
// #37  Login (Store Staff)
//      View: login/page.tsx → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js
//
// #38  Logout (Store Staff)
//      View: store-staff-dashboard/page.tsx (this file) — client-side: JWT cleared from localStorage
'use client';

import StaffHeader from '../components/layout/StaffHeader';
import styles from './page.module.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getOrders,
  updateOrderStatus,
  type DripTeaOrder,
  getInventory,
  createInventoryItem,
  updateInventoryQty,
  deleteInventoryItem,
  type DripTeaInventoryItem,
  getOrderFeedbacks,
  type DripTeaFeedback,
} from '../utils/staffApi';

type StaffTab = 'orders' | 'completed' | 'inventory';

type StaffOrderRow = {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
  total: string;
  totalAmount: number;
  itemSummary: string;
};

type CreateInventoryForm = {
  name: string;
  quantity: string;
  unit: string;
  lowStockThreshold: string;
  description: string;
};

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toStaffOrderRow(order: DripTeaOrder): StaffOrderRow {
  return {
    id: order.id,
    orderNo: order.orderNo,
    customer: order.customer,
    status: order.status,
    total: `S$ ${Number(order.totalAmount || 0).toFixed(2)}`,
    totalAmount: Number(order.totalAmount || 0),
    itemSummary: order.items.map(i => `${i.quantity} x ${i.name}`).join(', ') || 'No items recorded',
  };
}

const STATUS_FLOW: Record<string, { next: string; label: string; cls: string }> = {
  pending: { next: 'preparing', label: 'Start Preparing', cls: 'btnPrepare' },
  preparing: { next: 'ready', label: 'Mark Ready', cls: 'btnReady' },
  ready: { next: 'completed', label: 'Complete', cls: 'btnComplete' },
};

const QUEUE_STATUSES = new Set(['pending', 'preparing', 'ready']);

function matchesOrderSearch(order: StaffOrderRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [order.orderNo, order.customer, order.itemSummary, order.status]
    .some(value => value.toLowerCase().includes(normalizedQuery));
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function renderStars(rating: number) {
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

const EMPTY_FORM: CreateInventoryForm = {
  name: '',
  quantity: '0',
  unit: '',
  lowStockThreshold: '5',
  description: '',
};

export default function StoreStaffDashboardPage() {
  const [activeTab, setActiveTab] = useState<StaffTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<StaffOrderRow[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Inventory state
  const [inventory, setInventory] = useState<DripTeaInventoryItem[]>([]);
  const [inventoryError, setInventoryError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DripTeaInventoryItem | null>(null);
  const [createForm, setCreateForm] = useState<CreateInventoryForm>(EMPTY_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Feedback state
  const [orderFeedbacks, setOrderFeedbacks] = useState<Record<string, DripTeaFeedback[]>>({});
  const [feedbackModalOrder, setFeedbackModalOrder] = useState<StaffOrderRow | null>(null);
  const loadedFeedbackIdsRef = useRef(new Set<string>());

  async function loadInventory() {
    try {
      const response = await getInventory();
      setInventory(response.data);
      setInventoryError('');
    } catch (error) {
      console.error('[Store staff inventory]', error);
      setInventoryError('Unable to load inventory from the backend.');
    }
  }

  async function refreshOrders() {
    setIsRefreshing(true);
    try {
      const response = await getOrders('all');
      setOrders(response.data.map(toStaffOrderRow));
      setOrdersError('');
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[Store staff orders]', error);
      setOrdersError('Unable to load live orders from the backend.');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function silentRefreshOrders() {
    try {
      const response = await getOrders('all');
      setOrders(response.data.map(toStaffOrderRow));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[Store staff orders auto-refresh]', error);
    }
  }

  useEffect(() => {
    void refreshOrders();
    void loadInventory();
    const timer = window.setInterval(() => void silentRefreshOrders(), 3000);
    return () => window.clearInterval(timer);
  }, []);

  const advanceStatus = async (row: StaffOrderRow) => {
    const flow = STATUS_FLOW[row.status.toLowerCase()];
    if (!flow) return;

    setUpdatingId(row.id);

    try {
      await updateOrderStatus(row.id, flow.next);
      setOrders(prev => prev.map(order => (
        order.id === row.id ? { ...order, status: flow.next } : order
      )));
      void refreshOrders();
    } catch (error) {
      console.error('[Store staff order status]', error);
      setOrdersError('Failed to update order. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const adjustQty = async (item: DripTeaInventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    setInventory(prev => prev.map(i => i._id === item._id ? { ...i, quantity: newQty } : i));
    try {
      await updateInventoryQty(item._id, newQty);
    } catch (error) {
      console.error('[Store staff inventory adjust]', error);
      setInventory(prev => prev.map(i => i._id === item._id ? { ...i, quantity: item.quantity } : i));
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setInventoryError('');
    try {
      await deleteInventoryItem(id);
      setInventory(prev => prev.filter(i => i._id !== id));
      if (selectedItem?._id === id) setSelectedItem(null);
    } catch (error) {
      console.error('[Store staff inventory delete]', error);
      setInventoryError('Failed to delete inventory item.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateSubmit = async () => {
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
      const response = await createInventoryItem({ name, quantity, unit, lowStockThreshold, description });
      setInventory(prev => [...prev, response.data]);
      setShowCreateModal(false);
      setCreateForm(EMPTY_FORM);
    } catch (error) {
      console.error('[Store staff inventory create]', error);
      setInventoryError('Failed to create inventory item.');
    } finally {
      setIsCreating(false);
    }
  };

  const queueOrders = useMemo(
    () => orders.filter(order => QUEUE_STATUSES.has(order.status.toLowerCase())),
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter(order => order.status.toLowerCase() === 'completed'),
    [orders]
  );

  async function loadOrderFeedbacks(ids: string[]) {
    try {
      const response = await getOrderFeedbacks(ids);
      setOrderFeedbacks(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('[Store staff feedback]', error);
    }
  }

  useEffect(() => {
    const newIds = completedOrders
      .map(o => o.id)
      .filter(id => !loadedFeedbackIdsRef.current.has(id));
    if (!newIds.length) return;
    newIds.forEach(id => loadedFeedbackIdsRef.current.add(id));
    void loadOrderFeedbacks(newIds);
  }, [completedOrders]);

  const visibleOrders = activeTab === 'completed' ? completedOrders : queueOrders;

  const filteredOrders = visibleOrders.filter(order => matchesOrderSearch(order, searchQuery));
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const openCount = queueOrders.length;
  const completedCount = completedOrders.length;
  const preparingCount = orders.filter(order => order.status.toLowerCase() === 'preparing').length;
  const lowStockCount = inventory.filter(item => item.quantity <= item.lowStockThreshold).length;

  const searchPlaceholder = activeTab === 'inventory'
    ? 'Search inventory...'
    : activeTab === 'completed'
      ? 'Search completed orders...'
      : 'Search orders or customer...';

  return (
    <div className={styles.page}>
      <StaffHeader />

      <main className={styles.main}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statLabel}>Open Orders</span>
              <strong className={styles.statValue}>{openCount}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statLabel}>Preparing</span>
              <strong className={`${styles.statValue} ${styles.orange}`}>{preparingCount}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statLabel}>Completed</span>
              <strong className={styles.statValue}>{completedCount}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${lowStockCount > 0 ? styles.statAlert : ''}`}>
            <div>
              <span className={styles.statLabel}>Low Stock</span>
              <strong className={`${styles.statValue} ${lowStockCount > 0 ? styles.red : ''}`}>{lowStockCount}</strong>
            </div>
          </div>
        </div>

        <div className={styles.tabsBar}>
          <div className={styles.tabsNav}>
            <button type="button" className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`} onClick={() => setActiveTab('orders')}>
              Order Queue
              {openCount > 0 && <span className={styles.badge}>{openCount}</span>}
            </button>
            <button type="button" className={`${styles.tab} ${activeTab === 'completed' ? styles.active : ''}`} onClick={() => setActiveTab('completed')}>
              Completed Orders
              {completedCount > 0 && <span className={styles.badge}>{completedCount}</span>}
            </button>
            <button type="button" className={`${styles.tab} ${activeTab === 'inventory' ? styles.active : ''}`} onClick={() => setActiveTab('inventory')}>
              Inventory
              {lowStockCount > 0 && <span className={`${styles.badge} ${styles.badgeRed}`}>{lowStockCount}</span>}
            </button>
          </div>

          <div className={styles.toolbarRight}>
            {activeTab === 'inventory' && (
              <button type="button" className={styles.btnCreate} onClick={() => { setInventoryError(''); setShowCreateModal(true); }}>
                + New Item
              </button>
            )}
            <button type="button" className={styles.refreshBtn} onClick={() => { void refreshOrders(); if (activeTab === 'inventory') void loadInventory(); }} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        </div>

        {ordersError && (
          <div className={styles.errorBanner}>
            {ordersError}
          </div>
        )}

        {inventoryError && activeTab === 'inventory' && (
          <div className={styles.errorBanner}>
            {inventoryError}
          </div>
        )}

        {(activeTab === 'orders' || activeTab === 'completed') && (
          <div className={styles.tableCard}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    {activeTab === 'completed' && <th>Feedback</th>}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? filteredOrders.map(order => {
                    const flow = STATUS_FLOW[order.status.toLowerCase()];
                    const isCompleted = order.status.toLowerCase() === 'completed';

                    return (
                      <tr key={order.id} className={isCompleted ? styles.rowDone : ''}>
                        <td className={styles.orderNo}>{order.orderNo}</td>
                        <td>
                          <span className={styles.customerName}>{order.customer}</span>
                          <span className={styles.itemSummary}>{order.itemSummary}</span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[order.status.toLowerCase()]}`}>
                            {formatStatus(order.status)}
                          </span>
                        </td>
                        <td className={styles.total}>{order.total}</td>
                        {activeTab === 'completed' && (
                          <td>
                            {(orderFeedbacks[order.id] ?? []).length > 0 ? (
                              <button
                                type="button"
                                className={styles.feedbackBtn}
                                onClick={() => setFeedbackModalOrder(order)}
                              >
                                ★ {(orderFeedbacks[order.id] ?? []).length}
                              </button>
                            ) : (
                              <span className={styles.feedbackNone}>—</span>
                            )}
                          </td>
                        )}
                        <td>
                          {flow && activeTab === 'orders' ? (
                            <button
                              className={`${styles.actionBtn} ${styles[flow.cls]}`}
                              onClick={() => void advanceStatus(order)}
                              disabled={updatingId === order.id}
                            >
                              {updatingId === order.id ? 'Updating...' : flow.label}
                            </button>
                          ) : (
                            <span className={styles.doneLabel}>{isCompleted ? 'Completed' : '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={activeTab === 'completed' ? 6 : 5} className={styles.empty}>
                        {activeTab === 'completed' ? 'No completed orders found' : 'No active orders found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
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
                          onClick={() => void handleDelete(item._id)}
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
        )}
      </main>

      {/* Create Inventory Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New Inventory Item</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. Oolong Tea"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.formInput}
                    value={createForm.quantity}
                    onChange={e => setCreateForm(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Unit *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. bags, kg, pcs"
                    value={createForm.unit}
                    onChange={e => setCreateForm(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Low Stock Threshold</label>
                <input
                  type="number"
                  min="0"
                  className={styles.formInput}
                  value={createForm.lowStockThreshold}
                  onChange={e => setCreateForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Optional notes"
                  value={createForm.description}
                  onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="button" className={styles.btnSubmit} onClick={() => void handleCreateSubmit()} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Detail Modal */}
      {feedbackModalOrder && (
        <div className={styles.modalOverlay} onClick={() => setFeedbackModalOrder(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Feedback — Order {feedbackModalOrder.orderNo}</h2>
              <button type="button" className={styles.modalClose} onClick={() => setFeedbackModalOrder(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {(orderFeedbacks[feedbackModalOrder.id] ?? []).length === 0 ? (
                <p className={styles.feedbackEmpty}>No feedback for this order yet.</p>
              ) : (
                <div className={styles.feedbackList}>
                  {(orderFeedbacks[feedbackModalOrder.id] ?? []).map(fb => (
                    <div key={fb._id} className={styles.feedbackItem}>
                      <div className={styles.feedbackItemHeader}>
                        <span className={styles.feedbackDrink}>{fb.drinkName}</span>
                        <span className={styles.feedbackStars}>{renderStars(fb.rating)} {fb.rating}/5</span>
                      </div>
                      {fb.comment && <p className={styles.feedbackComment}>"{fb.comment}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setFeedbackModalOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Detail Modal */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedItem.name}</h2>
              <button type="button" className={styles.modalClose} onClick={() => setSelectedItem(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Stock</span>
                  <span className={`${styles.detailValue} ${selectedItem.quantity <= selectedItem.lowStockThreshold ? styles.qtyLow : ''}`}>
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
              <button type="button" className={styles.btnCancel} onClick={() => setSelectedItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
