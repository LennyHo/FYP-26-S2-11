// User Story Architecture Trace — Cart.tsx
//
// #16  View Cart
//      View: cart/page.tsx → Component: Cart.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
//
// #17  Edit Cart
//      View: cart/page.tsx → Component: Cart.tsx (this file) → Route: cart.routes.js → Ctrl: cart.controller.js → Model: cartItem.model.js
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCartItems, deleteCartItem, updateCartItemQuantity } from "../../utils/customerApi";
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
  };
}

interface CartItem {
  backendId?: string;
  drinkId?: string;
  name: string;
  details: string;
  price: number;
  unitPrice: number;
  imageSrc?: string;
  quantity: number;
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
            const qtyMatch = parsed.details.match(/Qty\s+(\d+)/i);
            const quantity = qtyMatch ? Number(qtyMatch[1]) : 1;
            const unitPrice = quantity > 0 ? parsed.price / quantity : parsed.price;
            return {
              name: parsed.name,
              details: parsed.details,
              price: parsed.price,
              unitPrice,
              imageSrc: parsed.imageSrc,
              quantity,
            } satisfies CartItem;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null) as CartItem[];
        setCartItems(guestItems);
        setTotal(guestItems.reduce((sum, item) => sum + item.price, 0));
        return;
      }

      const userId = user?.id || "";
      const response = await getCartItems(userId);
      const backendItems: DripTeaCartItem[] = response.data || [];

      const parsedItems: CartItem[] = backendItems.map((item) => {
        const quantity = Number(item.quantity || 1);
        const lineTotal = Number(item.lineTotal || 0);
        const unitPrice = Number(item.unitPrice || lineTotal / quantity || 0);

        const toppings = Array.isArray(item.customization?.toppings)
          ? item.customization.toppings.map((t) => t.replace(/\s*\(\+S\$[\d.]+\)/g, "").trim()).join(", ")
          : "";

        const details = [
          `Qty ${quantity}`,
          item.customization?.size || "Regular",
          item.customization?.ice || "Normal Ice",
          item.customization?.sugar || "Normal Sweet",
          toppings,
        ]
          .filter(Boolean)
          .join(" | ");

        return {
          backendId: item.id || item._id,
          drinkId: item.menuItemCode || item.drinkId,
          name: item.name,
          details,
          price: lineTotal,
          unitPrice,
          imageSrc: item.image,
          quantity,
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
      return { ...i, quantity: nextQuantity, price: i.unitPrice * nextQuantity, details: i.details.replace(/^Qty \d+/, `Qty ${nextQuantity}`) };
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
      return { ...i, quantity: nextQuantity, price: i.unitPrice * nextQuantity, details: i.details.replace(/^Qty \d+/, `Qty ${nextQuantity}`) };
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
