import styles from './register.module.css';
import BackgroundShapes from '../login/BackgroundShapes';

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <BackgroundShapes />
      <div className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.brandMark}>
              <span className={styles.logoIcon} aria-hidden="true">
                <span className={styles.dropCore} />
                <span className={styles.dropMini} />
                <span className={styles.dropShine} />
                <span className={styles.rippleInner} />
                <span className={styles.rippleMid} />
                <span className={styles.rippleOuter} />
              </span>
              DRIPTEA
            </div>
            <span className={styles.brandTag}>Handcrafted tea bar</span>
          </div>
          <div className={styles.brandStory}>
            <p className={styles.brandLead}>Register for free and start exploring your next favorite drip.</p>
            <p className={styles.brandText}>Create your account to save preferences, access offers, and personalize your tea journey.</p>
          </div>
          <div className={styles.brandPills}>
            <span>Free account</span>
            <span>Order tracking</span>
            <span>Faster checkout</span>
          </div>
        </aside>

        <div className={styles.container}>
          <div className={styles.heading}>
            <span className={styles.kicker}>Welcome to DRIPTEA</span>
            <h1 className={styles.title}>Create your free account</h1>
            <p className={styles.subtitle}>This is a UI-only registration page for now. Form submission can be connected to backend later.</p>
          </div>

          <form className={styles.form} autoComplete="off">
            <div>
              <label htmlFor="fullName" className={styles.label}>Full name</label>
              <input type="text" id="fullName" name="fullName" required className={styles.input} placeholder="Your full name" />
            </div>
            <div>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input type="email" id="email" name="email" required className={styles.input} placeholder="username@gmail.com" />
            </div>
            <div>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input type="password" id="password" name="password" required className={styles.input} placeholder="Create password" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" required className={styles.input} placeholder="Confirm password" />
            </div>
            <button type="submit" className={styles.button}>get started with DRIPTEA</button>
          </form>

          <div className={styles.register}>
            Already have an account?
            <a href="/login">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}