"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ChatbotSidebar.module.css';
import { drinkData, DRINK_INFO, parseDrinkFromHtml } from '../utils/chatHelpers';

interface MenuBeverage {
  id: string;
  base_calories: number;
  base_sugar_g: number;
  nutri_grade: string;
}

// Module-level cache — fetch once per browser session
let cachedMenu: MenuBeverage[] | null = null;

function getApiBase() {
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5000';
  return (process.env.NEXT_PUBLIC_DRIPTEA_API_BASE || '').replace(/\/$/, '');
}

async function fetchMenuBeverages(): Promise<MenuBeverage[]> {
  if (cachedMenu) return cachedMenu;
  try {
    const res = await fetch(`${getApiBase()}/api/menu-items`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.data)) {
      cachedMenu = data.data as MenuBeverage[];
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
            const isFlipped = flippedCard === drink.id;

            // Use MongoDB data if loaded; fall back to Gemini-parsed values
            const mongoData = menuMap[drink.id];
            const displayGrade = mongoData?.nutri_grade ?? drink.grade;
            const displaySugar = mongoData != null ? mongoData.base_sugar_g : drink.sugar;
            const displayCal   = mongoData != null ? mongoData.base_calories : drink.calories;

            return (
              <div key={`drink-${i}`}>
                <button
                  type="button"
                  className={isFlipped ? `${styles.drinkFlipCard} ${styles.drinkFlipCardFlipped}` : styles.drinkFlipCard}
                  onClick={() => setFlippedCard(isFlipped ? null : drink.id)}
                  aria-label={`${isFlipped ? 'Hide' : 'Show'} details for ${drink.name}`}
                  aria-pressed={isFlipped ? 'true' : 'false'}
                >
                  <div className={styles.drinkFlipCardInner}>
                    {/* Front */}
                    <div className={styles.drinkFlipCardFront}>
                      <div className={styles.drinkFlipCardImgWrap}>
                        <img
                          src={`/img/bubble_teas/${drink.id}.jpg`}
                          alt={drink.name}
                          className={styles.drinkFlipCardImg}
                        />
                      </div>
                      <div className={styles.drinkFlipCardName}>{drink.name}</div>
                      <div className={styles.drinkFlipCardNutrition}>Grade: {displayGrade}</div>
                      <div className={styles.drinkFlipCardNutrition}>Sugar: {displaySugar}g</div>
                      <div className={styles.drinkFlipCardNutrition}>Cal: {displayCal} kcal</div>
                      <div className={styles.drinkFlipCardFlipHint}>Click to flip -&gt;</div>
                    </div>

                    {/* Back */}
                    <div className={styles.drinkFlipCardBack}>
                      {DRINK_INFO[drink.id] ? (
                        <>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>Ingredients:</div>
                            <ul className={styles.drinkFlipCardBackList}>
                              {DRINK_INFO[drink.id].ingredients.map((ing, j) => (
                                <li key={j}>{ing}</li>
                              ))}
                            </ul>
                          </div>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>For Diabetics:</div>
                            <div className={styles.drinkFlipCardBackText}>{DRINK_INFO[drink.id].diabeticAdvice}</div>
                          </div>
                          <div className={styles.drinkFlipCardBackSection}>
                            <div className={styles.drinkFlipCardBackTitle}>Insulin Impact:</div>
                            <div className={styles.drinkFlipCardBackText}>{DRINK_INFO[drink.id].insulinImpact}</div>
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
                  href={`/menu/${category}/${drink.id}`}
                  className={styles.customizeLink}
                  onClick={e => { e.preventDefault(); router.push(`/menu/${category}/${drink.id}`); }}
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
