import Header from '../components/Header';
import styles from './page.module.css';

const menuStories = [
  'Create menu items so new beverages can be added.',
  'View menu items to review the available beverages.',
  'Update menu items so price, description, and availability stay accurate.',
  'Search menu items by name to find the beverage quickly.',
];

const sessionStories = ['Log in to start a staff session.', 'Log out to end the staff session.'];

export default function StoreStaffPage() {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Store operations</p>
            <h1>Store Staff</h1>
            <p>
              A static staff workspace that turns the beverage management user stories into a
              simple operations screen.
            </p>
          </div>
          <div className={styles.heroPanel}>
            <div>
              <span>Coverage</span>
              <strong>6 stories</strong>
            </div>
            <div>
              <span>Primary focus</span>
              <strong>Menu items</strong>
            </div>
            <div>
              <span>Session flow</span>
              <strong>Logout only</strong>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Catalog management</p>
            <h2>Menu item controls</h2>
          </div>
          <div className={styles.storyGrid}>
            {menuStories.map((story, index) => (
              <article key={story} className={styles.storyCard}>
                <span className={styles.storyId}>0{index + 1}</span>
                <p>{story}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.splitGrid}>
          <article className={styles.panelCard}>
            <h3>Operational focus</h3>
            <p>
              Staff can use this page as a visual reference for browsing, editing, and finding
              menu entries.
            </p>
          </article>
          <article className={styles.panelCard}>
            <h3>Session access</h3>
            <ul>
              {sessionStories.map((story) => (
                <li key={story}>{story}</li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}