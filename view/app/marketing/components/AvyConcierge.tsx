import styles from './AvyConcierge.module.css';
import buttons from '../buttons.module.css';
import layout from '../marketing.module.css';

const DEMOS = [
  {
    video: '/marketing/assets/driptea_marketing_1.mp4',
    label: 'Just say it.',
    desc: 'Tell Avy what you’re craving in plain language. Skip the menu and get matched to a drink instantly.',
  },
  {
    video: '/marketing/assets/driptea_marketing_2.mp4',
    label: 'Any language, anytime.',
    desc: 'Switch to Chinese, Malay, or Tamil mid-conversation. Avy keeps up without missing a beat.',
  },
  {
    video: '/marketing/assets/driptea_marketing_3.mp4',
    label: 'Customize it your way.',
    desc: 'Pick your ice and sugar level exactly how you like it. Let Avy walk you through every option.',
  },
];

export default function AvyConcierge() {
  return (
    <section className={styles.section} id="avy">
      <div className={layout.wrap}>
        <div className={styles.intro}>
          <p className={layout.eyebrow}>Your concierge</p>
          <h2 className={styles.title}>Meet Avy.</h2>
          <p className={styles.sub}>
            Avy is the chatbot behind the counter. Here&apos;s what talking to her actually looks like.
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
