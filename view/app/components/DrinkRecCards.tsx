"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ChatbotSidebar.module.css';
import { drinkData, DRINK_INFO, parseDrinkFromHtml } from '../utils/chatHelpers';

const DRINK_RATINGS: Record<string, number> = {
  b001: 4.5, // Classic Milk Tea
  b002: 4.3, // Jasmine Green Tea
  b003: 4.2, // Oolong Milk Tea
  b004: 4.0, // Osmanthus Milk Tea
  b005: 4.4, // Da Hong Bao Milk Tea
  b006: 4.6, // Matcha Latte
  b007: 4.7, // Strawberry Matcha Tea
  b008: 4.1, // Cranberry Matcha Tea
  b009: 4.5, // Jasmine Matcha Tea
  b010: 4.8, // Double Chocolate Frappe
  b011: 4.9, // Milo Dinosaur
  b012: 4.3, // Taro Slush
};

function StarRating({ rating }: { rating: number }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = rating >= i + 1;
    const half = !filled && rating >= i + 0.5;
    return (
      <span key={i} className={styles.drinkStar}>
        {filled ? '★' : half ? '⯨' : '☆'}
      </span>
    );
  });
  return (
    <div className={styles.drinkFlipCardRating}>
      <span className={styles.drinkStars}>{stars}</span>
      <span className={styles.drinkRatingNum}>{rating.toFixed(1)}</span>
    </div>
  );
}

interface MenuBeverage {
  id: string;
  base_calories: number;
  base_sugar_g: number;
  nutri_grade: string;
}

const CACHE_TTL_MS = 60_000; // 60 s — changes in MongoDB appear within a minute
let cachedMenu: MenuBeverage[] | null = null;
let cacheExpiry = 0;

function getApiBase() {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000';
  return (process.env.NEXT_PUBLIC_DRIPTEA_API_BASE || '').replace(/\/$/, '');
}

async function fetchMenuBeverages(): Promise<MenuBeverage[]> {
  if (cachedMenu && Date.now() < cacheExpiry) return cachedMenu;
  try {
    const res = await fetch(`${getApiBase()}/api/menu-items`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.data)) {
      cachedMenu = data.data as MenuBeverage[];
      cacheExpiry = Date.now() + CACHE_TTL_MS;
      return cachedMenu;
    }
  } catch {}
  return [];
}

interface DrinkRecommendation {
  id: string;
  name: string;
  image: string;
  grade: string;
  sugar: string;
  calories: string;
}

interface Props {
  msgText: string;
  flippedCard: string | null;
  setFlippedCard: (id: string | null) => void;
}

