// User Story Architecture Trace — store-staff-voucher/page.tsx
//
// View Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx (this file) → Route: voucher.routes.js → Ctrl: voucher.controller.js → Model: voucher.model.js
//
// Delete Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx (this file) → Route: voucher.routes.js → Ctrl: voucher.controller.js → Model: voucher.model.js
//
// Search Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx (this file) → Route: voucher.routes.js → Ctrl: voucher.controller.js → Model: voucher.model.js

'use client';

import StaffHeader from '../components/layout/StaffHeader';
import styles from './page.module.css';
import { useEffect, useState } from 'react';
import { getStaffVouchers, deleteVoucher, type DripTeaVoucher } from '../utils/staffApi';

type VoucherStatus = 'active' | 'inactive' | 'expired';

function getVoucherStatus(voucher: DripTeaVoucher): VoucherStatus {
  if (!voucher.isActive) return 'inactive';
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) return 'expired';
  return 'active';
}

function formatStatus(status: VoucherStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDiscount(voucher: DripTeaVoucher) {
  if (voucher.discountType === 'percentage') {
    const cap = voucher.maxDiscount != null ? ` (up to S$${Number(voucher.maxDiscount).toFixed(2)})` : '';
    return `${voucher.discountValue}% off${cap}`;
  }
  return `S$ ${Number(voucher.discountValue).toFixed(2)} off`;
}

function formatMinSpend(voucher: DripTeaVoucher) {
  const minSpend = Number(voucher.minSpend || 0);
  return minSpend > 0 ? `Min S$ ${minSpend.toFixed(2)}` : 'No minimum';
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function matchesVoucherSearch(voucher: DripTeaVoucher, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [voucher.code, voucher.title, voucher.description || '']
    .some(value => value.toLowerCase().includes(normalizedQuery));
}

export default function StoreStaffVoucherPage() {
  const [vouchers, setVouchers] = useState<DripTeaVoucher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<DripTeaVoucher | null>(null);

  async function loadVouchers() {
    setIsRefreshing(true);
    try {
      const response = await getStaffVouchers();
      setVouchers(response.data || []);
      setError('');
    } catch (err) {
      console.error('[Store staff vouchers]', err);
      setError('Unable to load vouchers from the backend.');
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadVouchers();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError('');
    try {
      await deleteVoucher(id);
      setVouchers(prev => prev.filter(v => v._id !== id));
      if (selectedVoucher?._id === id) setSelectedVoucher(null);
    } catch (err) {
      console.error('[Store staff voucher delete]', err);
      setError('Failed to delete voucher.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVouchers = vouchers.filter(voucher => matchesVoucherSearch(voucher, searchQuery));

  const totalCount = vouchers.length;
  const activeCount = vouchers.filter(v => getVoucherStatus(v) === 'active').length;
  const inactiveCount = vouchers.filter(v => getVoucherStatus(v) === 'inactive').length;
  const expiredCount = vouchers.filter(v => getVoucherStatus(v) === 'expired').length;

  return (
    <div className={styles.page}>
      <StaffHeader />

      <main className={styles.main}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statLabel}>Total Vouchers</span>
              <strong className={styles.statValue}>{totalCount}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statLabel}>Active</span>
              <strong className={styles.statValue}>{activeCount}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statLabel}>Inactive</span>
              <strong className={styles.statValue}>{inactiveCount}</strong>
            </div>
          </div>
          <div className={`${styles.statCard} ${expiredCount > 0 ? styles.statAlert : ''}`}>
            <div>
              <span className={styles.statLabel}>Expired</span>
              <strong className={`${styles.statValue} ${expiredCount > 0 ? styles.red : ''}`}>{expiredCount}</strong>
            </div>
          </div>
        </div>

        <div className={styles.tabsBar}>
          <h1 className={styles.pageTitle}>Voucher Management</h1>

          <div className={styles.toolbarRight}>
            <button type="button" className={styles.refreshBtn} onClick={() => void loadVouchers()} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search vouchers by code or title..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            {error}
          </div>
        )}

        <div className={styles.tableCard}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Discount</th>
                  <th>Min Spend</th>
                  <th>Status</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.length > 0 ? filteredVouchers.map(voucher => {
                  const status = getVoucherStatus(voucher);

                  return (
                    <tr key={voucher._id} className={status !== 'active' ? styles.rowInactive : ''}>
                      <td className={styles.codeCell}>{voucher.code}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.itemNameLink}
                          onClick={() => setSelectedVoucher(voucher)}
                        >
                          {voucher.title}
                        </button>
                      </td>
                      <td className={styles.discountCell}>{formatDiscount(voucher)}</td>
                      <td className={styles.minSpendCell}>{formatMinSpend(voucher)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[status]}`}>
                          {formatStatus(status)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.btnDelete}
                          onClick={() => void handleDelete(voucher._id!)}
                          disabled={deletingId === voucher._id}
                        >
                          {deletingId === voucher._id ? '...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className={styles.empty}>No vouchers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Voucher Detail Modal */}
      {selectedVoucher && (
        <div className={styles.modalOverlay} onClick={() => setSelectedVoucher(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedVoucher.title}</h2>
              <button type="button" className={styles.modalClose} onClick={() => setSelectedVoucher(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Code</span>
                  <span className={styles.detailValue}>{selectedVoucher.code}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Discount</span>
                  <span className={styles.detailValue}>{formatDiscount(selectedVoucher)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Minimum Spend</span>
                  <span className={styles.detailValue}>{formatMinSpend(selectedVoucher)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={styles.detailValue}>{formatStatus(getVoucherStatus(selectedVoucher))}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Expires</span>
                  <span className={styles.detailValue}>{selectedVoucher.expiresAt ? formatDate(selectedVoucher.expiresAt) : 'No expiry'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Created</span>
                  <span className={styles.detailValue}>{formatDate(selectedVoucher.createdAt)}</span>
                </div>
                {selectedVoucher.description && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Description</span>
                    <span className={styles.detailValue}>{selectedVoucher.description}</span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setSelectedVoucher(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
