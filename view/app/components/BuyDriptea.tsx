'use client';

import { useState, useEffect } from "react";
import Header from '../components/Header';
import styles from './BuyDriptea.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { searchBeverage } from '../utils/dripteaApi';

const categories = [
  { name: 'Milk Tea', slug: 'milk-tea', tone: 'catBrown', image: '/img/bubble_teas/b001.jpg', desc: 'Creamy & classic' },
  { name: 'Matcha Teas', slug: 'matcha-teas', tone: 'catGreen', image: '/img/bubble_teas/b006.jpg', desc: 'Earthy & bold' },
  { name: 'Ice Blended', slug: 'ice-blended', tone: 'catBlue', image: '/img/bubble_teas/b010.jpg', desc: 'Cool & refreshing' },
  { name: 'Local Favourites', slug: 'local-favorites', tone: 'catGold', image: '/img/bubble_teas/b011.jpg', desc: 'Taste of home' },
];

// #19 Helper Function
function toCategorySlug(category: string) {
  return category.toLowerCase().replace(/\s+/g, '-');
}

export default function BuyDripTeaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  type MenuSearchItem = {
    id: string;
    name: string;
    category: string;
    price: number;
    description: string;
    image: string;
  };
  const [searchResults, setSearchResults] = useState<MenuSearchItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async () => {
    const keyword = searchTerm.trim();
    setHasSearched(true);
    setSearchError('');
    if (!keyword) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await searchBeverage(keyword);
      setSearchResults(data.data || []);
    } catch {
      setSearchError('Unable to search beverages. Please try again later.');
      setSearchResults([]);
    }
  };

  // Auto-filter: debounce 300 ms after each keystroke
  useEffect(() => {
    const keyword = searchTerm.trim();
    if (!keyword) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setHasSearched(true);
      setSearchError('');
      try {
        const data = await searchBeverage(keyword);
        setSearchResults(data.data || []);
      } catch {
        setSearchError('Unable to search beverages. Please try again later.');
        setSearchResults([]);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);
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

            {/* Actions and meta removed for a cleaner hero */}
          </div>
        </section>

        {/* OUR MENU CATEGORIES SECTION */}
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>Explore by Category</p>
            <h2>Our Menu</h2>
          </div>
          <div className={styles.menuSearchRow}>
            <input
              type="text"
              value={searchTerm}
              placeholder="Search drinks..."
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
                      <div className={styles.searchDrinkTop}>
                        <span className={styles.searchPriceTag}>
                          S$ {Number(drink.price || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className={styles.searchImageWrapper}>
                        <img
                          src={drink.image || `/img/bubble_teas/${drink.id}.png`}
                          alt={drink.name}
                          className={styles.searchDrinkImage}
                          onError={(event) => {
                            event.currentTarget.src = "/img/bubble_teas/b001.png";
                          }}
                        />
                      </div>

                      <div className={styles.searchDrinkInfo}>
                        <p className={styles.searchDrinkCategory}>{drink.category}</p>
                        <h3>{drink.name}</h3>
                        <p>{drink.description}</p>
                      </div>

                      <Link
                        href={`/menu/${toCategorySlug(drink.category)}/${drink.id}`}
                        className={styles.searchAddButton}
                      >
                        Customize &amp; Add
                      </Link>
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
                className={`${styles.categoryCard} ${styles[cat.tone]}`}
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