export default function DrinkRecCards({ msgText, flippedCard, setFlippedCard }: Props) {
  const router = useRouter();
  const [menuMap, setMenuMap] = useState<Record<string, MenuBeverage>>({});

  useEffect(() => {
    fetchMenuBeverages().then(items => {
      const map: Record<string, MenuBeverage> = {};
      items.forEach(item => { map[item.id] = item; });
      setMenuMap(map);
    });
  }, []);

  const drinkHtmlBlocks = msgText
    .split(/(<img[^>]*>[\s\S]*?(?:<\/button>|<br\s*\/?>\s*<br\s*\/?>))/im)
    .filter(Boolean);
  const drinks: DrinkRecommendation[] = [];
  const otherText: string[] = [];

  drinkHtmlBlocks.forEach(block => {
    if (block.includes('startOrder')) {
      const drink = parseDrinkFromHtml(block);
      if (drink) drinks.push(drink);
    } else {
      const cleanedText = block
        .replace(/<img[^>]*>/gi, '')
        .replace(/<button[\s\S]*?<\/button>/gi, '')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .trim();
      if (cleanedText) otherText.push(cleanedText);
    }
  });

  return (
    <div className={styles.drinkRecResponse}>
      {otherText.length > 0 && (
        <div
          className={styles.drinkRecOtherText}
          dangerouslySetInnerHTML={{ __html: otherText.join('').trim() }}
        />
      )}
      {drinks.length > 0 && (
        <div className={styles.drinkRecCardsWrap}>
          {drinks.map((drink, i) => {
            const drinkInfo = Object.entries(drinkData).find(([name]) => name === drink.name);
            const category = drinkInfo ? drinkInfo[1].category : 'milk-tea';
            // Prefer the hardcoded drinkData ID over the AI-extracted ID — Gemini sometimes
            // puts the drink name (e.g. "Classic Milk Tea") instead of the DB id (e.g. "b001")
            const resolvedId = drinkInfo ? drinkInfo[1].id : drink.id;
            const isFlipped = flippedCard === resolvedId;

            // Use MongoDB data if loaded; fall back to Gemini-parsed values
            const mongoData = menuMap[resolvedId];
            const displayGrade = mongoData?.nutri_grade ?? drink.grade;
            const displaySugar = mongoData?.base_sugar_g ?? drink.sugar;
            const displayCal   = mongoData?.base_calories ?? drink.calories;

            return (
              <div key={`drink-${i}`}>
                <button
                  type="button"
                  className={isFlipped ? `${styles.drinkFlipCard} ${styles.drinkFlipCardFlipped}` : styles.drinkFlipCard}
                  onClick={() => setFlippedCard(isFlipped ? null : resolvedId)}
                  aria-label={`${isFlipped ? 'Hide' : 'Show'} details for ${drink.name}`}
                >
                  <div className={styles.drinkFlipCardInner}>
                    {/* Front */}
                    <div className={styles.drinkFlipCardFront}>
                      <div className={styles.drinkFlipCardImgWrap}>
                        <img
                          src={`/img/bubble_teas/${resolvedId}.jpg`}
                          alt={drink.name}
                          className={styles.drinkFlipCardImg}
                        />
                      </div>
                      <div className={styles.drinkFlipCardName}>{drink.name}</div>
                      <StarRating rating={DRINK_RATINGS[resolvedId] ?? 4.0} />
                      <div className={styles.drinkFlipCardStats}>
                        <div className={styles.drinkFlipCardStatItem}>
                          <span className={styles.drinkFlipCardStatLabel}>Grade</span>
                          <span className={styles.drinkFlipCardStatValue}>{displayGrade}</span>
                        </div>
                        <div className={styles.drinkFlipCardStatItem}>
                          <span className={styles.drinkFlipCardStatLabel}>Sugar</span>
                          <span className={styles.drinkFlipCardStatValue}>{displaySugar}<span className={styles.drinkFlipCardStatUnit}>g</span></span>
                        </div>
                        <div className={styles.drinkFlipCardStatItem}>
                          <span className={styles.drinkFlipCardStatLabel}>Cal</span>
                          <span className={styles.drinkFlipCardStatValue}>{displayCal}<span className={styles.drinkFlipCardStatUnit}> kcal</span></span>
                        </div>
                      </div>
                      <div className={styles.drinkFlipCardFlipHint}>Tap for details ↺</div>
                    </div>

                    {/* Back */}
                    <div className={styles.drinkFlipCardBack}>
                      {DRINK_INFO[resolvedId] ? (
                        <>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>Ingredients:</div>
                            <ul className={styles.drinkFlipCardBackList}>
                              {DRINK_INFO[resolvedId].ingredients.map((ing, j) => (
                                <li key={j}>{ing}</li>
                              ))}
                            </ul>
                          </div>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>For Diabetics:</div>
                            <div className={styles.drinkFlipCardBackText}>{DRINK_INFO[resolvedId].diabeticAdvice}</div>
                          </div>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>Insulin Impact:</div>
                            <div className={styles.drinkFlipCardBackText}>{DRINK_INFO[resolvedId].insulinImpact}</div>
                          </div>
                        </>
                      ) : (
                        <div className={styles.drinkFlipCardBackText}>
                          No detailed info available. Click to flip back -&gt;
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                <a
                  href={`/menu/${category}/${resolvedId}`}
                  className={styles.customizeLink}
                  onClick={e => { e.preventDefault(); router.push(`/menu/${category}/${resolvedId}`); }}
                >
                  Customize
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
