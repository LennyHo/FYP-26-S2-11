"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './OurStory.module.css';

const TIMELINE = [
  {
    year: '2015',
    title: 'The Beginning',
    text: 'It all started with a simple passion for authentic bubble tea. Our founder, inspired by traditional tea cultures, brought a unique twist to modern beverage crafting — opening the first DripTea in the heart of the city.',
    icon: (
      <>
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
      </>
    ),
  },
  {
    year: '2017',
    title: 'Growing Our Roots',
    text: 'With our signature drinks gaining popularity, we expanded to three locations and committed to sourcing only the finest ingredients from sustainable suppliers around the world.',
    icon: (
      <>
        <path d="M7 20h10" />
        <path d="M10 20c5.5-2.5.8-6.4 3-10" />
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
      </>
    ),
  },
  {
    year: '2019',
    title: 'Innovation & Sustainability',
    text: 'We launched our eco-friendly initiative — replacing single-use plastics with sustainable packaging — and developed proprietary blends that redefined what bubble tea could taste like.',
    icon: (
      <>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </>
    ),
  },
  {
    year: '2021',
    title: 'Digital Transformation',
    text: 'We embraced technology with an online ordering platform and Avy, our AI-powered barista assistant, allowing us to serve customers more efficiently without losing the personal touch DripTea is known for.',
    icon: (
      <>
        <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
      </>
    ),
  },
  {
    year: '2026',
    title: 'Today & Tomorrow',
    text: 'AS DripTea continues to innovate and expand worldwide alongside Avy, our vision remains: to craft exceptional beverages that bring joy to every cup, while honouring our planet and communities.',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
  },
];

const VALUES = [
  {
    title: 'Quality',
    text: 'Premium ingredients, sourced from trusted suppliers worldwide.',
    icon: (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
  },
  {
    title: 'Sustainability',
    text: 'Committed to environmentally responsible practices in every cup.',
    icon: (
      <>
        <path d="M2 22c0 0 3-7 9-7s9 7 9 7" />
        <path d="M12 15C12 15 9 6 15 2" />
      </>
    ),
  },
  {
    title: 'Community',
    text: 'Building meaningful connections with every customer we serve.',
    icon: (
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    ),
  },
  {
    title: 'Innovation',
    text: 'Constantly evolving to bring new and unexpected experiences.',
    icon: (
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    ),
  },
];

export default function OurStory() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.pageContent}>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroStarfield} />
        <div className={styles.heroStarsBright} />
        <div className={styles.heroNebula} />
        <div className={styles.heroBlob} />
        <div className={styles.heroBlobRed} />
        <div className={styles.heroSpotlight} />
        <div className={styles.heroRingOuter} />
        <div className={styles.heroRingMid} />
        <div className={styles.heroRingInner} />
        <div className={styles.heroBurst} />
        <div className={styles.heroCornerTL} />
        <div className={styles.heroCornerTR} />
        <div className={styles.heroCornerBL} />
        <div className={styles.heroCornerBR} />
        <div className={styles.heroBottomFade} />
        <div className={styles.heroInner}>
          <img src="/main_logo.svg" alt="DripTea" className={styles.heroLogo} />
          <p className={styles.heroEyebrow}>Our Story</p>
          <h1 className={styles.heroHeadline}>
            From one small shop<br />to a cup you crave.
          </h1>
          <p className={styles.heroSub}>
            A decade of passion, craft, and community, brewed into every drop.
          </p>
          <div className={styles.heroRule} />
        </div>
      </section>

      {/* ── Content ── */}
      <div className={styles.content}>

        {/* Timeline */}
        <div className={styles.timelinePanel}>
          <div className={styles.tlStarfield} />
          <div className={styles.tlStarsBright} />
          <div className={styles.tlNebula} />
          <div className={styles.tlInner}>
          <p className={styles.sectionEyebrow}>Over the years</p>
          <div className={styles.spine}>
            {TIMELINE.map((item, i) => {
              const isRight = i % 2 === 0;
              return (
                <div key={item.year} className={styles.milestone}>
                  {/* Left column */}
                  <div className={`${styles.milestoneCol} ${styles.colLeft}`}>
                    {!isRight && (
                      <div className={styles.milestoneContent}>
                        <span className={styles.ghostYear}>{item.year}</span>
                        <p className={styles.yearLabel}>{item.year}</p>
                        <h3 className={styles.milestoneTitle}>{item.title}</h3>
                        <p className={styles.milestoneText}>{item.text}</p>
                      </div>
                    )}
                  </div>

                  {/* Center node */}
                  <div className={styles.nodeCol}>
                    <div className={styles.node}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {item.icon}
                      </svg>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className={`${styles.milestoneCol} ${styles.colRight}`}>
                    {isRight && (
                      <div className={styles.milestoneContent}>
                        <span className={styles.ghostYear}>{item.year}</span>
                        <p className={styles.yearLabel}>{item.year}</p>
                        <h3 className={styles.milestoneTitle}>{item.title}</h3>
                        <p className={styles.milestoneText}>{item.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>{/* tlInner */}
        </div>

        {/* Values */}
        <div className={styles.valuesPanel}>
          <div className={styles.tlStarfield} />
          <div className={styles.tlStarsBright} />
          <div className={styles.tlNebula} />
          <div className={styles.tlInner}>
          <h2 className={styles.valuesHeadline}>Our Values</h2>
          <div className={styles.valuesGrid}>
            {VALUES.map((v) => (
              <div key={v.title} className={styles.valueCard}>
                <div className={styles.valueIconWrap}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0257AD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {v.icon}
                  </svg>
                </div>
                <p className={styles.valueTitle}>{v.title}</p>
                <p className={styles.valueText}>{v.text}</p>
              </div>
            ))}
          </div>
          </div>{/* tlInner */}
        </div>

        {/* CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaDotGrid} />
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaHeadline}>Ready to order your next favourite?</h2>
            <p className={styles.ctaSub}>Explore our full menu and find the drink that speaks to you.</p>
            <button type="button" className={styles.ctaBtn} onClick={() => router.push('/order-type')}>
              Explore Our Menu
            </button>
          </div>
        </section>

      </div>

      </div>
    </div>
  );
}
