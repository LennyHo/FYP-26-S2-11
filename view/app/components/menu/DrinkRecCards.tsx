"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../chatbot/ChatbotSidebar.module.css';
import { parseDrinkFromHtml } from '../../utils/chatHelpers';


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
  name: string;
  category: string;
  base_calories: number;
  base_sugar_g: number;
  nutri_grade: string;
  rating?: number;
  drinkInfo?: {
    ingredients: string[];
    diabeticAdvice: string;
    insulinImpact: string;
  };
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
  const [nameMap, setNameMap] = useState<Record<string, MenuBeverage>>({});

  useEffect(() => {
    fetchMenuBeverages().then(items => {
      const byId: Record<string, MenuBeverage> = {};
      const byName: Record<string, MenuBeverage> = {};
      items.forEach(item => {
        byId[item.id] = item;
        byName[item.name] = item;
      });
      setMenuMap(byId);
      setNameMap(byName);
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
            const menuItem = nameMap[drink.name];
            const category = menuItem?.category ?? 'milk-tea';
            const resolvedId = menuItem?.id ?? drink.id;
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
                      <StarRating rating={mongoData?.rating ?? 0} />
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
                      {menuMap[resolvedId]?.drinkInfo?.ingredients?.length ? (
                        <>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>Ingredients:</div>
                            <ul className={styles.drinkFlipCardBackList}>
                              {menuMap[resolvedId].drinkInfo!.ingredients.map((ing, j) => (
                                <li key={j}>{ing}</li>
                              ))}
                            </ul>
                          </div>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>For Diabetics:</div>
                            <div className={styles.drinkFlipCardBackText}>{menuMap[resolvedId].drinkInfo!.diabeticAdvice}</div>
                          </div>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>Insulin Impact:</div>
                            <div className={styles.drinkFlipCardBackText}>{menuMap[resolvedId].drinkInfo!.insulinImpact}</div>
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
