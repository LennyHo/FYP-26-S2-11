// User Story Architecture Trace — user-admin-dashboard/page.tsx
//
// #1   Create User Profile
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #2   View User Profile
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #3   Update User Profile
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #4   Suspend User Profile
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #5   Search User Profile
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #6   Create User Account
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #7   View User Account
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #8   Update User Account
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #9   Suspend User Account
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #10  Search User Account
//      View: user-admin-dashboard/page.tsx (this file) → Route: user.routes.js → Model: user.model.js
//
// #11  Login (User Admin)
//      View: login/page.tsx → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js
//
// #12  Logout (User Admin)
//      View: user-admin-dashboard/page.tsx (this file) — client-side: JWT cleared from localStorage
'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBan, FaCheck, FaEye, FaPen, FaPlus, FaSearch, FaTimes, FaUser, FaUsers } from 'react-icons/fa';
import AdminHeader from '../components/layout/AdminHeader';
import { createUserAccount, getUsers, suspendUser, updateUser } from '../utils/adminApi';
import { clearStoredUser, type DripTeaAddress, type DripTeaUser } from '../utils/api.base';
import { useOutlets } from '../utils/outlets';
import styles from './page.module.css';

type ActiveTab = 'profiles' | 'accounts';
type FormMode = 'create' | 'edit';

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  role: string;
  status: string;
  addresses: DripTeaAddress[];
  storeCode: string;
};

const roleOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'store_staff', label: 'Store Staff' },
  { value: 'user_admin', label: 'Admin' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

function roleLabel(role: string) {
  return roleOptions.find(option => option.value === role)?.label || role;
}

function statusLabel(status: string) {
  return statusOptions.find(option => option.value === status)?.label || status;
}

function usernameFromEmail(email: string) {
  return email.split('@')[0] || email;
}

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

const MIN_ADDRESS_ROWS = 2;
const MAX_ADDRESS_ROWS = 4;

function blankAddressRow(isDefault: boolean): DripTeaAddress {
  return { label: '', address: '', isDefault };
}

function withMinimumRows(addresses: DripTeaAddress[]): DripTeaAddress[] {
  const rows = addresses.map(a => ({ ...a }));
  while (rows.length < MIN_ADDRESS_ROWS) {
    rows.push(blankAddressRow(rows.length === 0));
  }
  return rows;
}

function emptyForm(): UserFormState {
  return {
    fullName: '',
    email: '',
    password: '',
    role: 'customer',
    status: 'active',
    addresses: withMinimumRows([]),
    storeCode: '',
  };
}

function formFromUser(user: DripTeaUser): UserFormState {
  return {
    fullName: user.fullName,
    email: user.email,
    password: '',
    role: user.role,
    status: user.status,
    addresses: withMinimumRows(user.addresses ?? []),
    storeCode: user.storeCode || '',
  };
}

// Optional blank rows shouldn't be sent to the backend as real addresses.
function filledAddresses(addresses: DripTeaAddress[]): DripTeaAddress[] {
  const filled = addresses.filter(a => a.address.trim().length > 0);
  if (filled.length > 0 && !filled.some(a => a.isDefault)) {
    filled[0] = { ...filled[0], isDefault: true };
  }
  return filled;
}

export default function UserAdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<DripTeaUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [viewingUser, setViewingUser] = useState<DripTeaUser | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingUser, setEditingUser] = useState<DripTeaUser | null>(null);
  const [formData, setFormData] = useState<UserFormState>(emptyForm());
  const { outlets } = useOutlets();

  async function refreshUsers() {
    try {
      setIsLoading(true);
      const response = await getUsers();
      setUsers(response.data || []);
      setMessage('');
    } catch (error) {
      console.error('[DripTea admin users]', error);
      setMessage(error instanceof Error ? error.message : 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshUsers();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (formMode) closeFormModal();
      else if (viewingUser) setViewingUser(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [formMode, viewingUser]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;

    return users.filter(user =>
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      roleLabel(user.role).toLowerCase().includes(query) ||
      statusLabel(user.status).toLowerCase().includes(query)
    );
  }, [searchQuery, users]);

  const [viewingRole, setViewingRole] = useState<typeof roleOptions[number] | null>(null);

  const activeUsers = users.filter(user => user.status === 'active').length;
  const userTypeCount = new Set(users.map(user => user.role)).size;

  function openCreateModal() {
    setMessage('');
    setFormError('');
    setEmailError('');
    setEditingUser(null);
    setFormData(emptyForm());
    setFormMode('create');
  }

  function openEditModal(user: DripTeaUser) {
    setMessage('');
    setFormError('');
    setEmailError('');
    setEditingUser(user);
    setFormData(formFromUser(user));
    setFormMode('edit');
  }

  function closeFormModal() {
    setFormError('');
    setEmailError('');
    setFormMode(null);
    setEditingUser(null);
    setFormData(emptyForm());
  }

  function handleEmailChange(value: string) {
    updateFormField('email', value);
    const normalized = value.trim().toLowerCase();
    if (!normalized) { setEmailError(''); return; }
    const duplicate = users.some(u => u.email.toLowerCase() === normalized && u.id !== editingUser?.id);
    setEmailError(duplicate ? 'An account with this email already exists.' : '');
  }

  function updateFormField(field: Exclude<keyof UserFormState, 'addresses'>, value: string) {
    setFormData(current => ({ ...current, [field]: value }));
  }

  function addAddress() {
    setFormData(current => {
      if (current.addresses.length >= MAX_ADDRESS_ROWS) return current;
      return {
        ...current,
        addresses: [...current.addresses, blankAddressRow(current.addresses.length === 0)],
      };
    });
  }

  function removeAddress(index: number) {
    if (index < MIN_ADDRESS_ROWS) return;
    setFormData(current => {
      const addresses = current.addresses.filter((_, i) => i !== index);
      // If the removed entry was the default, promote the first remaining one.
      if (current.addresses[index]?.isDefault && addresses.length > 0 && !addresses.some(a => a.isDefault)) {
        addresses[0] = { ...addresses[0], isDefault: true };
      }
      return { ...current, addresses };
    });
  }

  function updateAddressField(index: number, field: 'label' | 'address', value: string) {
    setFormData(current => ({
      ...current,
      addresses: current.addresses.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    }));
  }

  function setDefaultAddress(index: number) {
    setFormData(current => ({
      ...current,
      addresses: current.addresses.map((entry, i) => ({ ...entry, isDefault: i === index })),
    }));
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    if (emailError) return;

    if (formData.role === 'store_staff' && !formData.storeCode) {
      setFormError('A store is required for store staff accounts.');
      return;
    }

    setIsSaving(true);

    try {
      if (formMode === 'create') {
        const response = await createUserAccount({
          ...formData,
          addresses: filledAddresses(formData.addresses),
          storeCode: formData.role === 'store_staff' ? formData.storeCode : null,
        });
        setUsers(current => [...current, response.data].sort((a, b) => a.fullName.localeCompare(b.fullName)));
        setMessage('User created.');
      } else if (formMode === 'edit' && editingUser) {
        const response = await updateUser(editingUser.id, {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          addresses: filledAddresses(formData.addresses),
          storeCode: formData.role === 'store_staff' ? formData.storeCode : null,
        });
        setUsers(current => current.map(user => (user.id === response.data.id ? response.data : user)));
        setMessage('User updated.');
      }

      closeFormModal();
    } catch (error) {
      console.error('[DripTea save user]', error);
      setFormError(error instanceof Error ? error.message : 'Unable to save user.');
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleUserStatus(user: DripTeaUser) {
    setMessage('');

    try {
      const response = user.status === 'active'
        ? await suspendUser(user.id)
        : await updateUser(user.id, { status: 'active' });
      setUsers(current => current.map(row => (row.id === response.data.id ? response.data : row)));
    } catch (error) {
      console.error('[DripTea toggle user status]', error);
      setMessage(error instanceof Error ? error.message : 'Unable to update user status.');
    }
  }

  function handleLogout() {
    clearStoredUser();
    router.push('/login');
  }

  function renderActions(user: DripTeaUser) {
    const isActive = user.status === 'active';

    return (
      <td className={styles.actions}>
        <button
          type="button"
          className={styles.btnSmall}
          title="View"
          aria-label={`View ${user.fullName}`}
          onClick={() => setViewingUser(user)}
        >
          <FaEye />
        </button>
        <button
          type="button"
          className={styles.btnSmall}
          title="Edit"
          aria-label={`Edit ${user.fullName}`}
          onClick={() => openEditModal(user)}
        >
          <FaPen />
        </button>
        <button
          type="button"
          className={styles.btnSmall}
          onClick={() => void toggleUserStatus(user)}
          title={isActive ? 'Suspend' : 'Activate'}
          aria-label={`${isActive ? 'Suspend' : 'Activate'} ${user.fullName}`}
        >
          {isActive ? <FaBan /> : <FaCheck />}
        </button>
      </td>
    );
  }

  return (
    <div className={styles.page}>
      <AdminHeader />

      <main className={styles.main}>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Users</span>
            <strong className={styles.statValue}>{users.length}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Customers</span>
            <strong className={styles.statValue}>
              {users.filter(u => u.role === 'customer').length}
            </strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Store Staff</span>
            <strong className={styles.statValue}>
              {users.filter(u => u.role === 'store_staff').length}
            </strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Admins</span>
            <strong className={styles.statValue}>
              {users.filter(u => u.role === 'user_admin').length}
            </strong>
          </div>
          <div className={`${styles.statCard} ${users.filter(u => u.status === 'suspended').length > 0 ? styles.statAlert : ''}`}>
            <span className={styles.statLabel}>Suspended</span>
            <strong className={`${styles.statValue} ${users.filter(u => u.status === 'suspended').length > 0 ? styles.statRed : ''}`}>
              {users.filter(u => u.status === 'suspended').length}
            </strong>
          </div>
        </div>

        <section className={styles.tabsSection}>
          <div className={styles.tabsBar}>
            <div className={styles.tabsLeft}>
              <div className={styles.tabsNav}>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'profiles' ? styles.active : ''}`}
                  onClick={() => setActiveTab('profiles')}
                >
                  User Profiles
                </button>
                <button
                  type="button"
                  className={`${styles.tab} ${activeTab === 'accounts' ? styles.active : ''}`}
                  onClick={() => setActiveTab('accounts')}
                >
                  User Accounts
                </button>
              </div>
              <button type="button" className={styles.actionButton} onClick={openCreateModal}>
                <FaPlus /> New User
              </button>
            </div>

            <div className={styles.searchWrapper}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder={activeTab === 'profiles' ? 'Search profiles by name or email...' : 'Search accounts by username or email...'}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
            </div>
          </div>
        </section>

        {message && <p className={styles.statusMessage}>{message}</p>}

        {activeTab === 'profiles' && (
          <section className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>User Profiles Management</h2>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roleOptions.map(profile => {
                    const roleUsers = users.filter(u => u.role === profile.value);
                    const latestDate = roleUsers.reduce<string | undefined>((latest, u) => {
                      const d = u.updatedAt || u.createdAt;
                      if (!d) return latest;
                      return !latest || d > latest ? d : latest;
                    }, undefined);
                    return (
                    <tr key={profile.value}>
                      <td><span className={styles.badge}>{profile.label}</span></td>
                      <td><span className={`${styles.status} ${styles.active}`}>Active</span></td>
                      <td>{formatDate(latestDate)}</td>
                      <td className={styles.actions}>
                        <button
                          type="button"
                          className={styles.btnSmall}
                          title="View"
                          aria-label={`View ${profile.label}`}
                          onClick={() => setViewingRole(profile)}
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          className={styles.btnSmall}
                          title={`Create ${profile.label}`}
                          aria-label={`Create ${profile.label}`}
                          onClick={() => {
                            setFormData({ ...emptyForm(), role: profile.value });
                            setEditingUser(null);
                            setFormMode('create');
                          }}
                        >
                          <FaPen />
                        </button>
                        <button
                          type="button"
                          className={styles.btnSmall}
                          disabled
                          title="Cannot suspend a profile type"
                          aria-label={`Suspend ${profile.label}`}
                        >
                          <FaBan />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'accounts' && (
          <section className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>User Accounts Management</h2>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>User Type</th>
                    <th>Account Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className={styles.noResults}>Loading users...</td>
                    </tr>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td>{user.fullName}</td>
                        <td>{user.email}</td>
                        <td><span className={styles.badge}>{roleLabel(user.role)}</span></td>
                        <td>
                          <span className={`${styles.status} ${styles[user.status]}`}>
                            {statusLabel(user.status)}
                          </span>
                        </td>
                        <td>{formatDate(user.updatedAt || user.createdAt)}</td>
                        {renderActions(user)}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className={styles.noResults}>No accounts found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>

      {viewingUser && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="view-user-title">
          <div className={styles.modal}>
            <div className={styles.modalAccent} />
            <div className={styles.modalBody}>
              <div className={styles.modalHeader}>
                <div className={styles.modalAvatar}><FaUser /></div>
                <div className={styles.modalHeaderText}>
                  <h2 id="view-user-title">User Details</h2>
                  <p>{viewingUser.email}</p>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setViewingUser(null)} aria-label="Close">
                  <FaTimes />
                </button>
              </div>
              <div className={styles.modalScroll}>
                <dl className={styles.detailList}>
                  <div><dt>Name</dt><dd>{viewingUser.fullName}</dd></div>
                  <div><dt>Email</dt><dd>{viewingUser.email}</dd></div>
                  <div><dt>User Type</dt><dd>{roleLabel(viewingUser.role)}</dd></div>
                  <div><dt>Status</dt><dd>{statusLabel(viewingUser.status)}</dd></div>
                  <div>
                    <dt>Addresses</dt>
                    <dd>
                      {viewingUser.addresses && viewingUser.addresses.length > 0 ? (
                        <ul className={styles.addressViewList}>
                          {viewingUser.addresses.map((entry, index) => (
                            <li key={entry._id ?? index}>
                              <strong>{entry.label || 'Address'}{entry.isDefault ? ' (Default)' : ''}:</strong> {entry.address}
                            </li>
                          ))}
                        </ul>
                      ) : '—'}
                    </dd>
                  </div>
                  <div><dt>Created</dt><dd>{formatDate(viewingUser.createdAt)}</dd></div>
                  <div><dt>Last Updated</dt><dd>{formatDate(viewingUser.updatedAt)}</dd></div>
                </dl>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setViewingUser(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setViewingUser(null);
                    openEditModal(viewingUser);
                  }}
                >
                  Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingRole && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="view-role-title">
          <div className={styles.modal}>
            <div className={styles.modalAccent} />
            <div className={styles.modalBody}>
              <div className={styles.modalHeader}>
                <div className={styles.modalAvatar}><FaUsers /></div>
                <div className={styles.modalHeaderText}>
                  <h2 id="view-role-title">{viewingRole.label} Profile</h2>
                  <p>{users.filter(u => u.role === viewingRole.value).length} user(s)</p>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setViewingRole(null)} aria-label="Close">
                  <FaTimes />
                </button>
              </div>
              <div className={styles.modalScroll}>
                <div className={styles.detailList}>
                  {users.filter(u => u.role === viewingRole.value).length === 0 ? (
                    <div className={styles.roleUserRow}>No users with this profile yet.</div>
                  ) : (
                    users.filter(u => u.role === viewingRole.value).map(u => (
                      <div key={u.id} className={styles.roleUserRow}>
                        <div className={styles.roleUserInfo}>
                          <span className={styles.roleUserName}>{u.fullName}</span>
                          <span className={styles.roleUserEmail}>{u.email}</span>
                        </div>
                        <span className={`${styles.status} ${styles[u.status]}`}>{statusLabel(u.status)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setViewingRole(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {formMode && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <form className={styles.modal} onSubmit={handleFormSubmit}>
            <div className={styles.modalAccent} />
            <div className={styles.modalBody}>
              <div className={styles.modalHeader}>
                <div className={styles.modalAvatar}>
                  {formMode === 'create' ? <FaPlus /> : <FaPen />}
                </div>
                <div className={styles.modalHeaderText}>
                  <h2 id="edit-user-title">{formMode === 'create' ? 'Create User' : 'Edit User'}</h2>
                  <p>{formMode === 'create' ? 'Fill in the details below' : `Editing ${editingUser?.fullName ?? ''}`}</p>
                </div>
                <button type="button" className={styles.iconButton} onClick={closeFormModal} aria-label="Close">
                  <FaTimes />
                </button>
              </div>

              <div className={styles.modalScroll}>
                {formError && <p className={styles.formErrorMessage}>{formError}</p>}

                <div className={styles.formGrid}>
                  <label>
                    Name
                    <input
                      value={formData.fullName}
                      onChange={(event) => updateFormField('fullName', event.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleEmailChange(event.target.value)}
                      placeholder="email@example.com"
                      className={emailError ? styles.inputError : undefined}
                      required
                    />
                    {emailError && <span className={styles.fieldError}>{emailError}</span>}
                  </label>
                  {formMode === 'create' && (
                    <label className={styles.formGridFull}>
                      Password
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(event) => updateFormField('password', event.target.value)}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        required
                      />
                    </label>
                  )}
                  <label>
                    User Type
                    <select value={formData.role} onChange={(event) => updateFormField('role', event.target.value)}>
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  {formData.role === 'store_staff' && (
                    <label>
                      Store
                      <select value={formData.storeCode} onChange={(event) => updateFormField('storeCode', event.target.value)} required>
                        <option value="">Select a store</option>
                        {outlets.map(outlet => (
                          <option key={outlet.storeCode} value={outlet.storeCode}>{outlet.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Status
                    <select value={formData.status} onChange={(event) => updateFormField('status', event.target.value)}>
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.addressEditor}>
                  <div className={styles.addressEditorHeader}>
                    <span>Saved Addresses</span>
                    <button
                      type="button"
                      className={styles.addAddressButton}
                      onClick={addAddress}
                      disabled={formData.addresses.length >= MAX_ADDRESS_ROWS}
                    >
                      <FaPlus /> {formData.addresses.length >= MAX_ADDRESS_ROWS ? 'Limit reached (4)' : 'Add Address'}
                    </button>
                  </div>

                  <div className={styles.addressList}>
                    {formData.addresses.map((entry, index) => {
                      const isPermanent = index < MIN_ADDRESS_ROWS;
                      return (
                        <div key={index} className={styles.addressRow}>
                          <input
                            value={entry.label ?? ''}
                            onChange={(event) => updateAddressField(index, 'label', event.target.value)}
                            placeholder="Label (e.g. Home, Work)"
                            className={styles.addressLabelInput}
                          />
                          <input
                            value={entry.address}
                            onChange={(event) => updateAddressField(index, 'address', event.target.value)}
                            placeholder="Full address (optional)"
                            className={styles.addressLineInput}
                          />
                          <label className={styles.addressDefaultToggle}>
                            <input
                              type="radio"
                              name="defaultAddress"
                              checked={Boolean(entry.isDefault)}
                              onChange={() => setDefaultAddress(index)}
                            />
                            Default
                          </label>
                          {isPermanent ? (
                            <span className={styles.removeAddressSpacer} aria-hidden="true" />
                          ) : (
                            <button
                              type="button"
                              className={styles.removeAddressButton}
                              onClick={() => removeAddress(index)}
                              aria-label="Remove address"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeFormModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={isSaving || Boolean(emailError)}>
                  {isSaving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
