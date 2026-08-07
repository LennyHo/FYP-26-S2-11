import styles from './ProjectNotice.module.css';

/**
 * Single source of truth for the "this is an academic prototype" statement.
 *
 * Rendered inside the global Footer on pages that have one, and standalone via
 * GlobalLayout on the pages where the footer is suppressed, so the site identifies
 * itself on every route.
 */
export default function ProjectNotice({ standalone = false }: { standalone?: boolean }) {
  return (
    <p className={`${styles.notice} ${standalone ? styles.standalone : ''}`}>
      DripTea is a student final-year project (FYP-26-S2-11) built for academic assessment.
      It is an educational prototype, not a commercial service, and no real orders or
      payments are fulfilled.
    </p>
  );
}
