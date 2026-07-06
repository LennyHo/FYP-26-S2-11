import styles from './AvyConcierge.module.css';
import buttons from '../buttons.module.css';
import layout from '../marketing.module.css';

const DEMOS = [
  {
    video: '/marketing/assets/driptea_marketing_1.mp4',
    label: 'Speak naturally.',
    desc: 'No rigid menus or clicking through complex flows. Just tell Avy what you’re craving in plain words and get matched instantly.',
  },
  {
    video: '/marketing/assets/driptea_marketing_2.mp4',
    label: 'Any language, anytime.',
    desc: 'Switch seamlessly between English, Chinese, Malay, or Tamil mid-chat. Avy follows along without missing a beat.',
  },
  {
    video: '/marketing/assets/driptea_marketing_3.mp4',
    label: 'Tailored to your taste.',
    desc: 'Fine-tune your sweetness, ice level, and toppings exactly how you like it. Let Avy guide you through your perfect build.',
  },
];

export default function AvyConcierge() {
  return (
    <section className={styles.section} id="avy">
      <div className={layout.wrap}>
        <div className={styles.intro}>
          <p className={layout.eyebrow}>Your concierge</p>
          <h2 className={styles.title}>See Avy in action.</h2>
          <p className={styles.sub}>
          Get a firsthand look at how Avy takes your order, remembers your preferences, and keeps things moving behind the counter.
          </p>
        </div>

        <div className={styles.cardsGrid}>
          {DEMOS.map((demo) => (
            <div className={styles.card} key={demo.video}>
              <div className={styles.videoFrame}>
                <video
                  className={styles.demoVideo}
                  src={demo.video}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-hidden="true"
                />
              </div>
              <p className={styles.cardLabel}>{demo.label}</p>
              <p className={styles.cardDesc}>{demo.desc}</p>
            </div>
          ))}
        </div>

        <div className={styles.ctaWrap}>
          <a
            className={`${buttons.btn} ${buttons.large} ${buttons.spark}`}
            href="https://driptea-ruby.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try Avy on DripTea
          </a>
        </div>
      </div>
    </section>
  );
}
