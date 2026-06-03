'use client';

import StaffHeader from '../components/StaffHeader';
import styles from './page.module.css';
import { useEffect, useState } from 'react';
import { getOrders, updateOrderStatus, type DripTeaOrder } from '../utils/dripteaApi';

type StaffOrderRow = {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
  total: string;
  itemSummary: string;
};

const fallbackOrders: StaffOrderRow[] = [
  { id: 'mock-1', orderNo: 'ORD-1001', customer: 'Alice', status: 'preparing', total: 'S$ 8.50', itemSummary: '1 x Da Hong Pao, 1 x Honey Lemon' },
  { id: 'mock-2', orderNo: 'ORD-1002', customer: 'Bob', status: 'ready', total: 'S$ 5.00', itemSummary: '1 x Matcha Latte' },
];

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
    itemSummary: order.items.map(i => `${i.quantity} x ${i.name}`).join(', ') || 'No items recorded',
  };
}

const STATUS_FLOW: Record<string, { next: string; label: string; cls: string }> = {
  pending:    { next: 'preparing', label: 'Start Preparing', cls: 'btnPrepare' },
  preparing:  { next: 'ready',     label: 'Mark Ready',      cls: 'btnReady'   },
  ready:      { next: 'completed', label: 'Complete',         cls: 'btnComplete'},
};

export default function StoreStaffDashboardPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<StaffOrderRow[]>(fallbackOrders);
  const [ordersError, setOrdersError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Oolong Tea',      qty: 12, unit: 'bags' },
    { id: 2, name: 'Tapioca Pearls',  qty: 4,  unit: 'kg'   },
    { id: 3, name: 'Aloe Vera',       qty: 8,  unit: 'pcs'  },
    { id: 4, name: 'Cheese Foam Mix', qty: 3,  unit: 'packs'},
    { id: 5, name: 'Honey Syrup',     qty: 7,  unit: 'btl'  },
  ]);

  async function refreshOrders() {
    try {
      const response = await getOrders('all');
      setOrders(response.data.map(toStaffOrderRow));
      setOrdersError('');
    } catch {
      setOrdersError('Unable to load live orders — showing sample data.');
    }
  }

  useEffect(() => {
    void refreshOrders();
    const t = window.setInterval(() => void refreshOrders(), 5000);
    return () => window.clearInterval(t);
  }, []);

  const advanceStatus = async (row: StaffOrderRow) => {
    const flow = STATUS_FLOW[row.status.toLowerCase()];
    if (!flow) return;
    setUpdatingId(row.id);
    try {
      if (!row.id.startsWith('mock-')) await updateOrderStatus(row.id, flow.next);
      setOrders(prev => prev.map(o => o.id === row.id ? { ...o, status: flow.next } : o));
    } catch {
      setOrdersError('Failed to update order. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const adjustQty = (id: number, delta: number) =>
    setInventory(prev => prev.map(it => it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it));

  const filteredOrders = orders.filter(o =>
    [o.orderNo, o.customer, o.itemSummary].some(v => v.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCount      = orders.filter(o => o.status !== 'completed').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const lowStockCount  = inventory.filter(i => i.qty <= 5).length;

  return (
    <div className={styles.page}>
      <StaffHeader />

      <main className={styles.main}>

        {/* Stats row */}
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
              <span className={styles.statLabel}>Inventory Items</span>
              <strong className={styles.statValue}>{inventory.length}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${lowStockCount > 0 ? styles.statAlert : ''}`}>
            <div>
              <span className={styles.statLabel}>Low Stock</span>
              <strong className={`${styles.statValue} ${lowStockCount > 0 ? styles.red : ''}`}>{lowStockCount}</strong>
            </div>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className={styles.tabsBar}>
          <div className={styles.tabsNav}>
            <button type="button" className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`} onClick={() => setActiveTab('orders')}>
              Order Queue
              {openCount > 0 && <span className={styles.badge}>{openCount}</span>}
            </button>
            <button type="button" className={`${styles.tab} ${activeTab === 'inventory' ? styles.active : ''}`} onClick={() => setActiveTab('inventory')}>
              Inventory
              {lowStockCount > 0 && <span className={`${styles.badge} ${styles.badgeRed}`}>{lowStockCount}</span>}
            </button>
          </div>

          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder={activeTab === 'orders' ? 'Search orders or customer…' : 'Search inventory…'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {ordersError && <p className={styles.errorBanner}>{ordersError}</p>}

        {/* Orders tab */}
        {activeTab === 'orders' && (
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
                  {filteredOrders.length > 0 ? filteredOrders.map(ord => {
                    const flow = STATUS_FLOW[ord.status.toLowerCase()];
                    return (
                      <tr key={ord.id} className={ord.status === 'completed' ? styles.rowDone : ''}>
                        <td className={styles.orderNo}>{ord.orderNo}</td>
                        <td>
                          <span className={styles.customerName}>{ord.customer}</span>
                          <span className={styles.itemSummary}>{ord.itemSummary}</span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[ord.status.toLowerCase()]}`}>
                            {formatStatus(ord.status)}
                          </span>
                        </td>
                        <td className={styles.total}>{ord.total}</td>
                        <td>
                          {flow ? (
                            <button
                              className={`${styles.actionBtn} ${styles[flow.cls]}`}
                              onClick={() => void advanceStatus(ord)}
                              disabled={updatingId === ord.id}
                            >
                              {updatingId === ord.id ? '…' : flow.label}
                            </button>
                          ) : (
                            <span className={styles.doneLabel}>✓ Done</span>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className={styles.empty}>No orders found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inventory tab */}
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
                          <button type="button" className={styles.qtyBtn} onClick={() => adjustQty(item.id, -1)} disabled={item.qty === 0}>−</button>
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
