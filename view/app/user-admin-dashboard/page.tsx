// #01 - As a user admin, I want to create a user profile so that I can add new users to the system.
// #02 - As a user admin, I want to view user profiles so that I can monitor all registered users.
// #03 - As a user admin, I want to update a user profile so that I can keep user information current.
// #04 - As a user admin, I want to suspend a user profile so that I can restrict access for policy violations.
// #05 - As a user admin, I want to search for user profiles so that I can find specific users quickly.
// #06 - As a user admin, I want to create a user account so that I can onboard new users.
// #07 - As a user admin, I want to view user accounts so that I can oversee all accounts in the system.
// #08 - As a user admin, I want to update a user account so that I can correct or change account details.
// #09 - As a user admin, I want to suspend a user account so that I can revoke system access when needed.
// #10 - As a user admin, I want to search for user accounts so that I can manage accounts efficiently.
// #11 - As a user admin, I want to log in to my account so that I can access the admin dashboard.
// #12 - As a user admin, I want to log out of my account so that I can end my session securely.
// Frontend: Loads UserAdminDashboard → GET /api/users → user.controller.js → User.find()
// → POST /api/users (create) | PATCH /api/users/:id (update/suspend) → updates users collection.
'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBan, FaCheck, FaEye, FaPen, FaPlus, FaTimes } from 'react-icons/fa';
import AdminHeader from '../components/layout/AdminHeader';
import {
  clearStoredUser,
  createUserAccount,
  getUsers,
  suspendUser,
  updateUser,
  type DripTeaUser,
} from '../utils/dripteaApi';
import styles from './page.module.css';

type ActiveTab = 'profiles' | 'accounts';
type FormMode = 'create' | 'edit';

type UserFormState = {
  fullName: string;
  email: string;
  password: string;
  role: string;
  status: string;
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

function emptyForm(): UserFormState {
  return {
    fullName: '',
    email: '',
    password: '',
    role: 'customer',
    status: 'active',
  };
}

function formFromUser(user: DripTeaUser): UserFormState {
  return {
    fullName: user.fullName,
    email: user.email,
    password: '',
    role: user.role,
    status: user.status,
  };
}

export default function UserAdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<DripTeaUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [viewingUser, setViewingUser] = useState<DripTeaUser | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingUser, setEditingUser] = useState<DripTeaUser | null>(null);
  const [formData, setFormData] = useState<UserFormState>(emptyForm());

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

  const activeUsers = users.filter(user => user.status === 'active').length;
  const userTypeCount = new Set(users.map(user => user.role)).size;

  function openCreateModal() {
    setMessage('');
    setEditingUser(null);
    setFormData(emptyForm());
    setFormMode('create');
  }

  function openEditModal(user: DripTeaUser) {
    setMessage('');
    setEditingUser(user);
    setFormData(formFromUser(user));
    setFormMode('edit');
  }

  function closeFormModal() {
    setFormMode(null);
    setEditingUser(null);
    setFormData(emptyForm());
  }

  function updateFormField(field: keyof UserFormState, value: string) {
    setFormData(current => ({ ...current, [field]: value }));
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setIsSaving(true);

    try {
      if (formMode === 'create') {
        const response = await createUserAccount(formData);
        setUsers(current => [...current, response.data].sort((a, b) => a.fullName.localeCompare(b.fullName)));
        setMessage('User created.');
      } else if (formMode === 'edit' && editingUser) {
        const response = await updateUser(editingUser.id, {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          status: formData.status,
        });
        setUsers(current => current.map(user => (user.id === response.data.id ? response.data : user)));
        setMessage('User updated.');
      }

      closeFormModal();
    } catch (error) {
      console.error('[DripTea save user]', error);
      setMessage(error instanceof Error ? error.message : 'Unable to save user.');
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

          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder={activeTab === 'profiles' ? 'Search profiles by name or email...' : 'Search accounts by username or email...'}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={styles.searchInput}
            />
          </div>
        </section>

        {message && <p className={styles.statusMessage}>{message}</p>}

        {activeTab === 'profiles' && (
          <section className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>User Profiles Management</h2>
              <button type="button" className={styles.actionButton} onClick={openCreateModal}>
                <FaPlus /> Create New Profile
              </button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>User Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className={styles.noResults}>Loading users...</td>
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
                        {renderActions(user)}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.noResults}>No profiles found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'accounts' && (
          <section className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>User Accounts Management</h2>
              <button type="button" className={styles.actionButton} onClick={openCreateModal}>
                <FaPlus /> Create New Account
              </button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Account Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className={styles.noResults}>Loading users...</td>
                    </tr>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td>{usernameFromEmail(user.email)}</td>
                        <td>{user.email}</td>
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
                      <td colSpan={5} className={styles.noResults}>No accounts found</td>
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
                <div className={styles.modalAvatar}>👤</div>
                <div className={styles.modalHeaderText}>
                  <h2 id="view-user-title">User Details</h2>
                  <p>{viewingUser.email}</p>
                </div>
                <button type="button" className={styles.iconButton} onClick={() => setViewingUser(null)} aria-label="Close">
                  <FaTimes />
                </button>
              </div>
              <dl className={styles.detailList}>
                <div><dt>Name</dt><dd>{viewingUser.fullName}</dd></div>
                <div><dt>Email</dt><dd>{viewingUser.email}</dd></div>
                <div><dt>User Type</dt><dd>{roleLabel(viewingUser.role)}</dd></div>
                <div><dt>Status</dt><dd>{statusLabel(viewingUser.status)}</dd></div>
                <div><dt>Created</dt><dd>{formatDate(viewingUser.createdAt)}</dd></div>
                <div><dt>Last Updated</dt><dd>{formatDate(viewingUser.updatedAt)}</dd></div>
              </dl>
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

      {formMode && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <form className={styles.modal} onSubmit={handleFormSubmit}>
            <div className={styles.modalAccent} />
            <div className={styles.modalBody}>
              <div className={styles.modalHeader}>
                <div className={styles.modalAvatar}>
                  {formMode === 'create' ? '➕' : '✏️'}
                </div>
                <div className={styles.modalHeaderText}>
                  <h2 id="edit-user-title">{formMode === 'create' ? 'Create User' : 'Edit User'}</h2>
                  <p>{formMode === 'create' ? 'Fill in the details below' : `Editing ${editingUser?.fullName ?? ''}`}</p>
                </div>
                <button type="button" className={styles.iconButton} onClick={closeFormModal} aria-label="Close">
                  <FaTimes />
                </button>
              </div>

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
                    onChange={(event) => updateFormField('email', event.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                </label>
                {formMode === 'create' && (
                  <label>
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
                <label>
                  Status
                  <select value={formData.status} onChange={(event) => updateFormField('status', event.target.value)}>
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={closeFormModal}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={isSaving}>
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
