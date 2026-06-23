// User Story Architecture Trace — BuyDriptea.tsx
//
// #13  View Menu
//      View: BuyDriptea.tsx (this file) → Route: menu.routes.js → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #15  Add to Cart
//      View: BuyDriptea.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #21  Search Beverages
//      View: BuyDriptea.tsx (this file) → Route: menu.routes.js → Ctrl: menu.controller.js → Model: menuItem.model.js
'use client';

import { useState, useEffect, useRef } from "react";
import Header from '../layout/Header';
import styles from './BuyDriptea.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { getMenuItems } from '../../utils/customerApi';

const categories = [
  { name: 'Milk Tea', slug: 'milk-tea', tone: 'catBrown', image: '/img/bubble_teas/b004.jpg', desc: 'Creamy & classic' },
  { name: 'Matcha Teas', slug: 'matcha-teas', tone: 'catGreen', image: '/img/bubble_teas/b007.jpg', desc: 'Earthy & bold' },
  { name: 'Ice Blended', slug: 'ice-blended', tone: 'catBlue', image: '/img/bubble_teas/b012.jpg', desc: 'Cool & refreshing' },
  { name: 'Fruit Teas', slug: 'fruit-teas', tone: 'catGold', image: '/img/bubble_teas/b011.jpg', desc: 'Taste of home' },
];

const moods = [
  { label: 'Cozy & Classic', slug: 'milk-tea',       icon: '🤎' },
  { label: 'Bold & Earthy',  slug: 'matcha-teas',    icon: '🍵' },
  { label: 'Cool Me Down',   slug: 'ice-blended',    icon: '❄️' },
  { label: 'Taste of Home',  slug: 'fruit-teas',     icon: '🏡' },
];

// #19 Helper Function
function toCategorySlug(category: string) {
  return category.toLowerCase().replace(/\s+/g, '-');
}

type MenuSearchItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
};

