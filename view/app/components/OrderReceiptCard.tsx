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
  const customMatch = plain.match(/S\$\s*[\d.]+\s+([\w\s]+·[\w\s%·]+)/);
  const customization = customMatch?.[1]?.trim() ?? "";

  // Nutrition
  const nutriMatch = plain.match(/Sugar:\s*([\d.]+)g\s*\|\s*Calories:\s*([\d.]+)\s*kcal\s*\|\s*Nutri-Grade:\s*([A-E])/i);
  const sugar = nutriMatch?.[1] ?? "";
  const calories = nutriMatch?.[2] ?? "";
  const grade = nutriMatch?.[3] ?? "";

  // Cart items: "Drink × 1 - S$ X.XX"
  const cartSection = plain.match(/Your current cart:(.*?)Total:/is)?.[1] ?? "";
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
    <div className={styles.wrapper}>
      {/* Perforated top edge */}
      <div className={styles.perfTop} />

      <div className={styles.receipt}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.storeName}>DripTea</span>
          <span className={styles.tagline}>Order Confirmation</span>
        </div>

        <div className={styles.dividerDash} />

        {/* Order item */}
        {drinkName && (
          <div className={styles.section}>
            <div className={styles.itemRow}>
              <span className={styles.itemName}>{drinkName}</span>
              <span className={styles.itemPrice}>{drinkPrice}</span>
            </div>
            {customization && (
              <div className={styles.itemCustom}>{customization}</div>
            )}
            {(sugar || calories || grade) && (
              <div className={styles.nutriRow}>
                {sugar && <span>Sugar: {sugar}g</span>}
                {calories && <span>Cal: {calories} kcal</span>}
                {grade && <span className={styles.gradeChip}>Grade {grade}</span>}
              </div>
            )}
          </div>
        )}

        <div className={styles.dividerDash} />

        {/* Cart summary */}
        {cartItems.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Your Cart</div>
            {cartItems.map((item, i) => (
              <div key={i} className={styles.cartRow}>
                <span>{item.name} × {item.qty}</span>
                <span>{item.price}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.dividerSolid} />

        {/* Total */}
        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.totalAmount}>{total}</span>
        </div>

        <div className={styles.dividerDash} />

        {/* Thank you */}
        <div className={styles.thanks}>Thank you for your order! 🧋</div>

        {/* Buttons */}
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

      {/* Perforated bottom edge */}
      <div className={styles.perfBottom} />
    </div>
  );
}
