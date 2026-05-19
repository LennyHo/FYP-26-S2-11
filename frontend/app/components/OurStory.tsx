"use client";

import React from 'react';
import styles from './OurStory.module.css';

export default function OurStory() {
  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <img
            src="/main_logo.svg"
            alt="DripTea Logo"
            style={{ maxWidth: '340px', width: '60vw', height: 'auto', margin: '0 auto', display: 'block' }}
          />
          <h2 className={styles.subtitle}>OVER THE YEARS</h2>
          <div className={styles.decorativeLine}></div>
        </div>
        <div className={styles.heroBackground}></div>
      </section>

      {/* Timeline Section */}
      <section className={styles.timelineSection}>
        <div className={styles.timeline}>
          {/* Story Item 1 */}
          <div className={styles.storyItem}>
            <div className={styles.storyMarker}>
              <div className={styles.markerDot}></div>
              <div className={styles.markerLine}></div>
            </div>
            <div className={styles.storyContent}>
              <h3 className={styles.year}>2015</h3>
              <h4 className={styles.storyTitle}>The Beginning</h4>
              <p className={styles.storyText}>
                It all started with a simple passion for authentic bubble tea. Our founder, inspired by traditional tea cultures, decided to bring a unique twist to modern beverage crafting. In a small shop in the heart of the city, DripTea was born.
              </p>
              <div className={styles.storyIcon}>🍵</div>
            </div>
          </div>

          {/* Story Item 2 */}
          <div className={styles.storyItem}>
            <div className={styles.storyMarker}>
              <div className={styles.markerDot}></div>
              <div className={styles.markerLine}></div>
            </div>
            <div className={styles.storyContent}>
              <h3 className={styles.year}>2017</h3>
              <h4 className={styles.storyTitle}>Growing Our Roots</h4>
              <p className={styles.storyText}>
                With our signature drinks gaining popularity, we expanded to three locations. We committed ourselves to using only the finest ingredients, carefully sourced from sustainable suppliers around the world.
              </p>
              <div className={styles.storyIcon}>🌱</div>
            </div>
          </div>

          {/* Story Item 3 */}
          <div className={styles.storyItem}>
            <div className={styles.storyMarker}>
              <div className={styles.markerDot}></div>
              <div className={styles.markerLine}></div>
            </div>
            <div className={styles.storyContent}>
              <h3 className={styles.year}>2019</h3>
              <h4 className={styles.storyTitle}>Innovation & Sustainability</h4>
              <p className={styles.storyText}>
                We launched our eco-friendly initiative, replacing single-use plastics with sustainable packaging. Our research team developed proprietary blends that revolutionized the taste of bubble tea while maintaining our commitment to environmental responsibility.
              </p>
              <div className={styles.storyIcon}>♻️</div>
            </div>
          </div>

          {/* Story Item 4 */}
          <div className={styles.storyItem}>
            <div className={styles.storyMarker}>
              <div className={styles.markerDot}></div>
              <div className={styles.markerLine}></div>
            </div>
            <div className={styles.storyContent}>
              <h3 className={styles.year}>2021</h3>
              <h4 className={styles.storyTitle}>Digital Transformation</h4>
              <p className={styles.storyText}>
                We embraced technology by launching our online ordering platform and AI-powered chatbot assistant. This allowed us to serve customers more efficiently while maintaining the personal touch that defines the DripTea experience.
              </p>
              <div className={styles.storyIcon}>🤖</div>
            </div>
          </div>

          {/* Story Item 5 */}
          <div className={styles.storyItem}>
            <div className={styles.storyMarker}>
              <div className={styles.markerDot}></div>
            </div>
            <div className={styles.storyContent}>
              <h3 className={styles.year}>2026</h3>
              <h4 className={styles.storyTitle}>Today & Tomorrow</h4>
              <p className={styles.storyText}>
                With over 50 locations worldwide and millions of satisfied customers, DripTea continues to innovate. Our vision remains unchanged: to craft exceptional beverages that bring joy to every cup, while respecting our planet and communities.
              </p>
              <div className={styles.storyIcon}>🌍</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className={styles.valuesSection}>
        <h2 className={styles.valuesTitle}>Our Values</h2>
        <div className={styles.valuesGrid}>
          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>✨</div>
            <h3 className={styles.valueTitle}>Quality</h3>
            <p className={styles.valueText}>Premium ingredients sourced from trusted suppliers worldwide</p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>🌿</div>
            <h3 className={styles.valueTitle}>Sustainability</h3>
            <p className={styles.valueText}>Committed to environmentally responsible practices</p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>❤️</div>
            <h3 className={styles.valueTitle}>Community</h3>
            <p className={styles.valueText}>Building meaningful connections with our customers</p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.valueIcon}>🎨</div>
            <h3 className={styles.valueTitle}>Innovation</h3>
            <p className={styles.valueText}>Constantly evolving to bring new experiences</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Join Our Story</h2>
        <p className={styles.ctaText}>Experience the DripTea difference today. Every cup tells a story.</p>
        <button className={styles.ctaButton}>Explore Our Menu</button>
      </section>
    </div>
  );
}
