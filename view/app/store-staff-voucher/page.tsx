// User Story Architecture Trace — store-staff-voucher/page.tsx
//
// #315 View Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx (this file) → Route: voucher.routes.js → Ctrl: voucher.controller.js → Model: voucher.model.js
//
// #316 Delete Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx (this file) → Route: voucher.routes.js → Ctrl: voucher.controller.js → Model: voucher.model.js
//
// #317 Search Vouchers (Store Staff)
//      View: store-staff-voucher/page.tsx (this file) → Route: voucher.routes.js → Ctrl: voucher.controller.js → Model: voucher.model.js
//
// #391 Create Voucher (Store Staff)
//      View: store-staff-voucher/page.tsx (this file) → Route: voucher.routes.js → Ctrl: voucher.controller.js → Model: voucher.model.js
//      Vouchers have no store/outlet field, so every voucher created here is shared
//      by every store staff account via the same GET /api/staff/vouchers list.

'use client';

import StaffHeader from '../components/layout/StaffHeader';
import styles from './page.module.css';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaChevronDown } from 'react-icons/fa';
import { getStaffVouchers, deleteVoucher, createVoucher, type DripTeaVoucher } from '../utils/staffApi';
import { isSessionExpiredError, clearStoredUser } from '../utils/api.base';

type SelectOption = { value: string; label: string };

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selected = options.find(option => option.value === value);

  return (
    <div className={styles.select} ref={rootRef}>
      <button
        type="button"
        className={`${styles.selectTrigger} ${open ? styles.selectTriggerOpen : ''}`}
        onClick={() => setOpen(current => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected ? selected.label : ''}</span>
        <FaChevronDown className={styles.selectChevron} />
      </button>
      {open && (
        <ul className={styles.selectMenu} role="listbox">
          {options.map(option => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`${styles.selectOption} ${option.value === value ? styles.selectOptionActive : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type CreateVoucherForm = {
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  maxDiscount: string;
  minSpend: string;
  expiresAt: string;
  isActive: boolean;
};

const EMPTY_VOUCHER_FORM: CreateVoucherForm = {
  code: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscount: '',
  minSpend: '0',
  expiresAt: '',
  isActive: true,
};

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
  const router = useRouter();
  const [vouchers, setVouchers] = useState<DripTeaVoucher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<DripTeaVoucher | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateVoucherForm>(EMPTY_VOUCHER_FORM);
  const [createError, setCreateError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Sends the staff member back to login instead of retrying an expired/invalid
  // session forever, which just spams console errors.
  function handleSessionExpired() {
    clearStoredUser();
    router.push('/login');
  }

  async function loadVouchers() {
    setIsRefreshing(true);
    try {
      const response = await getStaffVouchers();
      setVouchers(response.data || []);
      setError('');
    } catch (err) {
      if (isSessionExpiredError(err)) return handleSessionExpired();
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
      if (isSessionExpiredError(err)) return handleSessionExpired();
      console.error('[Store staff voucher delete]', err);
      setError('Failed to delete voucher.');
    } finally {
      setDeletingId(null);
    }
  };

  function openCreateModal() {
    setCreateForm(EMPTY_VOUCHER_FORM);
    setCreateError('');
    setCodeError('');
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setCreateError('');
    setCodeError('');
  }

  function handleCodeChange(value: string) {
    setCreateForm(f => ({ ...f, code: value }));
    const normalized = value.trim().toUpperCase();
    if (!normalized) { setCodeError(''); return; }
    const duplicate = vouchers.some(v => v.code.toUpperCase() === normalized);
    setCodeError(duplicate ? `A voucher with code "${normalized}" already exists.` : '');
  }

  async function handleCreateSubmit() {
    if (codeError) return;

    const code = createForm.code.trim().toUpperCase();
    const title = createForm.title.trim();
    const discountValue = Number(createForm.discountValue);

    if (!code || !title) {
      setCreateError('Code and title are required.');
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      setCreateError('A valid discount value is required.');
      return;
    }
    if (createForm.discountType === 'percentage' && discountValue > 100) {
      setCreateError('Percentage discount cannot exceed 100.');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    try {
      const res = await createVoucher({
        code,
        title,
        description: createForm.description.trim(),
        discountType: createForm.discountType,
        discountValue,
        maxDiscount: createForm.discountType === 'percentage' && createForm.maxDiscount
          ? Number(createForm.maxDiscount)
          : null,
        minSpend: createForm.minSpend ? Number(createForm.minSpend) : 0,
        isActive: createForm.isActive,
        expiresAt: createForm.expiresAt || null,
      });
      setVouchers(prev => [res.data, ...prev]);
      closeCreateModal();
    } catch (err) {
      if (isSessionExpiredError(err)) return handleSessionExpired();
      setCreateError(err instanceof Error ? err.message : 'Failed to create voucher.');
    } finally {
      setIsCreating(false);
    }
  }

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
          <div className={styles.tabsBarTop}>
            <h1 className={styles.pageTitle}>Voucher Management</h1>

            <div className={styles.toolbarRight}>
              <button type="button" className={styles.btnCreate} onClick={openCreateModal}>
                + New Voucher
              </button>
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

      {/* Create Voucher Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={closeCreateModal}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New Voucher</h2>
              <button type="button" className={styles.modalClose} onClick={closeCreateModal}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Code <span className={styles.required}>*</span></label>
                  <input
                    className={`${styles.formInput} ${codeError ? styles.formInputError : ''}`}
                    value={createForm.code}
                    onChange={e => handleCodeChange(e.target.value)}
                    placeholder="e.g. SAVE10"
                  />
                  {codeError && <p className={styles.fieldError}>{codeError}</p>}
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Title <span className={styles.required}>*</span></label>
                  <input
                    className={styles.formInput}
                    value={createForm.title}
                    onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. S$10 OFF"
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Description</label>
                <input
                  className={styles.formInput}
                  value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. S$10 off orders above S$30"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Discount Type <span className={styles.required}>*</span></label>
                  <Select
                    value={createForm.discountType}
                    onChange={(value) => setCreateForm(f => ({ ...f, discountType: value as 'percentage' | 'fixed' }))}
                    options={[
                      { value: 'percentage', label: 'Percentage (%)' },
                      { value: 'fixed', label: 'Fixed Amount (S$)' },
                    ]}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Discount Value <span className={styles.required}>*</span>
                    <span className={styles.formHint}> ({createForm.discountType === 'percentage' ? '%' : 'S$'})</span>
                  </label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min="0"
                    max={createForm.discountType === 'percentage' ? 100 : undefined}
                    step="0.01"
                    value={createForm.discountValue}
                    onChange={e => setCreateForm(f => ({ ...f, discountValue: e.target.value }))}
                    placeholder={createForm.discountType === 'percentage' ? '15' : '10.00'}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                {createForm.discountType === 'percentage' && (
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Max Discount <span className={styles.formHint}>(S$, optional)</span></label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min="0"
                      step="0.01"
                      value={createForm.maxDiscount}
                      onChange={e => setCreateForm(f => ({ ...f, maxDiscount: e.target.value }))}
                      placeholder="e.g. 8"
                    />
                  </div>
                )}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Min Spend <span className={styles.formHint}>(S$)</span></label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.minSpend}
                    onChange={e => setCreateForm(f => ({ ...f, minSpend: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Expiry Date <span className={styles.formHint}>(optional)</span></label>
                  <input
                    className={styles.formInput}
                    type="date"
                    value={createForm.expiresAt}
                    onChange={e => setCreateForm(f => ({ ...f, expiresAt: e.target.value }))}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Status</label>
                  <Select
                    value={createForm.isActive ? 'active' : 'inactive'}
                    onChange={(value) => setCreateForm(f => ({ ...f, isActive: value === 'active' }))}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
              </div>

              {createError && <p className={styles.formError}>{createError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={closeCreateModal}>Cancel</button>
              <button type="button" className={styles.btnSubmit} onClick={() => void handleCreateSubmit()} disabled={isCreating || Boolean(codeError)}>
                {isCreating ? 'Creating…' : 'Create Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
