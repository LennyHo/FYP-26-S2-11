"use client";
import React from "react";
import styles from "./CartSummaryCard.module.css";

interface CartItemData {
  name: string;
  quantity: number;
  customization: { size?: string; ice?: string; sugar?: string; toppings?: string[] };
  lineTotal: number;
}

export interface CartUpdateData {
  message: string;
  cartItems: CartItemData[];
  total: number;
}

interface Props {
  cartUpdate: CartUpdateData;
}

export default function CartSummaryCard({ cartUpdate }: Props) {
  const { message, cartItems, total } = cartUpdate;
  const isEmpty = cartItems.length === 0;

  return (
    <div className={styles.root}>
      <div className={styles.statusMsg}>{message}</div>

      {isEmpty ? (
        <div className={styles.emptyMsg}>Your cart is empty.</div>
      ) : (
        <>
          <div className={styles.itemList}>
            {cartItems.map((item, i) => {
              const c = item.customization || {};
              const toppingStr =
                Array.isArray(c.toppings) && c.toppings.length > 0
                  ? c.toppings.join(", ")
                  : "No toppings";
              const customStr = [c.size, c.ice, c.sugar, toppingStr]
                .filter(Boolean)
                .join(" · ");
              return (
                <div key={i} className={styles.itemBlock}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemName}>
                      <span className={styles.itemNameText}>{item.name}</span>
                      <span className={styles.itemQty}>&thinsp;× {item.quantity}</span>
                    </span>
                    <span className={styles.itemPrice}>
                      S$ {Number(item.lineTotal).toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.itemCustom}>{customStr}</div>
                </div>
              );
            })}
          </div>

          <div className={styles.totalRow}>
            <span>Total</span>
            <span className={styles.totalAmount}>
              S$ {Number(total).toFixed(2)}
            </span>
          </div>
        </>
      )}

      <div className={styles.btnRow}>
        {isEmpty ? (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => (window as any).handleMenu?.()}
          >
            Browse Menu
          </button>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
