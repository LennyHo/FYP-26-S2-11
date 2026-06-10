"use client";

import React, { useEffect } from 'react';
import styles from './KeywordInfo.module.css';

export type KeywordEntry = {
  title: string;
  emoji: string;
  description: string;
  details: { label: string; value: string }[];
};

export const keywordDatabase: Record<string, KeywordEntry> = {
  boba: {
    title: 'Boba (Tapioca Pearl)',
    emoji: '⚫',
    description:
      'Boba is another name for tapioca pearls — the chewy black balls in bubble tea. Made from tapioca starch and cooked in brown sugar syrup for their signature QQ texture.',
    details: [
      { label: 'Main Ingredient', value: 'Tapioca starch (cassava root)' },
      { label: 'Calories', value: '~150 kcal / serving' },
      { label: 'Carbohydrates', value: '~37g' },
      { label: 'Fat', value: '0g' },
      { label: 'Protein', value: '0g' },
      { label: 'Texture', value: 'Soft and chewy (QQ)' },
    ],
  },
  cassava: {
    title: 'Cassava Root',
    emoji: '🌿',
    description:
      'Cassava (Manihot esculenta) is a starchy root vegetable grown in tropical regions. It is the plant source of tapioca starch, which is used to make the chewy boba pearls in bubble tea.',
    details: [
      { label: 'Scientific name', value: 'Manihot esculenta' },
      { label: 'Origin', value: 'South America, widely grown in Asia' },
      { label: 'Used to make', value: 'Tapioca starch, tapioca pearls' },
      { label: 'Calories (raw)', value: '~160 kcal / 100g' },
      { label: 'Carbohydrates', value: '~38g / 100g' },
      { label: 'Gluten-free', value: 'Yes' },
    ],
  },
  'cream cheese': {
    title: 'Cream Cheese',
    emoji: '🧀',
    description:
      "The base ingredient of DripTea's Cheese Foam topping. Soft cream cheese is blended with fresh milk, whipped cream, and a pinch of sea salt to create the light, creamy foam layer.",
    details: [
      { label: 'Used in', value: 'Cheese Foam topping' },
      { label: 'Calories', value: '~342 kcal / 100g' },
      { label: 'Fat', value: '~34g / 100g' },
      { label: 'Protein', value: '~6g / 100g' },
      { label: 'Carbohydrates', value: '~4g / 100g' },
      { label: 'Flavour', value: 'Mild, creamy, slightly tangy' },
    ],
  },
  'tapioca starch': {
    title: 'Tapioca Starch',
    emoji: '🟤',
    description:
      'A fine white starch extracted from the cassava root (Manihot esculenta). It is the key ingredient used to make the iconic chewy boba pearls — giving them that signature soft, stretchy QQ texture.',
    details: [
      { label: 'Source', value: 'Cassava root (Manihot esculenta)' },
      { label: 'Calories', value: '358 kcal / 100g' },
      { label: 'Carbohydrates', value: '88g / 100g' },
      { label: 'Fat', value: '~0g' },
      { label: 'Protein', value: '~0.2g / 100g' },
      { label: 'Used in', value: 'Boba pearls, thickeners, desserts' },
    ],
  },
  'cheese foam': {
    title: 'Cheese Foam',
    emoji: '🧀',
    description:
      'A light, airy topping made from cream cheese, fresh milk, and whipped cream with a pinch of sea salt. Drink through the foam first to enjoy its creamy, lightly salty flavour blending with the tea beneath.',
    details: [
      { label: 'Main Ingredients', value: 'Cream cheese, milk, cream, salt, sugar' },
      { label: 'Calories', value: '~120 kcal / serving' },
      { label: 'Carbohydrates', value: '~8g' },
      { label: 'Fat', value: '~10g' },
      { label: 'Protein', value: '~2g' },
      { label: 'Flavour Profile', value: 'Creamy, lightly salty, rich' },
    ],
  },
  pearl: {
    title: 'Tapioca Pearl (Boba)',
    emoji: '⚫',
    description:
      'Smooth, chewy spheres made from tapioca starch and cooked in brown sugar syrup. These iconic boba balls are the heart of bubble tea, delivering a satisfying QQ (chewy) bite with every sip.',
    details: [
      { label: 'Main Ingredient', value: 'Tapioca starch (cassava root)' },
      { label: 'Calories', value: '~150 kcal / serving' },
      { label: 'Carbohydrates', value: '~37g' },
      { label: 'Fat', value: '0g' },
      { label: 'Protein', value: '0g' },
      { label: 'Texture', value: 'Soft and chewy (QQ)' },
    ],
  },
  'aloe vera': {
    title: 'Aloe Vera',
    emoji: '🌿',
    description:
      'Translucent jelly cubes cut from the inner gel of aloe vera leaves. Mild in flavour and refreshing in texture, aloe vera is a popular low-calorie topping packed with natural hydration benefits.',
    details: [
      { label: 'Source', value: 'Aloe barbadensis leaf gel' },
      { label: 'Calories', value: '~30 kcal / serving' },
      { label: 'Carbohydrates', value: '~7g' },
      { label: 'Fat', value: '0g' },
      { label: 'Fibre', value: '~0.5g' },
      { label: 'Vitamins', value: 'A, C, E — naturally occurring' },
    ],
  },
};

export function KeywordModal({
  keyword,
  onClose,
}: {
  keyword: string;
  onClose: () => void;
}) {
  const entry = keywordDatabase[keyword.toLowerCase()];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!entry) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className={styles.modalHeader}>
          <span className={styles.emoji}>{entry.emoji}</span>
          <h3 className={styles.modalTitle}>{entry.title}</h3>
        </div>
        <p className={styles.modalDesc}>{entry.description}</p>
        <div className={styles.detailsTable}>
          {entry.details.map(d => (
            <div key={d.label} className={styles.detailRow}>
              <span className={styles.detailLabel}>{d.label}</span>
              <span className={styles.detailValue}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InfoButton({
  keyword,
  onOpen,
}: {
  keyword: string;
  onOpen: (k: string) => void;
}) {
  return (
    <span
      className={styles.infoBtn}
      onClick={e => {
        e.stopPropagation();
        onOpen(keyword);
      }}
      role="button"
      tabIndex={0}
      aria-label={`More info about ${keyword}`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          onOpen(keyword);
        }
      }}
    >
      ⓘ
    </span>
  );
}

export function KeywordChip({
  keyword,
  onOpen,
  children,
}: {
  keyword: string;
  onOpen: (k: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span
      className={styles.keywordChip}
      onClick={() => onOpen(keyword)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(keyword);
      }}
      aria-label={`Learn more about ${keyword}`}
    >
      {children}
      <span className={styles.chipArrow}>›</span>
    </span>
  );
}
