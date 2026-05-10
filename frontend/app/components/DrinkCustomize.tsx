"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from './Header';
import styles from './DrinkCustomize.module.css';

const menuData = [
  { id: "b001", name: "Classic Milk Tea", image: "/images/b001.jpeg", category: "Milk Tea", price: 4.50, description: "Our signature premium black tea blended with rich milk.", nutriGrade: "B", sugarG: 8, calories: 150 },
  { id: "b002", name: "Jasmine Green Tea", image: "/images/b002.jpeg", category: "Milk Tea", price: 4.20, description: "Light and refreshing jasmine green tea with subtle floral aroma.", nutriGrade: "A", sugarG: 4, calories: 90 },
  { id: "b003", name: "Oolong Milk Tea", image: "/images/b003.jpeg", category: "Milk Tea", price: 4.80, description: "Smooth oolong tea with a roasted aroma blended with milk.", nutriGrade: "B", sugarG: 8, calories: 160 },
  { id: "b004", name: "Osmanthus Milk Tea", image: "/images/b004.jpeg", category: "Milk Tea", price: 5.00, description: "Fragrant osmanthus-infused milk tea with a floral finish.", nutriGrade: "B", sugarG: 10, calories: 170 },
  { id: "b005", name: "Da Hong Bao Milk Tea", image: "/images/b005.jpeg", category: "Milk Tea", price: 5.20, description: "Premium Da Hong Bao oolong tea with deep, complex flavor.", nutriGrade: "B", sugarG: 8, calories: 155 },
  { id: "b006", name: "Matcha Latte", image: "/images/b006.jpeg", category: "Matcha Teas", price: 5.50, description: "Ceremonial grade Uji matcha layered with fresh milk.", nutriGrade: "B", sugarG: 10, calories: 180 },
  { id: "b007", name: "Strawberry Matcha Tea", image: "/images/b007.jpeg", category: "Matcha Teas", price: 6.00, description: "Fresh strawberry puree layered with premium matcha.", nutriGrade: "B", sugarG: 12, calories: 200 },
  { id: "b008", name: "Cranberry Matcha Tea", image: "/images/b008.jpeg", category: "Matcha Teas", price: 6.00, description: "Tangy cranberry paired with smooth matcha.", nutriGrade: "B", sugarG: 10, calories: 190 },
  { id: "b009", name: "Jasmine Matcha Tea", image: "/images/b009.jpeg", category: "Matcha Teas", price: 5.80, description: "Floral jasmine tea blended with rich matcha.", nutriGrade: "A", sugarG: 6, calories: 140 },
  { id: "b010", name: "Double Chocolate Frappe", image: "/images/b010.jpeg", category: "Ice Blended", price: 6.50, description: "Rich dark chocolate blended with ice and milk.", nutriGrade: "C", sugarG: 20, calories: 280 },
  { id: "b012", name: "Taro Slush", image: "/images/b012.jpeg", category: "Ice Blended", price: 6.00, description: "Creamy taro blended into a refreshing slush.", nutriGrade: "B", sugarG: 14, calories: 210 },
  { id: "b011", name: "Milo Dinosaur", image: "/images/b011.jpeg", category: "Local Favourites", price: 5.00, description: "Classic iced Milo topped with a mountain of Milo powder.", nutriGrade: "C", sugarG: 18, calories: 250 },
];

const sizes = [
  { label: 'Regular', surcharge: 0 },
  { label: 'Large', surcharge: 1.50 },
];

const iceOptions = ['Normal Ice', 'Less Ice', 'No Ice', 'Hot'];

const sweetnessOptions = [
  { label: 'Normal Sweet', pct: '100%', multiplier: 1.0 },
  { label: 'Less Sweet', pct: '50%', multiplier: 0.5 },
  { label: 'Slightly Sweet', pct: '25%', multiplier: 0.25 },
  { label: 'No Additional Sugar', pct: '0%', multiplier: 0 },
];

const toppingOptions = [
  { key: 'none', name: 'No Topping', price: 0, sugarG: 0, calories: 0 },
  { key: 'pearls', name: 'Tapioca Pearls', price: 1.20, sugarG: 15, calories: 150 },
  { key: 'aloe', name: 'Aloe Vera', price: 1.00, sugarG: 5, calories: 30 },
  { key: 'cheese', name: 'Cheese Foam', price: 1.50, sugarG: 8, calories: 120 },
];

const nutriGradeColor: Record<string, string> = {
  A: '#2e7d32',
  B: '#1565c0',
  C: '#e65100',
  D: '#b71c1c',
};

