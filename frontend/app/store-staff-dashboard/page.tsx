'use client';

import StaffHeader from '../components/StaffHeader';
import styles from './page.module.css';
import { useEffect, useState } from 'react';
// done by "HDC" - staff order queue is backed by real MongoDB orders.
import { getOrders, updateOrderStatus, type DripTeaOrder } from '../utils/dripteaApi';
// end done by "HDC"

// done by "HDC" - local display shape for the staff order queue table.
type StaffOrderRow = {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
  total: string;
  itemSummary: string;
};

const fallbackOrders: StaffOrderRow[] = [
  { id: 'mock-1', orderNo: 'ORD-1001', customer: 'Alice', status: 'preparing', total: '$8.50', itemSummary: 'Sample order' },
  { id: 'mock-2', orderNo: 'ORD-1002', customer: 'Bob', status: 'ready', total: '$5.00', itemSummary: 'Sample order' },
];

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toStaffOrderRow(order: DripTeaOrder): StaffOrderRow {
  const itemSummary = order.items
    .map(item => `${item.quantity} x ${item.name}`)
    .join(', ');

  return {
    id: order.id,
    orderNo: order.orderNo,
    customer: order.customer,
    status: order.status,
    total: `S$ ${Number(order.totalAmount || 0).toFixed(2)}`,
    itemSummary: itemSummary || 'No items recorded',
  };
}
// end done by "HDC"

export default function StoreStaffDashboardPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [searchQuery, setSearchQuery] = useState('');

  // done by "HDC" - keep sample rows only as a fallback when backend orders cannot be loaded.
  const [orders, setOrders] = useState<StaffOrderRow[]>(fallbackOrders);
  const [ordersError, setOrdersError] = useState('');
  // end done by "HDC"

  const [inventory, setInventory] = useState([
    { id: 1, name: 'Oolong Tea', qty: 12, unit: 'bags' },
    { id: 2, name: 'Tapioca Pearls', qty: 6, unit: 'kg' },
  ]);

  // done by "HDC" - poll backend orders so customer fake payments appear in the staff queue.
  async function refreshOrders() {
    try {
      const response = await getOrders('all');
      setOrders(response.data.map(toStaffOrderRow));
      setOrdersError('');
    } catch (error) {
      console.error('[DripTea staff orders]', error);
      setOrdersError('Unable to load live orders. Showing fallback rows.');
    }
  }

  useEffect(() => {
    void refreshOrders();
    const refreshTimer = window.setInterval(() => {
      void refreshOrders();
    }, 5000);

    return () => window.clearInterval(refreshTimer);
  }, []);
  // end done by "HDC"

  const filteredOrders = orders.filter(o =>
    o.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.itemSummary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // done by "HDC" - mark real MongoDB orders complete from the staff queue.
  const markOrderCompleted = async (id: string) => {
    if (id.startsWith('mock-')) {
      setOrders(orders.map(o => (o.id === id ? { ...o, status: 'completed' } : o)));
      return;
    }

    try {
      await updateOrderStatus(id, 'completed');
      setOrders(orders.map(o => (o.id === id ? { ...o, status: 'completed' } : o)));
      void refreshOrders();
    } catch (error) {
      console.error('[DripTea complete order]', error);
      setOrdersError('Unable to update this order. Please try again.');
    }
  };
  // end done by "HDC"

  const adjustQty = (id: number, delta: number) => {
    setInventory(inventory.map(it => (it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it)));
  };

  return (
    <div className={styles.page}>
      <StaffHeader />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Staff dashboard</p>
            <h1>Store Staff Control Panel</h1>
            <p>Process orders, manage stock, and view shift-related information.</p>
          </div>
          <div className={styles.heroPanel}>
            <div>
              <span>Open Orders</span>
              <strong>{orders.filter(o => o.status.toLowerCase() !== 'completed').length}</strong>
            </div>
            <div>
              <span>Inventory Items</span>
              <strong>{inventory.length}</strong>
            </div>
            <div>
              <span>Alerts</span>
              <strong>{inventory.filter(i => i.qty <= 5).length}</strong>
            </div>
          </div>
        </section>

        <section className={styles.tabsSection}>
          <div className={styles.tabsNav}>
            <button
              className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'inventory' ? styles.active : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              Inventory
            </button>
          </div>

          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder={activeTab === 'orders' ? 'Search orders or customer...' : 'Search inventory...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </section>

        {activeTab === 'orders' && (
          <section className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Order Queue</h2>
            </div>
            {/* done by "HDC" - show live-order load/update issues without hiding the queue. */}
            {ordersError && <p className={styles.sessionSubtext}>{ordersError}</p>}
            {/* end done by "HDC" */}

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map(ord => (
                      <tr key={ord.id}>
                        <td>{ord.orderNo}</td>
                        <td>
                          <strong>{ord.customer}</strong>
                          <br />
                          <span className={styles.sessionSubtext}>{ord.itemSummary}</span>
                        </td>
                        <td><span className={`${styles.status} ${styles[ord.status.toLowerCase()]}`}>{formatStatus(ord.status)}</span></td>
                        <td>{ord.total}</td>
                        <td className={styles.actions}>
                          <button
                            className={styles.btnSmall}
                            onClick={() => void markOrderCompleted(ord.id)}
                            disabled={ord.status.toLowerCase() === 'completed'}
                          >
                            Complete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.noResults}>No orders found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'inventory' && (
          <section className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Inventory Management</h2>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.qty}</td>
                        <td>{item.unit}</td>
                        <td className={styles.actions}>
                          <button className={styles.btnSmall} onClick={() => adjustQty(item.id, -1)}>-</button>
                          <button className={styles.btnSmall} onClick={() => adjustQty(item.id, 1)}>+</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className={styles.noResults}>No inventory items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className={styles.sessionSection}>
          <h2>Staff Tools</h2>
          <p className={styles.sessionSubtext}>Stories covered: 33-38 (order processing, inventory, shift info)</p>
        </section>
      </main>
    </div>
  );
}
