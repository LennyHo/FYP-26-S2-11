import AdminHeader from '../components/AdminHeader';
import styles from './page.module.css';

const profileStories = [
  'Create user profiles for different user types.',
  'View user profiles for quick information access.',
  'Update user profiles to keep details current.',
  'Suspend profiles to maintain controlled access.',
  'Search profiles to retrieve specific user information.',
];

const accountStories = [
  'Create user accounts for new platform access.',
  'View account details for each user.',
  'Update accounts to keep records accurate.',
  'Suspend accounts to prevent unauthorized access.',
  'Search users by username for fast lookup.',
  'Log in and log out to manage the admin session.',
];

export default function UserAdminPage() {
  return (
    <div className={styles.page}>
      <AdminHeader />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Role dashboard</p>
            <h1>User Admin</h1>
            <p>
              A static webpage that translates the admin user stories into a structured control
              panel for profile and account management.
            </p>
          </div>
          <div className={styles.heroPanel}>
            <div>
              <span>Coverage</span>
              <strong>12 stories</strong>
            </div>
            <div>
              <span>Primary focus</span>
              <strong>Profiles + accounts</strong>
            </div>
            <div>
              <span>Session flow</span>
              <strong>Logout only</strong>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>User profile control</p>
            <h2>Profile operations</h2>
          </div>
          <div className={styles.storyGrid}>
            {profileStories.map((story, index) => (
              <article key={story} className={styles.storyCard}>
                <span className={styles.storyId}>0{index + 1}</span>
                <p>{story}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Account control</p>
            <h2>Account operations</h2>
          </div>
          <div className={styles.splitGrid}>
            <article className={styles.panelCard}>
              <h3>Account management</h3>
              <ul>
                {accountStories.slice(0, 5).map((story) => (
                  <li key={story}>{story}</li>
                ))}
              </ul>
            </article>
            <article className={styles.panelCard}>
              <h3>Session access</h3>
              <ul>
                {accountStories.slice(5).map((story) => (
                  <li key={story}>{story}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.footerNote}>
          This page is intentionally static and can be connected to CRUD actions later.
        </section>
      </main>
    </div>
  );
}