export default function DrinkCustomize() {
  const params = useParams();
  const router = useRouter();

  const drinkId = params.drinkId as string;
  const drink = menuData.find(d => d.id === drinkId);

  const [size, setSize] = useState(sizes[0]);
  const [ice, setIce] = useState(iceOptions[0]);
  const [sweetness, setSweetness] = useState(sweetnessOptions[0]);
  const [topping, setTopping] = useState(toppingOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  if (!drink) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <p style={{ padding: 32 }}>Drink not found.</p>
          <button onClick={() => router.back()} className={styles.backBtn}>← Go Back</button>
        </main>
      </div>
    );
  }

  // Live calculations
  const totalSugarG = Math.round(drink.sugarG * sweetness.multiplier) + topping.sugarG;
  const totalCalories = drink.calories + topping.calories;
  const totalPrice = (drink.price + size.surcharge + topping.price) * quantity;

  function handleAddToCart() {
    const existingData = localStorage.getItem("dripTeaCartData") || "";
    const toppingLabel = topping.key === 'none' ? '' : `, ${topping.name}`;
    const newItem = `${drink.name} (${size.label}, ${ice}, ${sweetness.label}${toppingLabel})|${size.label} · ${ice} · ${sweetness.label}${toppingLabel}|S$ ${totalPrice.toFixed(2)}`;
    const updated = existingData ? `${existingData}\n${newItem}` : newItem;
    localStorage.setItem("dripTeaCartData", updated);
    window.dispatchEvent(new Event('cartUpdated'));
    // Show confirmation without navigating away
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  function handlePlaceOrder() {
    handleAddToCart();
    router.push('/checkout');
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>

        {/* Top: image left, info right */}
        <div className={styles.topSection}>
          <div className={styles.imageWrapper}>
            <img src={drink.image} alt={drink.name} className={styles.drinkImage} />
          </div>

          <div className={styles.info}>
            <button className={styles.backBtn} onClick={() => router.back()}>
              ← Back to Category
            </button>
            <h1 className={styles.drinkName}>{drink.name}</h1>
            <p className={styles.drinkDesc}>{drink.description}</p>

            {/* Live nutri info */}
            <div className={styles.nutriRow}>
              <span
                className={styles.nutriBadge}
                style={{ background: nutriGradeColor[drink.nutriGrade] ?? '#555' }}
              >
                {drink.nutriGrade}
              </span>
              <span className={styles.nutriDetail}>Sugar: {totalSugarG}g</span>
              <span className={styles.nutriDetail}>{totalCalories} kcal</span>
            </div>
          </div>
        </div>

        {/* Size */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Size</h2>
          <div className={styles.optionGrid}>
            {sizes.map(s => (
              <button
                key={s.label}
                className={`${styles.optionBtn} ${size.label === s.label ? styles.selected : ''}`}
                onClick={() => setSize(s)}
              >
                {s.label}
                {s.surcharge > 0 && <span className={styles.surcharge}>+S$ {s.surcharge.toFixed(2)}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Ice Level */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Ice Level</h2>
          <div className={styles.optionGrid}>
            {iceOptions.map(opt => (
              <button
                key={opt}
                className={`${styles.optionBtn} ${ice === opt ? styles.selected : ''}`}
                onClick={() => setIce(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Sweetness */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Sweetness Level</h2>
          <div className={styles.optionGrid}>
            {sweetnessOptions.map(opt => (
              <button
                key={opt.label}
                className={`${styles.optionBtn} ${sweetness.label === opt.label ? styles.selected : ''}`}
                onClick={() => setSweetness(opt)}
              >
                {opt.label}
                <span className={styles.surcharge}>{opt.pct}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toppings */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Toppings</h2>
          <div className={styles.optionGrid}>
            {toppingOptions.map(opt => (
              <button
                key={opt.key}
                className={`${styles.optionBtn} ${topping.key === opt.key ? styles.selected : ''}`}
                onClick={() => setTopping(opt)}
              >
                {opt.name}
                {opt.price > 0 && <span className={styles.surcharge}>+S$ {opt.price.toFixed(2)}</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 110 }} />
      </main>

      {/* Sticky footer — constrained to same width as main content */}
      <div className={styles.footerOuter}>
        <div className={styles.footer}>
          <div className={styles.footerTop}>
            <span className={styles.totalPrice}>S$ {totalPrice.toFixed(2)}</span>
            <div className={styles.quantityRow}>
              <button className={styles.qtyBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button className={styles.qtyBtn} onClick={() => setQuantity(q => q + 1)}>+</button>
            </div>
          </div>
          <div className={styles.actionRow}>
            <button
              className={`${styles.addToCartBtn} ${addedToCart ? styles.addedConfirm : ''}`}
              onClick={handleAddToCart}
            >
              {addedToCart ? '✓ ADDED!' : 'ADD TO CART'}
            </button>
            <button className={styles.placeOrderBtn} onClick={handlePlaceOrder}>
              PLACE THE ORDER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
