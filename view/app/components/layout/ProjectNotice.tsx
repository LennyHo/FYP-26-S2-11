import styles from './ProjectNotice.module.css';

// Rendered inside Footer where there is one, standalone via GlobalLayout elsewhere.
export default function ProjectNotice({ standalone = false }: { standalone?: boolean }) {
  return (
    <p className={`${styles.notice} ${standalone ? styles.standalone : ''}`}>
      DripTea is a student final-year project (FYP-26-S2-11) built for academic assessment.
      It is an educational prototype, not a commercial service, and no real orders or
      payments are fulfilled.
    </p>
  );
}
