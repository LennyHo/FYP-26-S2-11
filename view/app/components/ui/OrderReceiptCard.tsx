"use client";
import React from "react";
import styles from "./OrderReceiptCard.module.css";

interface Props {
  msgText: string;
}

function stripTags(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function parseReceipt(html: string) {
  const plain = stripTags(html);

  // Drink name + price: "Matcha Latte - S$ 5.50"
  const orderMatch = plain.match(/Here is your order summary:\s*([^\-]+?)\s*-\s*S\$\s*([\d.]+)/i);
  const drinkName = orderMatch?.[1]?.trim() ?? "";
  const drinkPrice = orderMatch?.[2] ? `S$ ${orderMatch[2]}` : "";

  // Customisation line (contains ·)
  const customMatch = plain.match(/S\$\s*[\d.]+\s+(.+?)\s+Sugar:/i);
  const customization = customMatch?.[1]?.trim() ?? "";

  // Nutrition
  const nutriMatch = plain.match(/Sugar:\s*([\d.]+)g\s*\|\s*Calories:\s*([\d.]+)\s*kcal\s*\|\s*Nutri-Grade:\s*([A-E])/i);
  const sugar = nutriMatch?.[1] ?? "";
  const calories = nutriMatch?.[2] ?? "";
  const grade = nutriMatch?.[3] ?? "";

  // Cart items: "Drink × 1 - S$ X.XX"
  const cartSection = plain.match(/Your current cart:([\s\S]*?)Total:/i)?.[1] ?? "";
  const cartItems = [...cartSection.matchAll(/(.+?)\s*[×x]\s*(\d+)\s*-\s*S\$\s*([\d.]+)/gi)].map(m => ({
    name: m[1].trim(),
    qty: m[2],
    price: `S$ ${m[3]}`,
  }));

  // Grand total
  const totalMatch = plain.match(/Total:\s*S\$\s*([\d.]+)/i);
  const total = totalMatch?.[1] ? `S$ ${totalMatch[1]}` : "";

  return { drinkName, drinkPrice, customization, sugar, calories, grade, cartItems, total };
}

export default function OrderReceiptCard({ msgText }: Props) {
  const { drinkName, drinkPrice, customization, sugar, calories, grade, cartItems, total } = parseReceipt(msgText);

  return (
    <div>
      <strong>DripTea — Order Confirmation</strong>
      <br /><br />

      {drinkName && (
        <>
          <strong>{drinkName}</strong> — {drinkPrice}<br />
          {customization && <>{customization}<br /></>}
          {(sugar || calories || grade) && (
            <>Sugar: {sugar}g | Cal: {calories} kcal | Grade {grade}<br /></>
          )}
          <br />
        </>
      )}

      {cartItems.length > 0 && (
        <>
          <strong>Your Cart</strong><br />
          {cartItems.map((item, i) => (
            <span key={i}>{item.name} × {item.qty} — {item.price}<br /></span>
          ))}
          <br />
        </>
      )}

      <strong>Total: {total}</strong>
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
