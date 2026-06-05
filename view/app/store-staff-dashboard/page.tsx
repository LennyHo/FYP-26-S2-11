'use client';

import StaffHeader from '../components/StaffHeader';
import styles from './page.module.css';
import { useEffect, useMemo, useState } from 'react';
import { getOrders, updateOrderStatus, type DripTeaOrder } from '../utils/dripteaApi';

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

export default function StoreStaffDashboardPage() {
  const [activeTab, setActiveTab] = useState<StaffTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<StaffOrderRow[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Oolong Tea', qty: 12, unit: 'bags' },
    { id: 2, name: 'Tapioca Pearls', qty: 4, unit: 'kg' },
    { id: 3, name: 'Aloe Vera', qty: 8, unit: 'pcs' },
    { id: 4, name: 'Cheese Foam Mix', qty: 3, unit: 'packs' },
    { id: 5, name: 'Honey Syrup', qty: 7, unit: 'btl' },
  ]);

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

  useEffect(() => {
    void refreshOrders();
    const timer = window.setInterval(() => void refreshOrders(), 3000);
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

  const adjustQty = (id: number, delta: number) =>
    setInventory(prev => prev.map(item => (
      item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
    )));

  const queueOrders = useMemo(
    () => orders.filter(order => QUEUE_STATUSES.has(order.status.toLowerCase())),
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter(order => order.status.toLowerCase() === 'completed'),
    [orders]
  );

  const visibleOrders = activeTab === 'completed' ? completedOrders : queueOrders;

  const filteredOrders = visibleOrders.filter(order => matchesOrderSearch(order, searchQuery));
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const openCount = queueOrders.length;
  const completedCount = completedOrders.length;
  const preparingCount = orders.filter(order => order.status.toLowerCase() === 'preparing').length;
  const lowStockCount = inventory.filter(item => item.qty <= 5).length;

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

        {(ordersError || lastUpdated) && (
          <div className={ordersError ? styles.errorBanner : styles.syncBanner}>
            {ordersError || `Live orders refreshed ${lastUpdated?.toLocaleTimeString()}`}
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
                      <td colSpan={5} className={styles.empty}>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length > 0 ? filteredInventory.map(item => (
                    <tr key={item.id} className={item.qty <= 5 ? styles.rowLowStock : ''}>
                      <td>
                        <span className={styles.itemName}>{item.name}</span>
                        {item.qty <= 5 && <span className={styles.lowBadge}>Low stock</span>}
                      </td>
                      <td className={`${styles.qtyCell} ${item.qty <= 5 ? styles.qtyLow : ''}`}>{item.qty}</td>
                      <td className={styles.unitCell}>{item.unit}</td>
                      <td>
                        <div className={styles.qtyControls}>
                          <button type="button" className={styles.qtyBtn} onClick={() => adjustQty(item.id, -1)} disabled={item.qty === 0}>-</button>
                          <button type="button" className={`${styles.qtyBtn} ${styles.qtyBtnAdd}`} onClick={() => adjustQty(item.id, 1)}>+</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className={styles.empty}>No items found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
