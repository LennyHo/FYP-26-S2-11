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
import { useRouter } from 'next/navigation';
import { getMenuItems } from '../../utils/customerApi';

const categories = [
  { name: 'Milk Tea', slug: 'milk-tea' },
  { name: 'Matcha Teas', slug: 'matcha-teas' },
  { name: 'Ice Blended', slug: 'ice-blended' },
  { name: 'Fruit Teas', slug: 'fruit-teas' },
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
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [allItems, setAllItems] = useState<MenuSearchItem[]>([]);
  const [searchError, setSearchError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0].slug);
  const menuSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const orderType = window.localStorage.getItem("driptea_order_type");

    if (orderType !== "pickup" && orderType !== "delivery") {
      router.replace("/order-type");
    }
  }, [router]);

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
          <div className={styles.menuHeaderCard}>
            <svg className={styles.menuHeaderArt} viewBox="0 0 200 240" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="menuHeaderArtGradient" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#9b6d4a" />
                  <stop offset="55%" stopColor="#c89a5a" />
                  <stop offset="100%" stopColor="#7fae3f" />
                </linearGradient>
              </defs>
              <path d="M50 70h100l-14 140a12 12 0 0 1-12 10H76a12 12 0 0 1-12-10L50 70Z" stroke="url(#menuHeaderArtGradient)" strokeWidth="4" strokeLinejoin="round" />
              <path d="M50 70h100" stroke="url(#menuHeaderArtGradient)" strokeWidth="4" strokeLinecap="round" />
              <path d="M108 70 128 20" stroke="url(#menuHeaderArtGradient)" strokeWidth="4" strokeLinecap="round" />
              <circle cx="86" cy="148" r="6" fill="url(#menuHeaderArtGradient)" />
              <circle cx="112" cy="150" r="6" fill="url(#menuHeaderArtGradient)" />
              <circle cx="98" cy="168" r="6" fill="url(#menuHeaderArtGradient)" />
              <circle cx="90" cy="188" r="6" fill="url(#menuHeaderArtGradient)" />
            </svg>

            <div className={styles.sectionHeading}>
              <span className={styles.menuHeaderBadge}>✦ Now Brewing</span>
              <h2 className={styles.menuTitle}>Our <span className={styles.menuTitleAccent}>Menu</span></h2>
              <div className={styles.menuHeaderStats}>
                <span className={styles.menuHeaderStat}><span className={styles.menuHeaderStatNum}>15+</span> Drinks</span>
                <span className={styles.menuHeaderStatDot} aria-hidden="true" />
                <span className={styles.menuHeaderStat}><span className={styles.menuHeaderStatNum}>4</span> Categories</span>
                <span className={styles.menuHeaderStatDot} aria-hidden="true" />
                <span className={styles.menuHeaderStat}><span className={styles.menuHeaderStatNum}>∞</span> Customisations</span>
              </div>
            </div>

            <div className={styles.menuHeaderDivider} />

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
          </div>{/* end menuHeaderCard */}

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
          {!searchTerm.trim() && (
            <div className={styles.seriesBrowser}>
              <aside className={styles.seriesSidebar}>
                <h3 className={styles.seriesSidebarTitle}>Tea Series</h3>
                <nav className={styles.seriesNav}>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      className={`${styles.seriesNavItem} ${selectedCategory === cat.slug ? styles.seriesNavItemActive : ''}`}
                      onClick={() => setSelectedCategory(cat.slug)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </nav>
              </aside>

              {(() => {
                const drinks = allItems.filter((item) => toCategorySlug(item.category) === selectedCategory);

                if (drinks.length === 0) {
                  return (
                    <p key={selectedCategory} className={`${styles.noSearchResult} ${styles.seriesContentFade}`}>
                      No drinks found for this category yet.
                    </p>
                  );
                }

                return (
                  <div key={selectedCategory} className={`${styles.searchCardGrid} ${styles.seriesContentFade}`}>
                    {drinks.map((drink) => (
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
                            href={`/menu/${selectedCategory}/${drink.id}`}
                            className={styles.searchAddButton}
                          >
                            Customize &amp; Add
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
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
