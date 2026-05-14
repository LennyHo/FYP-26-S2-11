'use client';

import AdminHeader from '../components/AdminHeader';
import styles from './page.module.css';
import { useState } from 'react';

export default function UserAdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('profiles');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration
  const [userProfiles, setUserProfiles] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', type: 'Customer', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', type: 'Store Staff', status: 'Active' },
    { id: 3, name: 'Admin User', email: 'admin@example.com', type: 'Admin', status: 'Active' },
  ]);

  const [userAccounts, setUserAccounts] = useState([
    { id: 101, username: 'johndoe', email: 'john@example.com', accountStatus: 'Active', lastLogin: '2024-05-10' },
    { id: 102, username: 'janesmith', email: 'jane@example.com', accountStatus: 'Active', lastLogin: '2024-05-09' },
  ]);

  const filteredProfiles = userProfiles.filter(profile =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAccounts = userAccounts.filter(account =>
    account.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // done by "HDC" - explicit number type required by strict TypeScript build.
  const handleSuspendProfile = (id: number) => {
    setUserProfiles(userProfiles.map(p =>
      p.id === id ? { ...p, status: p.status === 'Active' ? 'Suspended' : 'Active' } : p
    ));
  };

  const handleSuspendAccount = (id: number) => {
    setUserAccounts(userAccounts.map(a =>
      a.id === id ? { ...a, accountStatus: a.accountStatus === 'Active' ? 'Suspended' : 'Active' } : a
    ));
  };
  // end done by "HDC"

  return (
    <div className={styles.page}>
      <AdminHeader />

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Admin dashboard</p>
            <h1>User Admin Control Panel</h1>
            <p>
              Manage user profiles and accounts, search for specific users, and maintain controlled 
              access across the platform.
            </p>
          </div>
          <div className={styles.heroPanel}>
            <div>
              <span>Total Profiles</span>
              <strong>{userProfiles.length}</strong>
            </div>
            <div>
              <span>Active Accounts</span>
              <strong>{userAccounts.filter(a => a.accountStatus === 'Active').length}</strong>
            </div>
            <div>
              <span>User Types</span>
              <strong>3</strong>
            </div>
          </div>
        </section>

        {/* Tabs Navigation */}
        <section className={styles.tabsSection}>
          <div className={styles.tabsNav}>
            <button
              className={`${styles.tab} ${activeTab === 'profiles' ? styles.active : ''}`}
              onClick={() => setActiveTab('profiles')}
            >
              User Profiles
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'accounts' ? styles.active : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              User Accounts
            </button>
          </div>

          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder={activeTab === 'profiles' ? 'Search profiles by name or email...' : 'Search accounts by username or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </section>

        {/* User Profiles Tab */}
        {activeTab === 'profiles' && (
          <section className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>User Profiles Management</h2>
              <button className={styles.actionButton}>+ Create New Profile</button>
            </div>

            {/* Stories Coverage */}
            <div className={styles.storiesCoverage}>
              <h3>User Stories Covered</h3>
              <ul>
                <li><span className={styles.badge}>Story 1</span> Create user profiles for different user types</li>
                <li><span className={styles.badge}>Story 2</span> View user profiles for quick information access</li>
                <li><span className={styles.badge}>Story 3</span> Update user profiles to keep details current</li>
                <li><span className={styles.badge}>Story 4</span> Suspend profiles to maintain controlled access</li>
                <li><span className={styles.badge}>Story 5</span> Search profiles to retrieve specific user information</li>
              </ul>
            </div>

            {/* Profiles Table */}
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
                  {filteredProfiles.length > 0 ? (
                    filteredProfiles.map(profile => (
                      <tr key={profile.id}>
                        <td>{profile.name}</td>
                        <td>{profile.email}</td>
                        <td><span className={styles.badge}>{profile.type}</span></td>
                        <td>
                          <span className={`${styles.status} ${styles[profile.status.toLowerCase()]}`}>
                            {profile.status}
                          </span>
                        </td>
                        <td className={styles.actions}>
                          <button className={styles.btnSmall} title="View">👁️</button>
                          <button className={styles.btnSmall} title="Edit">✏️</button>
                          <button 
                            className={styles.btnSmall} 
                            onClick={() => handleSuspendProfile(profile.id)}
                            title={profile.status === 'Active' ? 'Suspend' : 'Activate'}
                          >
                            {profile.status === 'Active' ? '🚫' : '✅'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      {/* done by "HDC" - React TypeScript expects numeric colSpan. */}
                      <td colSpan={5} className={styles.noResults}>No profiles found</td>
                      {/* end done by "HDC" */}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* User Accounts Tab */}
        {activeTab === 'accounts' && (
          <section className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>User Accounts Management</h2>
              <button className={styles.actionButton}>+ Create New Account</button>
            </div>

            {/* Stories Coverage */}
            <div className={styles.storiesCoverage}>
              <h3>User Stories Covered</h3>
              <ul>
                <li><span className={styles.badge}>Story 6</span> Create user accounts for new platform access</li>
                <li><span className={styles.badge}>Story 7</span> View account details for each user</li>
                <li><span className={styles.badge}>Story 8</span> Update accounts to keep records accurate</li>
                <li><span className={styles.badge}>Story 9</span> Suspend accounts to prevent unauthorized access</li>
                <li><span className={styles.badge}>Story 10</span> Search users by username for fast lookup</li>
              </ul>
            </div>

            {/* Accounts Table */}
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Account Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map(account => (
                      <tr key={account.id}>
                        <td>{account.username}</td>
                        <td>{account.email}</td>
                        <td>
                          <span className={`${styles.status} ${styles[account.accountStatus.toLowerCase()]}`}>
                            {account.accountStatus}
                          </span>
                        </td>
                        <td>{account.lastLogin}</td>
                        <td className={styles.actions}>
                          <button className={styles.btnSmall} title="View">👁️</button>
                          <button className={styles.btnSmall} title="Edit">✏️</button>
                          <button 
                            className={styles.btnSmall} 
                            onClick={() => handleSuspendAccount(account.id)}
                            title={account.accountStatus === 'Active' ? 'Suspend' : 'Activate'}
                          >
                            {account.accountStatus === 'Active' ? '🚫' : '✅'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      {/* done by "HDC" - React TypeScript expects numeric colSpan. */}
                      <td colSpan={5} className={styles.noResults}>No accounts found</td>
                      {/* end done by "HDC" */}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Session Management */}
        <section className={styles.sessionSection}>
          <h2>Session Management</h2>
          <p className={styles.sessionSubtext}>Stories 11 & 12: Login and logout functionality</p>
          <div className={styles.sessionButtons}>
            <button className={styles.sessionButton}>Log Out</button>
          </div>
        </section>
      </main>
    </div>
  );
}
