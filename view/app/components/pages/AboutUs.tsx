"use client";

import { useEffect, useRef, useState } from 'react';
import styles from './AboutUs.module.css';

const stats = [
  {
    target: 12,
    label: 'signature drinks',
    text: 'Crafted options across milk tea, matcha, blended, and local favorites.',
  },
  {
    target: 8,
    label: 'outlets',
    text: 'Serving tea lovers through a growing network of neighborhood stores.',
  },
  {
    target: 95,
    label: '% customer satisfaction',
    text: 'Driven by feedback across in-store visits, online reviews, and repeat orders.',
  },
  {
    target: 82,
    label: '% returning customers',
    text: 'A strong share of guests come back for our tea quality and consistent experience.',
  },
];

export default function AboutUs() {
  const sectionRef = useRef<HTMLElement>(null);
  const [animateNumbers, setAnimateNumbers] = useState(false);
  const [displayValues, setDisplayValues] = useState<number[]>(() => stats.map(() => 0));

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setAnimateNumbers(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!animateNumbers) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayValues(stats.map(stat => stat.target));
      return;
    }

    const frameIds: number[] = [];
    const timeoutIds: number[] = [];

    stats.forEach((item, index) => {
      const timeoutId = window.setTimeout(() => {
        const duration = 1800;
        const startValue = 0;
        const startTime = performance.now();

        const tick = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const nextValue = Math.round(startValue + (item.target - startValue) * eased);

          setDisplayValues(previous => {
            const clampedValue = Math.min(item.target, Math.max(previous[index], nextValue));
            if (previous[index] === clampedValue) return previous;
            const next = [...previous];
            next[index] = clampedValue;
            return next;
          });

          if (progress < 1) {
            frameIds[index] = window.requestAnimationFrame(tick);
          } else {
            setDisplayValues(previous => {
              if (previous[index] === item.target) return previous;
              const next = [...previous];
              next[index] = item.target;
              return next;
            });
          }
        };

        frameIds[index] = window.requestAnimationFrame(tick);
      }, index * 120);

      timeoutIds.push(timeoutId);
    });

    return () => {
      timeoutIds.forEach(id => window.clearTimeout(id));
      frameIds.forEach(id => window.cancelAnimationFrame(id));
    };
  }, [animateNumbers]);

  return (
    <section ref={sectionRef} className={styles.aboutSection} aria-label="About us statistics">
      <div className={styles.statsGrid}>
        {stats.map((item, index) => {
          const isLeft = index % 2 === 0;
          const directionClass = isLeft ? styles.leftNumber : styles.rightNumber;
          const delayClass =
            index === 0
              ? styles.delay0
              : index === 1
                ? styles.delay1
                : index === 2
                  ? styles.delay2
                  : styles.delay3;

          return (
          <article key={item.target} className={styles.statCard}>
            <h3
              className={`${styles.cups} ${directionClass} ${delayClass} ${animateNumbers ? styles.numberVisible : ''}`}
            >
              {displayValues[index]} {item.label}
            </h3>
            <span className={styles.statDivider} aria-hidden="true" />
            <p className={styles.cardText}>{item.text}</p>
          </article>
          );
        })}
      </div>
    </section>
  );
}
