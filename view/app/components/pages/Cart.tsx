// User Story Architecture Trace — Cart.tsx
//
// #16  View Cart
//      View: cart/page.tsx → Component: Cart.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #17  Edit Cart
//      View: cart/page.tsx → Component: Cart.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCartItems, getMenuItems, deleteCartItem, updateCartItemQuantity } from "../../utils/customerApi";
import { getStoredUser, parseLocalCartLine } from "../../utils/api.base";
import Header from "../layout/Header";
import "./Cart.css";

interface DripTeaCartItem {
  id?: string;
  _id?: string;
  menuItemCode?: string;
  drinkId?: string;
  name: string;
  image?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  customization?: {
    size?: string;
    ice?: string;
    sugar?: string;
    toppings?: string[];
    lang?: string;
    nutritionInfo?: { sugarG?: number; [key: string]: unknown };
  };
}

const CART_LABELS: Record<string, Record<string, string>> = {
  ms: {
    Qty: "Bilangan",
    Regular: "Biasa",
    Large: "Besar",
    "Normal Ice": "Ais Normal",
    "Less Ice": "Kurang Ais",
    "No Ice": "Tanpa Ais",
    Hot: "Panas",
    "Normal Sweet": "Normal Manis",
    "0% Sugar": "0% Gula",
    "25% Sugar": "25% Gula",
    "50% Sugar": "50% Gula",
    "100% Sugar": "100% Gula",
    "Tapioca Pearls": "Mutiara",
    "Aloe Vera": "Aloe Vera",
    "Cheese Foam": "Busa Keju",
  },
  zh: {
    Qty: "数量",
    Regular: "中杯",
    Large: "大杯",
    "Normal Ice": "正常冰",
    "Less Ice": "少冰",
    "No Ice": "去冰",
    Hot: "热饮",
    "Normal Sweet": "正常甜",
    "0% Sugar": "0%糖",
    "25% Sugar": "25%糖",
    "50% Sugar": "50%糖",
    "100% Sugar": "100%糖",
    "Tapioca Pearls": "珍珠",
    "Aloe Vera": "芦荟",
    "Cheese Foam": "芝士泡沫",
  },
};

function tLabel(label: string, lang?: string): string {
  if (!lang || lang === "en") return label;
  return CART_LABELS[lang]?.[label] ?? label;
}

const SUGAR_MULTIPLIERS: Record<string, number> = {
  '0% Sugar': 0, '25% Sugar': 0.25, '50% Sugar': 0.5, '100% Sugar': 1.0, 'Normal Sweet': 1.0,
};
const TOPPING_SUGAR_G: Record<string, number> = { 'Tapioca Pearls': 15, 'Aloe Vera': 5, 'Cheese Foam': 8 };
const WHO_LIMIT_G = 25;
function sugarGrade(g: number): 'a' | 'b' | 'c' | 'd' {
  if (g <= 25) return 'a'; if (g <= 37) return 'b'; if (g <= 50) return 'c'; return 'd';
}
const SUGAR_NUDGE: Record<'a' | 'b' | 'c' | 'd', string> = {
  a: "You're within the recommended daily sugar limit. Great choice!",
  b: 'Slightly over the daily limit. Consider reducing your sugar level.',
  c: 'Noticeably over the daily limit. Try 25% or 50% sugar options.',
  d: 'Well above the recommended limit. Consider sugar-free drinks.',
};

interface CartItem {
  backendId?: string;
  drinkId?: string;
  name: string;
  details: string;
  price: number;
  unitPrice: number;
  imageSrc?: string;
  quantity: number;
  sugarPerUnit: number;
}

function getCartItemImage(item: CartItem) {
  if (item.drinkId) return `/img/bubble_teas/${item.drinkId}.jpg`;
  if (item.imageSrc) return item.imageSrc;
  return "/img/bubble_teas/b001.jpg";
}

