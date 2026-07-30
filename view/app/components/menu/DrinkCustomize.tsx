"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../layout/Header';
import styles from './DrinkCustomize.module.css';
import { addCartItem, updateCartItem, getCartItem, getMenuItems } from '../../utils/customerApi';
import { formatLocalCartLine, getDripTeaApiBase, getStoredUser } from '../../utils/api.base';

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
  { label: 'Normal Sweet', pct: '100% Sugar', multiplier: 1.0 },
  { label: 'Less Sweet', pct: '50% Sugar', multiplier: 0.5 },
  { label: 'Slightly Sweet', pct: '25% Sugar', multiplier: 0.25 },
  { label: 'No Additional Sugar', pct: '0% Sugar', multiplier: 0 },
];

const toppingOptions = [
  { key: 'none', name: 'No Topping', price: 0, sugarG: 0, calories: 0 },
  { key: 'pearls', name: 'Tapioca Pearls', price: 1.20, sugarG: 15, calories: 150 },
  { key: 'brownsugar', name: 'Brown Sugar', price: 1.00, sugarG: 12, calories: 70 },
  { key: 'cheese', name: 'Cheese Foam', price: 1.50, sugarG: 8, calories: 120 },
];

const nutriGradeImage: Record<string, string> = {
  A: '/grade_nutri_a_full.png',
  B: '/grade_nutri_b_full.png',
  C: '/grade_nutri_c_full.png',
  D: '/grade_nutri_d_full.png',
};

function toDrinkSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// User Story #17 As a customer, I want to edit beverages in my cart so that I can modify my order before completing the checkout process.
type DrinkCustomizeProps = {
  mode?: "add" | "edit";
};

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isValidRouteId(value?: string): value is string {
  return Boolean(value && value !== "undefined" && value !== "null");
}

