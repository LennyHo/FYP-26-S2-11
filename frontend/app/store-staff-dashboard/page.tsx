 'use client';

import StaffHeader from '../components/StaffHeader';
import styles from './page.module.css';
import { useState } from 'react';

export default function StoreStaffDashboardPage() {
  const [activeTab, setActiveTab] = useState('orders');
  const [searchQuery, setSearchQuery] = useState('');

  const [orders, setOrders] = useState([
    { id: 1, orderNo: 'ORD-1001', customer: 'Alice', status: 'Preparing', total: '$8.50' },
    { id: 2, orderNo: 'ORD-1002', customer: 'Bob', status: 'Ready', total: '$5.00' },
  ]);

  const [inventory, setInventory] = useState([
    { id: 1, name: 'Oolong Tea', qty: 12, unit: 'bags' },
    { id: 2, name: 'Tapioca Pearls', qty: 6, unit: 'kg' },
  ]);

  const filteredOrders = orders.filter(o =>
    o.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const markOrderCompleted = (id) => {
    setOrders(orders.map(o => (o.id === id ? { ...o, status: 'Completed' } : o)));
  };

  const adjustQty = (id, delta) => {
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
              <strong>{orders.filter(o => o.status !== 'Completed').length}</strong>
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
                        <td>{ord.customer}</td>
                        <td><span className={`${styles.status} ${styles[ord.status.toLowerCase()]}`}>{ord.status}</span></td>
                        <td>{ord.total}</td>
                        <td className={styles.actions}>
                          <button className={styles.btnSmall} onClick={() => markOrderCompleted(ord.id)}>Complete</button>
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
