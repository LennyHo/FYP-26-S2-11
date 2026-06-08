"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from './Header';
import styles from './MenuCategory.module.css';
import { getMenuItems } from '../utils/dripteaApi';

type Beverage = {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  description: string;
};

export default function MenuCategory() {
  const params = useParams();
  const router = useRouter();

  const categorySlug = params.category as string;
  const categoryName = categorySlug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const [beverages, setBeverages] = useState<Beverage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function fetchMenu() {
      try {
        const result = await getMenuItems('active');
        if (!result.ok) throw new Error('Failed to load menu.');
        const filtered = (result.data as Beverage[]).filter(
          b => b.category.toLowerCase() === categoryName.toLowerCase()
        );
        setBeverages(filtered);
      } catch {
        setErrorMessage('Unable to load the menu right now. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchMenu();
  }, [categoryName]);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <section className={styles.section}>
          <button onClick={() => router.back()} className={styles.backAction}>
            ← Back to Categories
          </button>

          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>DripTea Collection</p>
            <h2 className={styles.categoryTitle}>{categoryName}</h2>
          </div>

          {isLoading ? (
            <p className={styles.statusText}>Loading menu...</p>
          ) : errorMessage ? (
            <p role="alert" className={styles.errorText}>{errorMessage}</p>
          ) : (
            <div className={styles.cardGrid}>
              {beverages.length === 0 ? (
                <p className={styles.emptyText}>No drinks found for this category.</p>
              ) : (
                beverages.map((drink) => (
                  <article key={drink.id} className={styles.beverageCard}>
                    <div className={styles.cardTop}>
                      <span className={styles.priceTag}>S$ {drink.price.toFixed(2)}</span>
                    </div>

                    <div className={styles.imageWrapper}>
                      <img src={drink.image} alt={drink.name} className={styles.beverageImage} />
                    </div>

                    <div className={styles.beverageInfo}>
                      <h3>{drink.name}</h3>
                      <p>{drink.description}</p>
                    </div>

                    <button
                      type="button"
                      className={styles.addButton}
                      onClick={() => router.push(`/menu/${categorySlug}/${drink.id}`)}
                    >
                      Customize & Add
                    </button>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
