"use client";
import React from "react";
import styles from "./OrderStatusCard.module.css";

interface OrderStatusData {
  orderNo: string;
  phase: 1 | 2 | 3;
  message: string;
  stepLabels: [string, string, string];
  orderType?: 'pickup' | 'delivery';
  deliveryAddress?: string | null;
}

interface Props {
  orderStatus: OrderStatusData;
}

// Grid columns: step 1/2/3 sit at columns 1/3/5, the connecting lines at 2/4.
const STEP_COLUMNS = [1, 3, 5];
const LINE_COLUMNS = [2, 4];

export default function OrderStatusCard({ orderStatus }: Props) {
  const { phase, message, stepLabels, orderType, deliveryAddress } = orderStatus;

  return (
    <div className={styles.root}>
      <div className={styles.progressPanel}>
        <div className={styles.stepsGrid}>
          {stepLabels.map((label, index) => {
            const stepNum = index + 1;
            const isActive = phase >= stepNum;
            return (
              <React.Fragment key={label}>
                <span
                  className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ""}`}
                  style={{ gridColumn: STEP_COLUMNS[index], gridRow: 1 }}
                >
                  {label}
                </span>
                <span
                  className={`${styles.stepCircle} ${isActive ? styles.stepCircleActive : ""}`}
                  style={{ gridColumn: STEP_COLUMNS[index], gridRow: 2 }}
                >
                  ✓
                </span>
              </React.Fragment>
            );
          })}
          {LINE_COLUMNS.map((col, index) => {
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
