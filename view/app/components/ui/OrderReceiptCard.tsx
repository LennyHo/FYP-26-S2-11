"use client";
import React from "react";
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
  lang?: string;
}

interface Props {
  orderReceipt: OrderReceiptData;
}

const RECEIPT_LABELS: Record<string, Record<string, string>> = {
  ms: {
    Regular: "Biasa", Large: "Besar",
    "Normal Ice": "Ais Normal", "Less Ice": "Kurang Ais", "No Ice": "Tanpa Ais", Hot: "Panas",
    "Normal Sweet": "Normal Manis",
    "0% Sugar": "0% Gula", "25% Sugar": "25% Gula", "50% Sugar": "50% Gula", "100% Sugar": "100% Gula",
    "Tapioca Pearls": "Mutiara", "Brown Sugar": "Gula Perang", "Cheese Foam": "Busa Keju",
    "No toppings": "Tanpa topping",
    Sugar: "Gula", Cal: "Kal", Grade: "Gred",
    Total: "Jumlah",
    "Thank you for your order!": "Terima kasih atas pesanan anda!",
    "View Cart": "Lihat Troli",
    "Proceed to Checkout": "Teruskan Pembayaran",
    "Want to reduce your sugar intake?": "Ingin mengurangkan pengambilan gula anda?",
    "Based on your current customization, here's how switching to 25% sugar would look.":
      "Berdasarkan pilihan semasa anda, begini jika anda beralih kepada 25% gula.",
    Current: "Semasa", "Reduce to 25%": "Kurang kepada 25%",
    "g sugar": "g gula",
  },
  zh: {
    Regular: "中杯", Large: "大杯",
    "Normal Ice": "正常冰", "Less Ice": "少冰", "No Ice": "去冰", Hot: "热饮",
    "Normal Sweet": "正常甜",
    "0% Sugar": "0%糖", "25% Sugar": "25%糖", "50% Sugar": "50%糖", "100% Sugar": "100%糖",
    "Tapioca Pearls": "珍珠", "Brown Sugar": "黑糖", "Cheese Foam": "芝士泡沫",
    "No toppings": "不加配料",
    Sugar: "糖分", Cal: "卡路里", Grade: "营养等级",
    Total: "总计",
    "Thank you for your order!": "感谢您的订购！",
    "View Cart": "查看购物车",
    "Proceed to Checkout": "前往结账",
    "Want to reduce your sugar intake?": "想要减少糖分摄入吗？",
    "Based on your current customization, here's how switching to 25% sugar would look.":
      "根据您当前的选择，以下是切换至25%糖会有何变化。",
    Current: "当前", "Reduce to 25%": "减少至25%",
    "g sugar": "g糖",
  },
  ta: {
    Regular: "சாதாரண அளவு", Large: "பெரிய அளவு",
    "Normal Ice": "சாதாரண பனிக்கட்டி", "Less Ice": "குறைந்த பனிக்கட்டி", "No Ice": "பனிக்கட்டி இல்லாமல்", Hot: "சூடானது",
    "Normal Sweet": "சாதாரண இனிப்பு",
    "0% Sugar": "0% சர்க்கரை", "25% Sugar": "25% சர்க்கரை", "50% Sugar": "50% சர்க்கரை", "100% Sugar": "100% சர்க்கரை",
    "Tapioca Pearls": "மரவள்ளி முத்துக்கள்", "Brown Sugar": "பழுப்பு சர்க்கரை", "Cheese Foam": "சீஸ் நுரை",
    "No toppings": "மேலோடு இல்லை",
    Sugar: "சர்க்கரை", Cal: "கலோரி", Grade: "தரம்",
    Total: "மொத்தம்",
    "Thank you for your order!": "உங்கள் ஆர்டருக்கு நன்றி!",
    "View Cart": "கார்ட்டைப் பார்க்க",
    "Proceed to Checkout": "செக்அவுட்டுக்குச் செல்ல",
    "Want to reduce your sugar intake?": "உங்கள் சர்க்கரை உட்கொள்ளலைக் குறைக்க விரும்புகிறீர்களா?",
    "Based on your current customization, here's how switching to 25% sugar would look.":
      "உங்கள் தற்போதைய தேர்வின் அடிப்படையில், 25% சர்க்கரைக்கு மாறினால் இப்படி இருக்கும்.",
    Current: "தற்போதைய", "Reduce to 25%": "25% ஆகக் குறைக்க",
    "g sugar": "கி சர்க்கரை",
  },
};

function tR(label: string, lang?: string): string {
  if (!lang || lang === "en") return label;
  return RECEIPT_LABELS[lang]?.[label] ?? label;
}

export default function OrderReceiptCard({ orderReceipt }: Props) {
  const { drink, customization, nutrition, cartItems, total, lang } = orderReceipt;

  const toppingStr =
    customization.toppings.length > 0
      ? customization.toppings.map((t) => tR(t, lang)).join(", ")
      : tR("No toppings", lang);

  const grade = nutrition?.grade?.toUpperCase() ?? null;

  return (
    <div className={styles.root}>
      {/* Order summary text */}
      <div className={styles.drinkLine}>
        <strong>{drink.name}</strong> — S$ {Number(drink.price).toFixed(2)}
      </div>
      <div className={styles.customLine}>
        {tR(customization.size, lang)} · {tR(customization.ice, lang)} · {tR(customization.sugar, lang)} · {toppingStr}
      </div>
      {nutrition && (
        <div className={styles.nutriLine}>
          {tR("Sugar", lang)}: {nutrition.sugar}g · {tR("Cal", lang)}: {nutrition.calories} kcal · {tR("Grade", lang)} {grade}
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
            <span>{tR("Total", lang)}</span>
            <span>S$ {Number(total).toFixed(2)}</span>
          </div>
        </div>
      )}

      <p className={styles.thanks}>{tR("Thank you for your order!", lang)} 🧋</p>

      {/* No sugar nudge here — the drink is already in the cart, and the nudge was shown at the
          sugar step where it could still change the order. */}

      <div className={styles.btnRow}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => (window as any).handleCart?.()}
        >
          {tR("View Cart", lang)}
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => (window as any).handleCheckout?.()}
        >
          {tR("Proceed to Checkout", lang)}
        </button>
      </div>
    </div>
  );
}
