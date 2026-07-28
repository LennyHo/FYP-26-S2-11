"use client";
import React from "react";
import styles from "./OrderStatusCard.module.css";

interface OrderStatusData {
  orderNo: string;
  phase: number;
  message: string;
  // 3 steps for pickup (Order Confirmed / Preparing / Ready), 4 for delivery
  // (Order Confirmed / Preparing / Out for Delivery / Delivered) — matches the
  // step count shown on the order-status tracking page for each order type.
  stepLabels: string[];
  orderType?: 'pickup' | 'delivery';
  deliveryAddress?: string | null;
}

interface Props {
  orderStatus: OrderStatusData;
}

export default function OrderStatusCard({ orderStatus }: Props) {
  const { phase, message, stepLabels, orderType, deliveryAddress } = orderStatus;

  // Grid columns: step N sits at column 2N-1, the connecting line after it at 2N.
  const stepColumns = stepLabels.map((_, index) => index * 2 + 1);
  const lineColumns = stepLabels.slice(1).map((_, index) => index * 2 + 2);
  const gridTemplateColumns = stepLabels.map(() => "auto 1fr").join(" ").replace(/ 1fr$/, "");

  return (
    <div className={styles.root}>
      <div className={styles.progressPanel}>
        <div className={styles.stepsGrid} style={{ gridTemplateColumns }}>
          {stepLabels.map((label, index) => {
            const stepNum = index + 1;
            const isActive = phase >= stepNum;
            return (
              <React.Fragment key={label}>
                <span
                  className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ""}`}
                  style={{ gridColumn: stepColumns[index], gridRow: 1 }}
                >
                  {label}
                </span>
                <span
                  className={`${styles.stepCircle} ${isActive ? styles.stepCircleActive : ""}`}
                  style={{ gridColumn: stepColumns[index], gridRow: 2 }}
                >
                  ✓
                </span>
              </React.Fragment>
            );
          })}
          {lineColumns.map((col, index) => {
            // Line[index] connects step (index+1) to step (index+2) — active once that next step is reached.
            const lineActive = phase >= index + 2;
            return (
              <span
                key={col}
                className={`${styles.line} ${lineActive ? styles.lineActive : ""}`}
                style={{ gridColumn: col, gridRow: 2 }}
              />
            );
          })}
        </div>
      </div>

      <p className={styles.messagePanel}>{message}</p>

      {orderType === 'delivery' && deliveryAddress && (
        <p className={styles.addressLine}>Delivering to: {deliveryAddress}</p>
      )}
    </div>
  );
}
