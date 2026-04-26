
import styles from './login.module.css';
import BackgroundShapes from './BackgroundShapes';

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <BackgroundShapes />
      <div className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.brandMark}>DRIPTEA</div>
            <span className={styles.brandTag}>Handcrafted tea bar</span>
          </div>
          <div className={styles.brandStory}>
            <p className={styles.brandLead}>A calmer login experience for a brighter menu.</p>
            <p className={styles.brandText}>Layered tea, fruit-forward drips, and boba built to feel more premium than a standard sign-in page.</p>
          </div>
          <div className={styles.brandVignette}>
            <div className={styles.cupScene}>
              <div className={styles.cupGlow} />
              <div className={styles.cup}>
                <span className={styles.cupTea} />
                <span className={styles.cupLid} />
                <span className={styles.cupPearl} />
                <span className={styles.cupPearlAlt} />
              </div>
              <div className={styles.floatBadgeLeft}>Fresh brew</div>
              <div className={styles.floatBadgeRight}>Seasonal fruit</div>
            </div>
            <div className={styles.brandPills}>
              <span>Fast access</span>
              <span>Saved favorites</span>
              <span>Seasonal drops</span>
            </div>
          </div>
        </aside>
        <div className={styles.container}>
          <div className={styles.heading}>
            <span className={styles.kicker}>Welcome back</span>
            <h1 className={styles.title}>Sign in to DripTea</h1>
            <p className={styles.subtitle}>Use your account to track orders, save favorites, and keep your usual blend close.</p>
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
            <div className={styles.actionsRow}>
              <button type="button" className={styles.forgot}>Forgot password?</button>
            </div>
            <button type="submit" className={styles.button}>Sign in</button>
          </form>
          <div className={styles.divider}>or continue with</div>
          <div className={styles.socials}>
            <button className={styles.socialBtn} aria-label="Sign in with Google">G</button>
            <button className={styles.socialBtn} aria-label="Sign in with GitHub">B</button>
            <button className={styles.socialBtn} aria-label="Sign in with Microsoft">M</button>
          </div>
          <div className={styles.register}>
            Don&apos;t have an account?
            <a href="#">Register for free</a>
          </div>
        </div>
      </div>
    </div>
  );
}
