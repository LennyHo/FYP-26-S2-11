"use client";
import React from "react";
import styles from "./PurchaseHistoryCard.module.css";

interface OrderItem {
  name: string;
  quantity: number;
  customization?: { size?: string; ice?: string; sugar?: string; toppings?: string[] };
  lineTotal: number;
}

interface OrderData {
  orderNo: string;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  totalAmount: number;
}

export interface PurchaseHistoryData {
  title: string;
  orders: OrderData[];
}

interface Props {
  purchaseHistory: PurchaseHistoryData;
}

export default function PurchaseHistoryCard({ purchaseHistory }: Props) {
  const title = purchaseHistory.title ?? "Your Most Recent Order";
  const orders = Array.isArray(purchaseHistory.orders) ? purchaseHistory.orders : [];

  if (!orders.length) return null;

  return (
    <div className={styles.root}>
      <div className={styles.header}>{title}</div>

      {orders.map((order, idx) => (
        <div key={idx} className={styles.orderBlock}>
          {orders.length > 1 && (
            <div className={styles.orderDivider} />
          )}

          <div className={styles.metaSection}>
            <div className={styles.orderNo}>Order #{order.orderNo}</div>
            <div className={styles.statusRow}>
              Order Status: <strong>{order.status}</strong>
            </div>
            <div className={styles.statusRow}>
              Payment Status: <strong>{order.paymentStatus || "Paid"}</strong>
            </div>
          </div>

          <div className={styles.itemList}>
            {order.items.map((item, i) => {
              const c = item.customization || {};
              const toppingStr =
                Array.isArray(c.toppings) && c.toppings.length > 0
                  ? c.toppings.map((t) => t.replace(/\s*\(\+S\$[\d.]+\)/g, "").trim()).join(", ")
                  : "No toppings";
              const customStr = [c.size, c.ice, c.sugar, toppingStr].filter(Boolean).join(" · ");
              return (
                <div key={i} className={styles.itemBlock}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemName}>{item.name} × {item.quantity}</span>
                    <span className={styles.itemPrice}>S$ {Number(item.lineTotal).toFixed(2)}</span>
                  </div>
                  <div className={styles.itemCustom}>{customStr}</div>
                </div>
              );
            })}
          </div>

          <div className={styles.totalRow}>
            <span>Total Paid</span>
            <span className={styles.totalAmount}>S$ {Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      ))}

      <div className={styles.btnRow}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => (window as any).handlePurchaseHistory?.()}
        >
          View Full Purchase History
        </button>
      </div>
    </div>
  );
}
