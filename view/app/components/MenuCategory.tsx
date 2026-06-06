"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from './Header';
import styles from './MenuCategory.module.css';

const menuData = [
  { id: "b001", name: "Classic Milk Tea", image: "/img/b001.jpeg", category: "Milk Tea", price: 4.50, description: "Our signature premium black tea blended with rich milk." },
  { id: "b002", name: "Jasmine Green Tea", image: "/img/b002.jpeg", category: "Milk Tea", price: 4.20, description: "Light and refreshing jasmine green tea with subtle floral aroma." },
  { id: "b003", name: "Oolong Milk Tea", image: "/img/b003.jpeg", category: "Milk Tea", price: 4.80, description: "Smooth oolong tea with a roasted aroma blended with milk." },
  { id: "b004", name: "Osmanthus Milk Tea", image: "/img/b004.jpeg", category: "Milk Tea", price: 5.00, description: "Fragrant osmanthus-infused milk tea with a floral finish." },
  { id: "b005", name: "Da Hong Bao Milk Tea", image: "/img/b005.jpeg", category: "Milk Tea", price: 5.20, description: "Premium Da Hong Bao oolong tea with deep, complex flavor." },
  { id: "b006", name: "Matcha Latte", image: "/img/b006.jpeg", category: "Matcha Teas", price: 5.50, description: "Ceremonial grade Uji matcha layered with fresh milk." },
  { id: "b007", name: "Strawberry Matcha Tea", image: "/img/b007.jpeg", category: "Matcha Teas", price: 6.00, description: "Fresh strawberry puree layered with premium matcha." },
  { id: "b008", name: "Cranberry Matcha Tea", image: "/img/b008.jpeg", category: "Matcha Teas", price: 6.00, description: "Tangy cranberry paired with smooth matcha." },
  { id: "b009", name: "Jasmine Matcha Tea", image: "/img/b009.jpeg", category: "Matcha Teas", price: 5.80, description: "Floral jasmine tea blended with rich matcha." },
  { id: "b010", name: "Double Chocolate Frappe", image: "/img/b010.jpeg", category: "Ice Blended", price: 6.50, description: "Rich dark chocolate blended with ice and milk." },
  { id: "b012", name: "Taro Slush", image: "/img/b012.jpeg", category: "Ice Blended", price: 6.00, description: "Creamy taro blended into a refreshing slush." },
  { id: "b011", name: "Milo Dinosaur", image: "/img/b011.jpeg", category: "Local Favourites", price: 5.00, description: "Classic iced Milo topped with a mountain of Milo powder." },
];

export default function MenuCategory() {
  const params = useParams();
  const router = useRouter();

  const categorySlug = params.category as string;
  const categoryName = categorySlug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const filteredBeverages = menuData.filter(
    b => b.category.toLowerCase() === categoryName.toLowerCase()
  );

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

          <div className={styles.cardGrid}>
            {filteredBeverages.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No drinks found for this category.</p>
            ) : (
              filteredBeverages.map((drink) => (
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
                    className={styles.addButton}
                    onClick={() => router.push(`/menu/${categorySlug}/${drink.id}`)}
                  >
                    Customize & Add
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
