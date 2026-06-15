"use client";
import React from "react";
import Image from "next/image";
import styles from "./OrderReceiptCard.module.css";

interface NutritionData {
  sugar: number;
  calories: number;
  grade: string;
}

interface OrderReceiptData {
  drink: { name: string; price: number; image: string };
  customization: { size: string; ice: string; sugar: string; toppings: string[] };
  nutrition: NutritionData | null;
  recommendedNutrition: NutritionData | null;
  cartItems: { name: string; quantity: number; lineTotal: number }[];
  total: number;
}

interface Props {
  orderReceipt: OrderReceiptData;
}

export default function OrderReceiptCard({ orderReceipt }: Props) {
  const { drink, customization, nutrition, recommendedNutrition, cartItems, total } = orderReceipt;

  const toppingStr =
    customization.toppings.length > 0
      ? customization.toppings.join(", ")
      : "No toppings";

  const grade = nutrition?.grade?.toUpperCase() ?? null;
  const recGrade = recommendedNutrition?.grade?.toUpperCase() ?? null;
  const isUnhealthy = grade === "C" || grade === "D";

  return (
    <div className={styles.root}>
      {/* Order summary text */}
      <div className={styles.drinkLine}>
        <strong>{drink.name}</strong> — S$ {Number(drink.price).toFixed(2)}
      </div>
      <div className={styles.customLine}>
        {customization.size} · {customization.ice} · {customization.sugar} · {toppingStr}
      </div>
      {nutrition && (
        <div className={styles.nutriLine}>
          Sugar: {nutrition.sugar}g · Cal: {nutrition.calories} kcal · Grade {grade}
        </div>
      )}

      {/* Cart summary */}
      {cartItems.length > 0 && (
        <div className={styles.cartSection}>
          {cartItems.map((item, i) => (
            <div key={i} className={styles.cartRow}>
              <span>{item.name} × {item.quantity}</span>
              <span>S$ {Number(item.lineTotal).toFixed(2)}</span>
            </div>
          ))}
          <div className={styles.totalRow}>
            <span>Total</span>
            <span>S$ {Number(total).toFixed(2)}</span>
          </div>
        </div>
      )}

      <p className={styles.thanks}>Thank you for your order! 🧋</p>

      {/* Health widget — Grade C or D only, shown after the thank-you line */}
      {isUnhealthy && nutrition && recommendedNutrition && recGrade && (
        <div className={styles.healthWidget}>
          <div className={styles.healthTitle}>Want to reduce your sugar intake?</div>
          <div className={styles.healthSubtitle}>
            Based on your current customization, here&apos;s how switching to 25% sugar would look.
          </div>
          <div className={styles.healthLabelRow}>
            <span className={styles.healthLabel}>Current</span>
            <span />
            <span className={styles.healthLabel}>Reduce to 25%</span>
          </div>
          <div className={styles.healthImagesRow}>
            <Image
              src={`/grade_nutri_${grade.toLowerCase()}.png`}
              alt={`Grade ${grade}`}
              width={72}
              height={72}
            />
            <span className={styles.healthArrow}>
              <svg width="36" height="16" viewBox="0 0 36 16" fill="none">
                <line x1="0" y1="8" x2="28" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <polyline points="22,2 30,8 22,14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </span>
            <Image
              src={`/grade_nutri_${recGrade.toLowerCase()}.png`}
              alt={`Grade ${recGrade}`}
              width={72}
              height={72}
            />
          </div>
          <div className={styles.healthSugarRow}>
            <span className={styles.sugarCurrent}>{nutrition.sugar}g sugar</span>
            <span />
            <span className={styles.sugarRecommended}>{recommendedNutrition.sugar}g sugar</span>
          </div>
        </div>
      )}

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
