"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from './Header';
import styles from './DrinkCustomize.module.css';
// done by "HDC" - sends Add to Cart actions to backend cart_items for logged-in users.
import { addCartItem, formatLocalCartLine, getDripTeaApiBase, getStoredUser } from '../utils/dripteaApi';
// end done by "HDC"

interface DrinkData {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  description: string;
  nutriGrade: string;
  sugarG: number;
  calories: number;
}

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

const nutriGradeClass: Record<string, string> = {
  A: styles.gradeA,
  B: styles.gradeB,
  C: styles.gradeC,
  D: styles.gradeD,
};

function toDrinkSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function DrinkCustomize() {
  const params = useParams();
  const router = useRouter();

  const drinkId = params.drinkId as string;

  const [drink, setDrink] = useState<DrinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState(sizes[0]);
  const [ice, setIce] = useState(iceOptions[0]);
  const [sweetness, setSweetness] = useState(sweetnessOptions[0]);
  const [topping, setTopping] = useState(toppingOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [imageSrc, setImageSrc] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${getDripTeaApiBase()}/api/menu-items`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.data)) {
          const item = data.data.find(
            (d: any) => d.id === drinkId || toDrinkSlug(d.name) === drinkId
          );
          if (item) {
            setDrink({
              id: item.id,
              name: item.name,
              image: item.image,
              category: item.category,
              price: item.price,
              description: item.description,
              nutriGrade: item.nutri_grade || 'B',
              sugarG: item.base_sugar_g ?? 0,
              calories: item.base_calories ?? 0,
            });
            setImageSrc(item.image || '');
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [drinkId]);

  // Pre-fill form from chat customization
  useEffect(() => {
    const customizationData = sessionStorage.getItem('chatCustomization');
    if (customizationData) {
      try {
        const data = JSON.parse(customizationData);
        // Only pre-fill if it matches the current drink
        if (data.drinkId === drinkId) {
          // Find and set size
          const sizeObj = sizes.find(s => s.label === data.size);
          if (sizeObj) setSize(sizeObj);
          // Set ice
          setIce(data.ice);
          // Find and set sweetness
          const sweetnessObj = sweetnessOptions.find(s => s.label === data.sugar);
          if (sweetnessObj) setSweetness(sweetnessObj);
          // Clear the stored data after using it
          sessionStorage.removeItem('chatCustomization');
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, [drinkId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <p className={styles.emptyState}>Loading…</p>
        </main>
      </div>
    );
  }

  if (!drink) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <p className={styles.emptyState}>Drink not found.</p>
          <button onClick={() => router.back()} className={styles.backBtn}>← Go Back</button>
        </main>
      </div>
    );
  }

  const selectedDrink = drink;

  // Live calculations
  const totalSugarG = Math.round(selectedDrink.sugarG * sweetness.multiplier) + topping.sugarG;
  const totalCalories = selectedDrink.calories + topping.calories;
  const totalPrice = (selectedDrink.price + size.surcharge + topping.price) * quantity;
  type AddCartItemResult = Awaited<ReturnType<typeof addCartItem>>;

  function logLocalCartSave(updatedCartData: string) {
    console.info(
      `[DripTea cart save] LOCAL_COPY savedTo=localStorage key=dripTeaCartData itemCount=${updatedCartData.split('\n').filter(Boolean).length} item="${selectedDrink.name}"`
    );
  }

  function logBackendCartSave(response: AddCartItemResult) {
    const storageType = response.storage?.type || 'mongodb';
    const database = response.storage?.database || '(database not reported)';
    const collection = response.storage?.collection || 'cart_items';
    const mongoHost = response.storage?.mongoHost || '(MongoDB host not reported)';
    const backend = response.backend?.renderExternalUrl || response.backend?.url || getDripTeaApiBase();

    console.info(
      `[DripTea cart save] BACKEND_SAVED backend=${backend} mongoHost=${mongoHost} savedTo=${storageType}:${database}.${collection} cartItemId=${response.data?.id || '(not reported)'} item="${response.data?.name || selectedDrink.name}"`
    );
  }

  function logBackendCartSkipped() {
    console.info(
      `[DripTea cart save] BACKEND_SKIPPED reason="No logged-in user found in localStorage" configuredBackend=${getDripTeaApiBase()} savedOnlyTo=localStorage:dripTeaCartData`
    );
  }

  // done by "HDC" - keep the old local cart for UI display, and sync to backend for MongoDB testing.
  async function handleAddToCart() {
    const existingData = localStorage.getItem("dripTeaCartData") || "";
    const toppingLabel = topping.key === 'none' ? '' : `, ${topping.name}`;
    const newItem = `${selectedDrink.name} (${size.label}, ${ice}, ${sweetness.label}${toppingLabel})|${size.label} · ${ice} · ${sweetness.label}${toppingLabel}|S$ ${totalPrice.toFixed(2)}`;
    // done by "HDC" - include quantity and image for backend-backed cart/payment display.
    const details = `Qty ${quantity} | ${size.label} | ${ice} | ${sweetness.label}${toppingLabel}`;
    // const backendCartItem = `${selectedDrink.name} (${details})|${details}|S$ ${totalPrice.toFixed(2)}|${selectedDrink.image}`;
    const backendCartItem = formatLocalCartLine({ name: selectedDrink.name, details, price: totalPrice, imageSrc: selectedDrink.image });
    const updated = existingData ? `${existingData}\n${backendCartItem}` : backendCartItem;
    // end done by "HDC"
    localStorage.setItem("dripTeaCartData", updated);
    window.dispatchEvent(new Event('cartUpdated'));
    logLocalCartSave(updated);

    // done by "HDC" - write logged-in customer cart items to MongoDB cart_items.
    const currentUser = getStoredUser();
    if (currentUser) {
      try {
        const response = await addCartItem({
          userId: currentUser.id,
          menuItemId: selectedDrink.id,
          name: selectedDrink.name,
          image: selectedDrink.image,
          category: selectedDrink.category,
          quantity,
          unitPrice: selectedDrink.price + size.surcharge + topping.price,
          lineTotal: totalPrice,
          customization: {
            size: size.label,
            ice,
            sugar: sweetness.label,
            sugarPercent: sweetness.pct,
            toppings: topping.key === 'none' ? [] : [topping.name],
            nutritionInfo: {
              sugarG: totalSugarG,
              calories: totalCalories,
              nutriGrade: selectedDrink.nutriGrade,
            },
          },
        });
        logBackendCartSave(response);
      } catch (error) {
        console.error('[DripTea cart sync]', error);
        throw error;
      }
    } else {
      logBackendCartSkipped();
    }
    // end done by "HDC"

    // Show confirmation without navigating away
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  // done by "HDC" - wait for backend cart insert before moving to payment page.
  async function handlePlaceOrder() {
    await handleAddToCart();
    router.push('/checkout');
  }
  // end done by "HDC"

  // CHANGED: Optimized save flow - fire-and-forget backend, immediate UI response
  // This function updates local storage immediately and syncs to backend in background
  function saveCartItemForSelectedDrinkAsync() {
    const toppingLabel = topping.key === 'none' ? '' : `, ${topping.name}`;
    const details = `Qty ${quantity} | ${size.label} | ${ice} | ${sweetness.label}${toppingLabel}`;
    const backendCartItem = formatLocalCartLine({ name: selectedDrink.name, details, price: totalPrice, imageSrc: selectedDrink.image });
    
    // CHANGED: Save to localStorage immediately (fast, synchronous)
    const existingData = localStorage.getItem("dripTeaCartData") || "";
    const updated = existingData ? `${existingData}\n${backendCartItem}` : backendCartItem;
    localStorage.setItem("dripTeaCartData", updated);
    window.dispatchEvent(new Event('cartUpdated'));
    logLocalCartSave(updated);

    // CHANGED: Fire backend sync in background without waiting (improves UI responsiveness)
    const currentUser = getStoredUser();
    if (currentUser) {
      // Use Promise without await - don't wait for backend
      addCartItem({
        userId: currentUser.id,
        menuItemId: selectedDrink.id,
        name: selectedDrink.name,
        image: selectedDrink.image,
        category: selectedDrink.category,
        quantity,
        unitPrice: selectedDrink.price + size.surcharge + topping.price,
        lineTotal: totalPrice,
        customization: {
          size: size.label,
          ice,
          sugar: sweetness.label,
          sugarPercent: sweetness.pct,
          toppings: topping.key === 'none' ? [] : [topping.name],
          nutritionInfo: {
            sugarG: totalSugarG,
            calories: totalCalories,
            nutriGrade: selectedDrink.nutriGrade,
          },
        },
      })
        .then(response => {
          logBackendCartSave(response);
        })
        .catch(error => {
          console.error('[DripTea cart sync background]', error);
          // Silent fail - local cart still saved
        });
    } else {
      logBackendCartSkipped();
    }
  }

  // CHANGED: Now handles navigation to home page immediately, no waiting for backend
  async function handleAddToCartAndReturnToMenu() {
    try {
      // CHANGED: Use async version that doesn't wait for backend
      saveCartItemForSelectedDrinkAsync();
      setAddedToCart(true);
      // CHANGED: Navigate to home page instead of menu category
      router.push('/');
    } catch (error) {
      console.error('[DripTea cart add]', error);
      alert('Unable to add this drink to cart. Please try again.');
    }
  }

  // CHANGED: Keep old version for checkout (needs to wait for backend before payment)
  async function handlePlaceOrderWithCartSave() {
    try {
      await handlePlaceOrder();
    } catch (error) {
      console.error('[DripTea place order]', error);
      alert('Unable to prepare checkout. Please try again.');
    }
  }
  // end done by "HDC"

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>

        {/* Top: image left, info right */}
        <div className={styles.topSection}>
          <div className={styles.imageWrapper}>
            <img
              src={imageSrc || '/buy_dripTea_cover.jpg'}
              alt={selectedDrink.name}
              className={styles.drinkImage}
              onError={() => {
                if (imageSrc !== '/buy_dripTea_cover.jpg') {
                  setImageSrc('/buy_dripTea_cover.jpg');
                }
              }}
            />
          </div>

          <div className={styles.info}>
            <button type="button" className={styles.backBtn} onClick={() => router.push('/buy-driptea')}>
              <span className={styles.backBtnArrow}>‹</span>
              Back to Category
            </button>
            <h1 className={styles.drinkName}>{selectedDrink.name}</h1>
            <p className={styles.drinkDesc}>{selectedDrink.description}</p>

            {/* Live nutri info */}
            <div className={styles.nutriRow}>
              <span
                className={`${styles.nutriBadge} ${nutriGradeClass[selectedDrink.nutriGrade] || ''}`}
              >
                {selectedDrink.nutriGrade}
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
                type="button"
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
                type="button"
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
                type="button"
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
                type="button"
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

        <div className={styles.bottomSpacer} />
      </main>

      {/* Sticky footer — constrained to same width as main content */}
      <div className={styles.footerOuter}>
        <div className={styles.footer}>
          <div className={styles.footerTop}>
            <span className={styles.totalPrice}>S$ {totalPrice.toFixed(2)}</span>
            <div className={styles.quantityRow}>
              <button type="button" className={styles.qtyBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button type="button" className={styles.qtyBtn} onClick={() => setQuantity(q => q + 1)}>+</button>
            </div>
          </div>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={`${styles.addToCartBtn} ${addedToCart ? styles.addedConfirm : ''}`}
              onClick={handleAddToCartAndReturnToMenu}
            >
              {addedToCart ? '✓ ADDED!' : 'ADD TO CART'}
            </button>
            <button type="button" className={styles.placeOrderBtn} onClick={handlePlaceOrderWithCartSave}>
              BUY NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
