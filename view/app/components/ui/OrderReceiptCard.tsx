"use client";
import React from "react";
import styles from "./OrderReceiptCard.module.css";

interface OrderReceiptData {
  drink: { name: string; price: number; image: string };
  customization: { size: string; ice: string; sugar: string; toppings: string[] };
  nutrition: { sugar: number; calories: number; grade: string } | null;
  cartItems: { name: string; quantity: number; lineTotal: number }[];
  total: number;
}

interface Props {
  orderReceipt: OrderReceiptData;
}

export default function OrderReceiptCard({ orderReceipt }: Props) {
  const { drink, customization, nutrition, cartItems, total } = orderReceipt;

  const toppingStr = customization.toppings.length > 0
    ? customization.toppings.join(", ")
    : "No toppings";

  const customStr = `${customization.size} · ${customization.ice} · ${customization.sugar} · ${toppingStr}`;

  return (
    <div>
      <strong>DripTea — Order Confirmation</strong>
      <br /><br />

      <strong>{drink.name}</strong> — S$ {Number(drink.price).toFixed(2)}<br />
      {customStr}<br />
      {nutrition && (
        <>Sugar: {nutrition.sugar}g | Cal: {nutrition.calories} kcal | Grade {nutrition.grade}<br /></>
      )}
      <br />

      {cartItems.length > 0 && (
        <>
          <p>                         </p>
          <br />
          <strong>Your Cart</strong><br />
          {cartItems.map((item, i) => (
            <span key={i}>{item.name} × {item.quantity} — S$ {Number(item.lineTotal).toFixed(2)}<br /></span>
          ))}
          <br />
        </>
      )}

      <strong>Total: S$ {Number(total).toFixed(2)}</strong>
      <br /><br />

      Thank you for your order! 🧋
      <br /><br />

      <div className={styles.btnRow}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => (window as any).handleCart?.()}
        >
          View Cart
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => (window as any).handleCheckout?.()}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