function getCategorySlugByDrinkId(drinkId?: string) {
  if (["b001", "b002", "b003", "b004", "b005"].includes(drinkId || "")) return "milk-tea";
  if (["b006", "b007", "b008", "b009"].includes(drinkId || "")) return "matcha-teas";
  if (["b010", "b012"].includes(drinkId || "")) return "ice-blended";
  if (drinkId === "b011") return "local-favorites";
  return "milk-tea";
}

export default function Cart() {
  const router = useRouter();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const totalSugarG = useMemo(() => {
    if (isLoading || cartItems.length === 0) return null;
    return cartItems.reduce((sum, item) => sum + item.sugarPerUnit * item.quantity, 0);
  }, [cartItems, isLoading]);
  // #17 / #201 - Tracks which item is being deleted so the CSS fadeSlideOut animation
  // plays for that row before the API call and list refresh happen.
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Prevents the cartUpdated listener from re-fetching when the cart page
  // dispatches the event itself after a + / - optimistic update.
  const skipNextCartUpdated = useRef(false);

  async function fetchCartData() {
    setIsLoading(true);

    try {
      const user = getStoredUser();

      if (!user) {
        // Guest: show items from localStorage so the badge count matches the cart page
        const localData = localStorage.getItem("dripTeaCartData");
        if (!localData) {
          setCartItems([]);
          setTotal(0);
          return;
        }
        const guestItems = localData
          .split("\n")
          .filter((l) => l.trim())
          .map((line) => {
            const parsed = parseLocalCartLine(line);
            if (!parsed) return null;
            const qtyMatch = parsed.details.match(/(?:Qty|Bilangan|数量)\s+(\d+)/i);
            const quantity = qtyMatch ? Number(qtyMatch[1]) : 1;
            const unitPrice = quantity > 0 ? parsed.price / quantity : parsed.price;
            return {
              name: parsed.name,
              details: parsed.details,
              price: parsed.price,
              unitPrice,
              imageSrc: parsed.imageSrc,
              quantity,
              sugarPerUnit: 0,
            } satisfies CartItem;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null) as CartItem[];
        setCartItems(guestItems);
        setTotal(guestItems.reduce((sum, item) => sum + item.price, 0));
        return;
      }

      const userId = user?.id || "";
      const [cartResponse, menuResponse] = await Promise.all([
        getCartItems(userId),
        getMenuItems('active'),
      ]);
      const backendItems: DripTeaCartItem[] = cartResponse.data || [];
      const menuItems = menuResponse.data || [];
      const menuByCode = new Map(menuItems.map((m) => [m.id, m]));

      const parsedItems: CartItem[] = backendItems.map((item) => {
        const quantity = Number(item.quantity || 1);
        const lineTotal = Number(item.lineTotal || 0);
        const unitPrice = Number(item.unitPrice || lineTotal / quantity || 0);

        const lang = item.customization?.lang as string | undefined;
        const rawToppings = Array.isArray(item.customization?.toppings)
          ? item.customization.toppings as string[]
          : [];
        const toppings = rawToppings
          .map((tp) => tLabel(tp.replace(/\s*\(\+S\$[\d.]+\)/g, "").trim(), lang))
          .join(", ");

        const details = [
          `${tLabel("Qty", lang)} ${quantity}`,
          tLabel((item.customization?.size as string) || "Regular", lang),
          tLabel((item.customization?.ice as string) || "Normal Ice", lang),
          tLabel((item.customization?.sugar as string) || "Normal Sweet", lang),
          toppings,
        ]
          .filter(Boolean)
          .join(" | ");

        // Sugar calculation: use pre-computed value if available, else derive from menu data
        let sugarPerUnit = 0;
        if (item.customization?.nutritionInfo?.sugarG != null) {
          sugarPerUnit = Number(item.customization.nutritionInfo.sugarG);
        } else {
          const menuItem = menuByCode.get(item.menuItemCode || '');
          const baseSugar = Number(menuItem?.base_sugar_g ?? 0);
          const sugarLevel = (item.customization?.sugar as string) || 'Normal Sweet';
          const multiplier = SUGAR_MULTIPLIERS[sugarLevel] ?? 1.0;
          const toppingSugar = rawToppings.reduce((sum, t) => {
            const clean = t.replace(/\s*\(\+S\$[\d.]+\)/g, '').trim();
            return sum + (TOPPING_SUGAR_G[clean] ?? 0);
          }, 0);
          sugarPerUnit = Math.round(baseSugar * multiplier) + toppingSugar;
        }

        return {
          backendId: item.id || item._id,
          drinkId: item.menuItemCode || item.drinkId,
          name: item.name,
          details,
          price: lineTotal,
          unitPrice,
          imageSrc: item.image,
          quantity,
          sugarPerUnit,
        };
      });

      setCartItems(parsedItems);
      setTotal(parsedItems.reduce((sum, item) => sum + item.price, 0));
    } catch (error) {
      console.error("[Cart] Failed to fetch cart items:", error);
      setCartItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEditItem(item: CartItem) {
    router.push(`/cart/edit/${item.backendId}`);
  }

  // #17 - Increase quantity by 1. Optimistic local update avoids re-fetching the
  // full cart (which triggers isLoading → unmount → remount with enter animation).
  async function handleIncrease(item: CartItem) {
    if (!item.backendId) return;

    const nextQuantity = item.quantity + 1;
    setCartItems(prev => prev.map(i => {
      if (i.backendId !== item.backendId) return i;
      return { ...i, quantity: nextQuantity, price: i.unitPrice * nextQuantity, details: i.details.replace(/^(Qty|Bilangan|数量) \d+/, `$1 ${nextQuantity}`) };
    }));
    setTotal(prev => prev + item.unitPrice);
    await updateCartItemQuantity(item.backendId, nextQuantity);
    skipNextCartUpdated.current = true;
    window.dispatchEvent(new Event('cartUpdated'));
  }

  // #17 - Decrease quantity by 1; remove item entirely when quantity reaches 0.
  async function handleDecrease(item: CartItem) {
    if (!item.backendId) return;

    if (item.quantity <= 1) {
      await handleRemove(item);
      return;
    }

    const nextQuantity = item.quantity - 1;
    setCartItems(prev => prev.map(i => {
      if (i.backendId !== item.backendId) return i;
      return { ...i, quantity: nextQuantity, price: i.unitPrice * nextQuantity, details: i.details.replace(/^(Qty|Bilangan|数量) \d+/, `$1 ${nextQuantity}`) };
    }));
    setTotal(prev => prev - item.unitPrice);
    await updateCartItemQuantity(item.backendId, nextQuantity);
    skipNextCartUpdated.current = true;
    window.dispatchEvent(new Event('cartUpdated'));
  }

  // #17 - Apply the CSS fadeSlideOut animation (280 ms) before deleting so the row
  // visually exits before disappearing from the DOM. cartUpdated syncs the header badge.
  async function handleRemove(item: CartItem) {
    if (!item.backendId) return;

    setRemovingId(item.backendId);
    await new Promise(r => setTimeout(r, 280));
    setRemovingId(null);
    await deleteCartItem(item.backendId);
    await fetchCartData();
    window.dispatchEvent(new Event('cartUpdated'));
  }

  useEffect(() => {
    fetchCartData();

    const handleCartUpdated = () => {
      if (skipNextCartUpdated.current) {
        skipNextCartUpdated.current = false;
        return;
      }
      fetchCartData();
    };

    window.addEventListener("cartUpdated", handleCartUpdated);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdated);
    };
  }, []);

  const sugarGradeKey = totalSugarG !== null ? sugarGrade(totalSugarG) : null;
  const sugarFillPct  = totalSugarG !== null ? Math.min(100, totalSugarG) : 0;
  const pctOfLimit    = totalSugarG !== null ? Math.round((totalSugarG / WHO_LIMIT_G) * 100) : 0;

  return (
    <main className="cart-page">
      <Header />
      <div className="cart-content">
      <button
        type="button"
        className="back-menu-btn"
        onClick={() => router.push("/buy-driptea")}
      >
        Back to Menu
      </button>

      {!isLoading && cartItems.length > 0 && totalSugarG !== null && sugarGradeKey && (
        <div className="sugar-widget">
          <div className="sugar-widget-header">
            <span className="sugar-widget-title">Sugar Snapshot</span>
            <span className="sugar-widget-limit-label">
              <span className="sugar-limit-number">
                {WHO_LIMIT_G}g
                <em className="sugar-info-icon" title="WHO and Singapore MOH recommended added sugar limit per day">ℹ</em>
              </span>
              <span className="sugar-limit-text">WHO daily limit</span>
            </span>
          </div>
          <p className="sugar-widget-subtitle">Track your daily sugar from DripTea orders</p>
          <div className="sugar-widget-body">
            <img src={`/grade_nutri_${sugarGradeKey}_full.png`} alt={`Nutri-Grade ${sugarGradeKey.toUpperCase()}`} className="sugar-grade-badge" />
            <div className="sugar-compare">
              <span key={totalSugarG} className={`sugar-current sugar-grade-${sugarGradeKey}`}>{totalSugarG}g</span>
              <span className="sugar-arrow">&gt;</span>
              <span className="sugar-who-limit">{WHO_LIMIT_G}g</span>
            </div>
            <span className={`sugar-pct-pill sugar-pill-${sugarGradeKey}`}>{pctOfLimit}% of limit</span>
          </div>
          <div className="sugar-track-wrap">
            <progress className="sugar-track" max={100} value={sugarFillPct} />
            <div className="sugar-who-marker" />
          </div>
          <div className="sugar-scale">
            <span>0</span>
            <span>50</span>
            <span>100</span>
            <span className="sugar-scale-limit-label">25g limit</span>
          </div>
          <p key={sugarGradeKey} className={`sugar-nudge sugar-nudge-${sugarGradeKey}`}>
            {SUGAR_NUDGE[sugarGradeKey]}
          </p>
        </div>
      )}

      <section className="cart-panel">
        <h1 className="cart-title">Shopping Cart</h1>

        {isLoading ? (
          <div className="cart-empty-state">
            <p className="cart-empty-title">Fetching your cart…</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="cart-empty-state">
            <h2 className="cart-empty-title">Your cup is still empty!</h2>
            <p className="cart-empty-subtitle">
              Looks like you haven't added anything yet.<br />
            </p>
            {/* <button
              type="button"
              className="cart-browse-btn"
              onClick={() => router.push("/buy-driptea")}
            >
              Browse Our Menu →
            </button> */}
          </div>
        ) : (
          <>
            <div className="cart-list">
              {cartItems.map((item, index) => (
                <div
                  key={item.backendId || `${item.name}-${index}`}
                  className={`cart-item-row${removingId === item.backendId ? ' removing' : ''}`}
                >
                  <div className="cart-item-main">
                    <img
                      src={getCartItemImage(item)}
                      alt={item.name}
                      className="cart-product-image"
                    />

                    <div className="cart-item-text">
                      <h3 className="cart-item-name">
                        {index + 1}. {item.name}
                      </h3>

                      <p className="cart-item-details">{item.details}</p>

                      <button
                        type="button"
                        className="edit-beverage-btn"
                        onClick={() => handleEditItem(item)}
                      >
                        Edit Beverage
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-actions">
                    <button
                      type="button"
                      className="cart-action-btn"
                      onClick={() => handleIncrease(item)}
                    >
                      +
                    </button>

                    <strong className="cart-price">
                      S$ {item.price.toFixed(2)}
                    </strong>

                    <button
                      type="button"
                      className="cart-action-btn"
                      onClick={() => handleDecrease(item)}
                    >
                      −
                    </button>

                    <button
                      type="button"
                      className="cart-delete-btn"
                      onClick={() => handleRemove(item)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-total-section">
              <h2>Total Price:</h2>
              <strong>S$ {total.toFixed(2)}</strong>
            </div>
          </>
        )}
      </section>

      <div className="checkout-row">
        <button
          type="button"
          className="checkout-btn"
          disabled={cartItems.length === 0}
          onClick={() => router.push("/checkout")}
        >
          Proceed to checkout
        </button>
      </div>
      </div>
    </main>
  );
}
