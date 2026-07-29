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
//
// #310-313 Manage Inventory (Store Staff) — moved to store-staff/page.tsx (Menu Management)
//
// #314  View Order Feedback (Store Staff)
//     View: store-staff-dashboard/page.tsx (this file) → Route: feedback.routes.js → Ctrl: feedback.controller.js → Model: feedback.model.js

'use client';

import StaffHeader from '../components/layout/StaffHeader';
import styles from './page.module.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrders,
  updateOrderStatus,
  type DripTeaOrder,
  getOrderFeedbacks,
  type DripTeaFeedback,
} from '../utils/staffApi';
import { isSessionExpiredError, clearStoredUser } from '../utils/api.base';

type StaffTab = 'orders' | 'completed';

type StaffOrderRow = {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
  total: string;
  totalAmount: number;
  itemSummary: string;
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

export default function StoreStaffDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StaffTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<StaffOrderRow[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Feedback state
  const [orderFeedbacks, setOrderFeedbacks] = useState<Record<string, DripTeaFeedback[]>>({});
  const [feedbackModalOrder, setFeedbackModalOrder] = useState<StaffOrderRow | null>(null);
  const loadedFeedbackIdsRef = useRef(new Set<string>());
  const pollTimerRef = useRef<number | undefined>(undefined);

  // Stops the auto-refresh poll and sends the staff member back to login instead of
  // retrying an expired/invalid session forever (which just spams console errors).
  function handleSessionExpired() {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    clearStoredUser();
    router.push('/login');
  }

  async function refreshOrders() {
    setIsRefreshing(true);
    try {
      const response = await getOrders('all');
      setOrders(response.data.map(toStaffOrderRow));
      setOrdersError('');
      setLastUpdated(new Date());
    } catch (error) {
      if (isSessionExpiredError(error)) {
        handleSessionExpired();
        return;
      }
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
      if (isSessionExpiredError(error)) {
        handleSessionExpired();
        return;
      }
      console.error('[Store staff orders auto-refresh]', error);
    }
  }

  useEffect(() => {
    void refreshOrders();
    pollTimerRef.current = window.setInterval(() => void silentRefreshOrders(), 3000);
    const timer = pollTimerRef.current;
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

  const openCount = queueOrders.length;
  const completedCount = completedOrders.length;
  const preparingCount = orders.filter(order => order.status.toLowerCase() === 'preparing').length;

  const searchPlaceholder = activeTab === 'completed'
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
          </div>

          <div className={styles.toolbarRight}>
            {lastUpdated && (
              <span className={styles.lastUpdated}>Updated {formatDate(lastUpdated.toISOString())}</span>
            )}
            <button type="button" className={styles.refreshBtn} onClick={() => void refreshOrders()} disabled={isRefreshing}>
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

      </main>

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
          </div>
        </div>
      )}
    </div>
  );
}
