
import styles from './login.module.css';

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className={styles.container} style={{
        position: 'relative',
        zIndex: 1,
        background: 'var(--card)',
        border: '2.5px solid var(--border)',
        borderRadius: 24,
        boxShadow: '0 8px 32px 0 #e5d6c2',
        padding: '38px 32px 28px 32px',
        minWidth: 340,
        maxWidth: 400,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 28, letterSpacing: 2, color: 'var(--foreground)', fontFamily: 'Quicksand, Arial Rounded MT Bold, Arial, sans-serif' }}>DRIPTEA</span>
          <span className={styles.title} style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 22, marginTop: 6 }}>Login</span>
        </div>
        <form className={styles.form} autoComplete="off">
          <div>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input type="email" id="email" name="email" required className={styles.input} placeholder="username@gmail.com" />
          </div>
          <div>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input type="password" id="password" name="password" required className={styles.input} placeholder="Password" />
          </div>
          <div className={styles.forgot} style={{ color: 'var(--accent-brown)' }}>Forgot Password?</div>
          <button type="submit" className={styles.button} style={{
            background: 'var(--foreground)',
            color: 'var(--background)',
            borderRadius: 18,
            fontWeight: 700,
            fontSize: 17,
            marginTop: 8,
            marginBottom: 8,
          }}>
            Sign in
          </button>
        </form>
        <div className={styles.divider} style={{ color: 'var(--accent-brown)' }}>or continue with</div>
        <div className={styles.socials}>
          <button className={styles.socialBtn} aria-label="Sign in with Google" style={{ background: '#fff9f3', border: '2px solid #e94f37', color: '#e94f37' }}>G</button>
          <button className={styles.socialBtn} aria-label="Sign in with GitHub" style={{ background: '#fff9f3', border: '2px solid #b77b57', color: '#b77b57' }}>B</button>
          <button className={styles.socialBtn} aria-label="Sign in with Microsoft" style={{ background: '#fff9f3', border: '2px solid #7bb661', color: '#7bb661' }}>M</button>
        </div>
        <div className={styles.register} style={{ color: 'var(--foreground)' }}>
          Don&apos;t have an account?
          <a href="#" style={{ color: 'var(--accent-red)', fontWeight: 600, marginLeft: 4 }}>Register for free</a>
        </div>
      </div>
    </div>
  );
}