export default function BuyDripTeaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [allItems, setAllItems] = useState<MenuSearchItem[]>([]);
  const [searchError, setSearchError] = useState('');
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const menuSectionRef = useRef<HTMLElement>(null);

  // Load all menu items once on mount for instant client-side search
  useEffect(() => {
    getMenuItems('active')
      .then(res => setAllItems((res.data as MenuSearchItem[]) || []))
      .catch(() => setSearchError('Unable to load menu. Please try again later.'));
  }, []);

  // Scroll-reveal: slide the menu section in when it enters the viewport
  useEffect(() => {
    const el = menuSectionRef.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(32px)';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transition = 'opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.disconnect();
        }
      },
      { threshold: 0.06 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const keyword = searchTerm.trim().toLowerCase();
  const hasSearched = keyword.length > 0;
  const searchResults = hasSearched
    ? (() => {
        const words = keyword.split(/\s+/).filter(Boolean);
        return allItems
          .filter(d => {
            const name = d.name.toLowerCase();
            const cat = d.category.toLowerCase();
            const desc = (d.description || '').toLowerCase();
            return words.every(w => name.includes(w) || cat.includes(w) || desc.includes(w));
          })
          .sort((a, b) => {
            const aExact = a.name.toLowerCase() === keyword;
            const bExact = b.name.toLowerCase() === keyword;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            const aName = a.name.toLowerCase().includes(keyword);
            const bName = b.name.toLowerCase().includes(keyword);
            if (aName && !bName) return -1;
            if (!aName && bName) return 1;
            return 0;
          });
      })()
    : [];

  const handleSearch = () => {};
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <video
            className={styles.heroBackgroundVideo}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            // Mobile autoplay fix
            ref={el => {
              if (el && typeof window !== 'undefined') {
                const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                  el.setAttribute('autoplay', 'true');
                  el.play().catch(() => {});
                }
              }
            }}
          >
            <source src="/buy_driptea_2.mp4" type="video/mp4" />
          </video>
          <div className={styles.heroOverlay} />

          <div className={styles.heroCopy}>
            <h1 className={styles.title}>Refresh Your Day</h1>
            <p className={styles.description}>
              Explore bold flavors and soothing blends. Find your new favorite DripTea now!
            </p>
          </div>
        </section>

        {/* OUR MENU CATEGORIES SECTION */}
        <section className={styles.section} id="menu-section" ref={menuSectionRef}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.menuTitle}>Our Menu</h2>
            <div className={styles.menuTitleLine} aria-hidden="true" />
            <p className={styles.sectionDesc}>
              Whether you&apos;re craving something creamy, earthy, icy cool, or a taste of home, we have a blend that&apos;s just right for you. Browse our handcrafted categories, customize every sip to your liking, and discover your new favorite DripTea.
            </p>
          </div>
          {/* Mood filter chips */}
          <div className={styles.moodFilterRow}>
            <span className={styles.moodFilterLabel}>I&apos;m in the mood for</span>
            {moods.map(mood => (
              <button
                key={mood.slug}
                type="button"
                className={`${styles.moodChip} ${activeMood === mood.slug ? styles.moodChipActive : ''}`}
                onClick={() => setActiveMood(activeMood === mood.slug ? null : mood.slug)}
              >
                <span className={styles.moodChipIcon}>{mood.icon}</span>
                {mood.label}
              </button>
            ))}
          </div>

          <div className={styles.menuSearchContainer}>
            <svg className={styles.menuSearchIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className={styles.menuSearchDivider} aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              placeholder="Search drinks, e.g. matcha, taro..."
              className={styles.menuSearchInput}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
            />
            <button
              type="button"
              className={styles.menuSearchButton}
              onClick={handleSearch}
            >
              Search
            </button>
          </div>


          {hasSearched && (
            <div className={styles.searchResultBlock}>
              <h3 className={styles.searchResultTitle}>Search Results</h3>

              {searchError ? (
                <p role="alert" className={styles.searchError}>{searchError}</p>
              ) : searchResults.length === 0 ? (
                <p className={styles.noSearchResult}>
                  No drinks found. Try searching for milk tea, matcha, chocolate, taro, or Milo.
                </p>
              ) : (
                <div className={styles.searchCardGrid}>
                  {searchResults.map((drink) => (
                    <article key={drink.id} className={styles.searchDrinkCard}>
                      <div className={styles.searchImageWrapper}>
                        <img
                          src={drink.image || `/img/bubble_teas/${drink.id}.png`}
                          alt={drink.name}
                          className={styles.searchDrinkImage}
                          onError={(event) => {
                            event.currentTarget.src = "/img/bubble_teas/b001.png";
                          }}
                        />
                        <span className={styles.searchPriceTag}>
                          S$ {Number(drink.price || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className={styles.searchDrinkInfo}>
                        <h3>{drink.name}</h3>
                        <p>{drink.description}</p>
                      </div>

                      <div className={styles.searchCardFooter}>
                        <Link
                          href={`/menu/${toCategorySlug(drink.category)}/${drink.id}`}
                          className={styles.searchAddButton}
                        >
                          Customize &amp; Add
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
          {!searchTerm.trim() && <div className={styles.cardGrid}>
            {categories.map((cat) => (
              <Link
                href={`/menu/${cat.slug}`}
                key={cat.name}
                className={`${styles.categoryCard} ${styles[cat.tone]} ${activeMood && activeMood !== cat.slug ? styles.categoryCardDimmed : ''}`}
              >
                <div className={styles.categoryVisual}>
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className={styles.categoryDrinkImage}
                    sizes="(max-width: 960px) 100vw, 25vw"
                  />
                </div>
                <div className={styles.categoryFooter}>
                  <div className={styles.categoryFooterText}>
                    <h3>{cat.name}</h3>
                    <p className={styles.categoryDesc}>{cat.desc}</p>
                  </div>
                  <span className={styles.categoryArrow}>Browse <span className={styles.categoryArrowIcon}>›</span></span>
                </div>
              </Link>
            ))}
          </div>}
        </section>

        {/*
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>Frequently Asked Questions</p>
            <h2>FAQ</h2>
          </div>
          Add FAQ content here if needed
        </section>
        */}
      </main>
    </div>
  );
}