export default function DrinkCustomize({ mode = "add" }: DrinkCustomizeProps) {
  const params = useParams();
  const router = useRouter();

  const drinkId = getRouteParam(params.drinkId);
  const cartItemId = getRouteParam(params.cartItemId);
  const isEditMode = mode === "edit";
  const [drink, setDrink] = useState<DrinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState(sizes[0]);
  const [ice, setIce] = useState(iceOptions[0]);
  const [sweetness, setSweetness] = useState(sweetnessOptions[0]);
  const [topping, setTopping] = useState(toppingOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [imageSrc, setImageSrc] = useState('');

  // Adding to cart (and editing a cart item) requires a logged-in customer — no guest cart.
  useEffect(() => {
    if (!getStoredUser()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    setLoading(true);

    async function loadDrinkAndCartItem() {
      try {
        let targetDrinkId = drinkId || "";

        if (isEditMode && !isValidRouteId(cartItemId)) {
          console.warn("[DrinkCustomize] Missing cart item id for edit route.");
          router.replace("/cart");
          return;
        }

        if (isEditMode && cartItemId) {
          const cartResponse = await getCartItem(cartItemId);

          if (cartResponse.ok && cartResponse.data) {
            const cartItem = cartResponse.data;

            targetDrinkId =
              cartItem.menuItemCode ||
              String(cartItem.menuItemId || "");

            setQuantity(cartItem.quantity || 1);

            const selectedSize = sizes.find(
              (s) => s.label === cartItem.customization?.size
            );
            if (selectedSize) setSize(selectedSize);

            if (cartItem.customization?.ice) {
              setIce(cartItem.customization.ice as string);
            }

            const selectedSweetness = sweetnessOptions.find(
              (s) => s.label === cartItem.customization?.sugar
            );
            if (selectedSweetness) setSweetness(selectedSweetness);

            const toppingName = Array.isArray(cartItem.customization?.toppings)
              ? cartItem.customization.toppings[0]
              : null;

            const selectedTopping = toppingOptions.find(
              (t) => t.name === toppingName
            );
            if (selectedTopping) setTopping(selectedTopping);
          }
        }

        const menuResponse = await getMenuItems("active");

        if (menuResponse.ok && Array.isArray(menuResponse.data)) {
          const item = (menuResponse.data as any[]).find(
            (d: any) =>
              d.id === targetDrinkId ||
              d.mongoId === targetDrinkId ||
              toDrinkSlug(d.name) === targetDrinkId
          );

          if (item) {
            setDrink({
              id: item.id,
              name: item.name,
              image: item.image,
              category: item.category,
              price: item.price,
              description: item.description,
              nutriGrade: item.nutri_grade || "B",
              sugarG: item.base_sugar_g ?? 0,
              calories: item.base_calories ?? 0,
            });

            setImageSrc(item.image || "");
          }
        }
      } catch (error) {
        console.error("[DrinkCustomize] Failed to load drink:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDrinkAndCartItem();
  }, [drinkId, cartItemId, isEditMode, router]);

  // Pre-fill form from chat customization
  useEffect(() => {
    if (isEditMode) return;
  const customizationData = sessionStorage.getItem('chatCustomization');

    if (customizationData) {
      try {
        const data = JSON.parse(customizationData);
        if (data.drinkId === drinkId) {
          const sizeObj = sizes.find(s => s.label === data.size);
          if (sizeObj) setSize(sizeObj);
          setIce(data.ice);
          const sweetnessObj = sweetnessOptions.find(s => s.label === data.sugar);
          if (sweetnessObj) setSweetness(sweetnessObj);
          sessionStorage.removeItem('chatCustomization');
        }
      } catch (e) {}
    }
  }, [drinkId, isEditMode]);

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

  // done by "HDC" - keep the old local cart for UI display, and sync to backend for MongoDB testing.
  async function handleAddToCart() {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    const existingData = localStorage.getItem("dripTeaCartData") || "";
    const toppingLabel = topping.key === 'none' ? '' : `, ${topping.name}`;
    // done by "HDC" - include quantity and image for backend-backed cart/payment display.
    const details = `Qty ${quantity} | ${size.label} | ${ice} | ${sweetness.label}${toppingLabel}`;
    const backendCartItem = formatLocalCartLine({ name: selectedDrink.name, details, price: totalPrice, imageSrc: selectedDrink.image });
    const updated = existingData ? `${existingData}\n${backendCartItem}` : backendCartItem;
    // end done by "HDC"
    localStorage.setItem("dripTeaCartData", updated);
    window.dispatchEvent(new Event('cartUpdated'));
    logLocalCartSave(updated);

    // done by "HDC" - write logged-in customer cart items to MongoDB cart_items.
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
          sugar: sweetness.pct,
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
  function saveCartItemForSelectedDrinkAsync(currentUser: { id: string }) {
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
        sugar: sweetness.pct,
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
  }

  // CHANGED: Now handles navigation immediately, no waiting for backend
  async function handleAddToCartAndReturnToMenu() {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    try {
      // CHANGED: Use async version that doesn't wait for backend
      saveCartItemForSelectedDrinkAsync(currentUser);
      setAddedToCart(true);
      router.push('/buy-driptea');
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

  // User Story #17: Edit cart items
  async function handleUpdateCartItem() {
    try {
      if (!isValidRouteId(cartItemId)) {
        alert("Cart item ID is missing.");
        router.push("/cart");
        return;
      }

      const validCartItemId = cartItemId;

      await updateCartItem(validCartItemId, {
        quantity,
        unitPrice: selectedDrink.price + size.surcharge + topping.price,
        lineTotal: totalPrice,
        customization: {
          size: size.label,
          ice,
          sugar: sweetness.pct,
          sugarPercent: sweetness.pct,
          toppings: topping.key === "none" ? [] : [topping.name],
          nutritionInfo: {
            sugarG: totalSugarG,
            calories: totalCalories,
            nutriGrade: selectedDrink.nutriGrade,
          },
        },
      });

      window.dispatchEvent(new Event("cartUpdated"));
      router.push("/cart");
    } catch (error) {
      console.error("[DripTea cart update]", error);
      alert("Unable to update this drink. Please try again.");
    }
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>

        {/* Hero: full-width image with back button overlay */}
        <div className={styles.heroSection}>
          <img
            src={imageSrc || '/buy_dripTea_cover.jpg'}
            alt={selectedDrink.name}
            className={styles.heroImage}
            onError={() => {
              if (imageSrc !== '/buy_dripTea_cover.jpg') {
                setImageSrc('/buy_dripTea_cover.jpg');
              }
            }}
          />
          <div className={styles.heroOverlay} />
          <div className={styles.heroBackBtnWrap}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => isEditMode ? router.push('/cart') : router.back()}
            >
              <span className={styles.backBtnArrow}>‹</span>
              {isEditMode ? "Back to Cart" : "Back to Category"}
            </button>
          </div>
        </div>

        {/* Drink info below hero */}
        <div className={styles.info}>
          <h1 className={styles.drinkName}>{selectedDrink.name}</h1>
          <p className={styles.drinkDesc}>{selectedDrink.description}</p>
          <div className={styles.infoMeta}>
            <div className={styles.nutriRow}>
              <span className={styles.nutriDetail}>Sugar: {totalSugarG}g</span>
              <span className={styles.nutriDetail}>{totalCalories} kcal</span>
            </div>
            {nutriGradeImage[selectedDrink.nutriGrade] && (
              <Image
                src={nutriGradeImage[selectedDrink.nutriGrade]}
                alt={`Nutri-Grade ${selectedDrink.nutriGrade}`}
                width={160}
                height={80}
                className={styles.nutriGradeImg}
                style={{ width: 'auto', height: '72px' }}
              />
            )}
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
                <span className={styles.surcharge}>+S$ {s.surcharge.toFixed(2)}</span>
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
                <span className={styles.surcharge}>+S$ {opt.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer — sits in flow directly below Toppings */}
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
              onClick={isEditMode ? handleUpdateCartItem : handleAddToCartAndReturnToMenu}
            >
              {isEditMode ? "UPDATE" : addedToCart ? "✓ ADDED!" : "ADD TO CART"}
            </button>
            {!isEditMode && (
            <button type="button" className={styles.placeOrderBtn} onClick={handlePlaceOrderWithCartSave}>
              BUY NOW
            </button>
            )}
          </div>
          <p className={styles.pageDisclaimer}>
            Nutritional information is for general reference only and is not medical advice. Consume at your own risk.
          </p>
        </div>
      </main>
    </div>
  );
}
