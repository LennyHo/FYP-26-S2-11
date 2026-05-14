"use client";
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './ChatbotSidebar.module.css';
import { drinkData, DRINK_INFO, parseDrinkFromHtml } from '../utils/chatHelpers';

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

  const drinkHtmlBlocks = msgText.split(/(<img[^>]*>[\s\S]*?<\/button>)/m).filter(Boolean);
  const drinks: DrinkRecommendation[] = [];
  const otherText: string[] = [];

  drinkHtmlBlocks.forEach(block => {
    if (block.includes('startOrder')) {
      const drink = parseDrinkFromHtml(block);
      if (drink) drinks.push(drink);
    } else {
      otherText.push(block);
    }
  });

  return (
    <div>
      {otherText.length > 0 && (
        <div className={styles.drinkRecOtherText} dangerouslySetInnerHTML={{ __html: otherText.join('').trim() }} />
      )}
      <div className={styles.drinkRecCardsWrap}>
        {drinks.map((drink, i) => {
          const drinkInfo = Object.entries(drinkData).find(([name]) => name === drink.name);
          const category = drinkInfo ? drinkInfo[1].category : 'milk-tea';
          
          return (
            <div key={`drink-${i}`}>
              <div
                className={flippedCard === drink.id ? `${styles.drinkFlipCard} ${styles.drinkFlipCardFlipped}` : styles.drinkFlipCard}
                onClick={() => setFlippedCard(flippedCard === drink.id ? null : drink.id)}
              >
                <div className={styles.drinkFlipCardInner}>
                  {/* Front */}
                  <div className={styles.drinkFlipCardFront}>
                    <img src={drink.image} alt={drink.name} className={styles.drinkFlipCardImg} />
                    <div className={styles.drinkFlipCardName}>{drink.name}</div>
                    <div className={styles.drinkFlipCardNutrition}>Grade: {drink.grade}</div>
                    <div className={styles.drinkFlipCardNutrition}>Sugar: {drink.sugar}</div>
                    <div className={styles.drinkFlipCardNutrition}>Cal: {drink.calories}</div>
                    <div className={styles.drinkFlipCardFlipHint}>Click to flip →</div>
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
                      <div className={styles.drinkFlipCardBackText}>No detailed info available. Click to flip back →</div>
                    )}
                  </div>
                </div>
              </div>

              <a
                href={`/menu/${category}/${drink.id}`}
                className={styles.customizeLink}
                onClick={(e) => { e.preventDefault(); router.push(`/menu/${category}/${drink.id}`); }}
              >
                Customize
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
