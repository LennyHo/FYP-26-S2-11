"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCartItems } from "../utils/dripteaApi";
import { getStoredUser } from "../utils/dripteaApi";

interface DripTeaCartItem {
  id?: string;
  _id?: string;
  name: string;
  image?: string;
  category?: string;
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
  name: string;
  details: string;
  price: number;
  imageSrc?: string;
  quantity?: number;
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
        setIsLoading(false);
        return;
      }
      
      const response = await getCartItems(user.id);
      const backendItems: DripTeaCartItem[] = response.data || [];

      const grouped = new Map<string, CartItem>();

      backendItems.forEach((item) => {
        const toppings = Array.isArray(item.customization?.toppings)
          ? item.customization.toppings.join(", ")
          : "";

        const details = [
          item.customization?.size || "Regular",
          item.customization?.ice || "Normal Ice",
          item.customization?.sugar || "Normal Sweet",
          toppings,
        ]
          .filter(Boolean)
          .join(" | ");

        const key = JSON.stringify({
          name: item.name,
          details,
        });

        const quantity = Number(item.quantity || 1);
        const lineTotal = Number(item.lineTotal || 0);

        if (!grouped.has(key)) {
          grouped.set(key, {
            backendId: item.id || item._id,
            name: item.name,
            details: `Qty ${quantity} | ${details}`,
            price: lineTotal,
            imageSrc: item.image,
            quantity,
          });
        } else {
          const existing = grouped.get(key)!;
          const newQuantity = Number(existing.quantity || 0) + quantity;
          existing.quantity = newQuantity;
          existing.price += lineTotal;
          existing.details = `Qty ${newQuantity} | ${details}`;
        }
      });

      const parsedItems = Array.from(grouped.values());
      const calculatedTotal = parsedItems.reduce((sum, item) => sum + item.price, 0);

      setCartItems(parsedItems);
      setTotal(calculatedTotal);
    } catch (error) {
      console.error("[Cart] Failed to fetch cart items:", error);
      setCartItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
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
    <main style={{ padding: "48px", maxWidth: "900px" }}>
      <button
        type="button"
        onClick={() => router.push("/buy-driptea")}
        style={{
          border: "1px solid #4b2e1f",
          borderRadius: "999px",
          padding: "8px 18px",
          background: "white",
          cursor: "pointer",
          marginBottom: "24px",
        }}
      >
        ← Back to Menu
      </button>

      <h1 style={{ fontSize: "34px", marginBottom: "18px" }}>Your Shopping Cart</h1>

      <hr style={{ marginBottom: "28px" }} />

      {isLoading ? (
        <p>Loading cart...</p>
      ) : cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <section>
          {cartItems.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                alignItems: "center",
                gap: "16px",
                borderBottom: "1px solid #eee",
                padding: "18px 0",
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{item.name}</h3>
                <p style={{ margin: "6px 0 0", color: "#555" }}>{item.details}</p>
              </div>

              <strong style={{ color: "#c9792b", fontSize: "20px" }}>
                S$ {item.price.toFixed(2)}
              </strong>

              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
                disabled
              >
                Remove
              </button>
            </div>
          ))}
        </section>
      )}

      <hr style={{ margin: "32px 0 24px" }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Total: S$ {total.toFixed(2)}</h2>

        <button
          type="button"
          disabled={cartItems.length === 0}
          onClick={() => router.push("/checkout")}
          style={{
            padding: "14px 26px",
            borderRadius: "12px",
            border: "none",
            background: cartItems.length === 0 ? "#ccc" : "#c9792b",
            color: "white",
            fontWeight: 700,
            cursor: cartItems.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Proceed to Checkout
        </button>
      </div>
    </main>
  );
}