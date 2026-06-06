"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCartItems,
  getStoredUser,
  deleteCartItem,
  updateCartItemQuantity,
} from "../utils/dripteaApi";
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
  if (item.imageSrc) return item.imageSrc;
  if (item.drinkId) return `/img/${item.drinkId}.png`;
  return "/img/b001.png";
}

function getCategorySlugByDrinkId(drinkId?: string) {
  // Student note: this lets Edit Beverage open the real drink customisation page.
  if (["b001", "b002", "b003", "b004", "b005"].includes(drinkId || "")) return "milk-tea";
  if (["b006", "b007", "b008", "b009"].includes(drinkId || "")) return "matcha-teas";
  if (["b010", "b012"].includes(drinkId || "")) return "ice-blended";
  if (drinkId === "b011") return "local-favourites";
  return "milk-tea";
}

export default function Cart() {
  const router = useRouter();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchCartData() {
    setIsLoading(true);

    try {
      const user = getStoredUser();

      if (!user) {
        setCartItems([]);
        setTotal(0);
        return;
      }

      const response = await getCartItems(user.id);
      const backendItems: DripTeaCartItem[] = response.data || [];

      const parsedItems: CartItem[] = backendItems.map((item) => {
        const quantity = Number(item.quantity || 1);
        const lineTotal = Number(item.lineTotal || 0);
        const unitPrice = Number(item.unitPrice || lineTotal / quantity || 0);

        const toppings = Array.isArray(item.customization?.toppings)
          ? item.customization.toppings.join(", ")
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
    if (!item.drinkId) {
      router.push("/buy-driptea");
      return;
    }

    router.push(`/menu/${getCategorySlugByDrinkId(item.drinkId)}/${encodeURIComponent(item.drinkId)}`);
  }

  async function handleIncrease(item: CartItem) {
    if (!item.backendId) return;

    const nextQuantity = item.quantity + 1;
    await updateCartItemQuantity(item.backendId, nextQuantity);
    await fetchCartData();
  }

  async function handleDecrease(item: CartItem) {
    if (!item.backendId) return;

    if (item.quantity <= 1) {
      await handleRemove(item);
      return;
    }

    const nextQuantity = item.quantity - 1;
    await updateCartItemQuantity(item.backendId, nextQuantity);
    await fetchCartData();
  }

  async function handleRemove(item: CartItem) {
    if (!item.backendId) return;

    await deleteCartItem(item.backendId);
    await fetchCartData();
  }

  useEffect(() => {
    fetchCartData();

    const handleCartUpdated = () => {
      fetchCartData();
    };

    window.addEventListener("cartUpdated", handleCartUpdated);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdated);
    };
  }, []);

  return (
    <main className="cart-page">
      <button
        type="button"
        className="back-menu-btn"
        onClick={() => router.push("/buy-driptea")}
      >
        ← Back to Menu
      </button>

      <section className="cart-panel">
        <h1 className="cart-title">Your Shopping Cart</h1>

        {isLoading ? (
          <p className="cart-empty-text">Loading cart...</p>
        ) : cartItems.length === 0 ? (
          <p className="cart-empty-text">Your cart is empty.</p>
        ) : (
          <>
            <div className="cart-list">
              {cartItems.map((item, index) => (
                <div key={item.backendId || `${item.name}-${index}`} className="cart-item-row">
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
    </main>
  );
}
