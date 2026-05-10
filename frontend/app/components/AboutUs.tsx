"use client";

import { useMemo, useRef, useState } from 'react';
import styles from './AboutUs.module.css';

const points = [
  {
    tone: 'blue',
    title: 'Rooted in Singapore, inspired by Shenzhen',
    text: 'DripTea began as a Singapore-born idea shaped by China arts and culture, with a foundation that reflects the creative energy of Shenzhen.',
  },
  {
    tone: 'brown',
    title: 'Simple, light, and competitive',
    text: 'We keep the experience clean and approachable, while constantly refining our drinks and presentation so we can stand out alongside the competition.',
  },
  {
    tone: 'red',
    title: 'Warmth, culture, and welcome',
    text: 'Every store and every cup is designed to feel inviting, giving customers a place where cultural expression and comfort come together naturally.',
  },
];

export default function AboutUs() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const cardCount = points.length;

  const getToneClass = (tone: string) => {
    if (tone === 'blue') return styles.toneBlue;
    if (tone === 'brown') return styles.toneBrown;
    return styles.toneRed;
  };

  const goToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track) return;

    const cards = Array.from(track.children) as HTMLElement[];
    const nextIndex = Math.max(0, Math.min(index, cards.length - 1));
    const target = cards[nextIndex];

    if (target) {
      track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: 'smooth' });
      setActiveIndex(nextIndex);
    }
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;

    const cards = Array.from(track.children) as HTMLElement[];
    const scrollLeft = track.scrollLeft;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - track.offsetLeft - scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  };

  const dots = useMemo(() => Array.from({ length: cardCount }, (_, index) => index), [cardCount]);

  return (
    <section className={styles.aboutSection} aria-labelledby="about-us-heading">
      <div className={styles.headerRow}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>About Us</p>
          <h2 id="about-us-heading" className={styles.title}>
            A brand built to feel familiar, cultured, and alive.
          </h2>
          <p className={styles.subtitle}>
            DripTea blends heritage, simplicity, and warmth into a space that feels both modern and welcoming.
          </p>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={() => goToIndex(activeIndex - 1)}
            aria-label="Previous about us card"
            disabled={activeIndex === 0}
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={() => goToIndex(activeIndex + 1)}
            aria-label="Next about us card"
            disabled={activeIndex === cardCount - 1}
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.carouselWrap}>
        <div className={styles.track} ref={trackRef} onScroll={handleScroll}>
          {points.map(point => (
            <article key={point.title} className={styles.card}>
              <div className={`${styles.cardVisual} ${getToneClass(point.tone)}`}>
                <div className={styles.visualWash} />
                <div className={styles.visualFrame}>
                  <div className={styles.visualShapeOne} />
                  <div className={styles.visualShapeTwo} />
                  <div className={styles.visualShapeThree} />
                </div>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardKicker}>Our story</span>
                <h3 className={styles.cardTitle}>{point.title}</h3>
                <p className={styles.cardText}>{point.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.dots} aria-label="About us carousel pagination">
          {dots.map(index => (
            <button
              key={index}
              type="button"
              className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ''}`}
              onClick={() => goToIndex(index)}
              aria-label={`Go to about us card ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
