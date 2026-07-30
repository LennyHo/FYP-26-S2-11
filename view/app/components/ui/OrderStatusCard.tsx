"use client";
import React, { useEffect, useRef, useState } from "react";
import styles from "./OrderStatusCard.module.css";
import { getStoredUser } from "../../utils/api.base";
import { getOrderStatusCard } from "../../utils/customerApi";

interface OrderStatusData {
  orderId?: string;
  orderNo: string;
  phase: number;
  message: string;
  // 3 steps for pickup (Order Confirmed / Preparing / Ready), 4 for delivery
  // (Order Confirmed / Preparing / Out for Delivery / Delivered) — matches the
  // step count shown on the order-status tracking page for each order type.
  stepLabels: string[];
  orderType?: 'pickup' | 'delivery';
  deliveryAddress?: string | null;
  lang?: string;
}

interface Props {
  orderStatus: OrderStatusData;
}

// How often to poll for a fresher status while the order is still active.
// The order-status tracking page polls every 3s for the same reason — keep
// this widget in step with it so the two never visibly disagree for long.
const POLL_INTERVAL_MS = 4000;

export default function OrderStatusCard({ orderStatus: initialOrderStatus }: Props) {
  // Live, self-updating widget: once shown, this card keeps polling the backend
  // for the real current phase (drink prep is time-driven, not click-driven), so
  // the customer doesn't have to re-ask Avy just to see it move from "Preparing"
  // to "Ready" — same as leaving the order-status tracking page open.
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus);
  const orderIdRef = useRef(initialOrderStatus.orderId);
  const stoppedRef = useRef(false);

  useEffect(() => {
    const orderId = orderIdRef.current;
    const user = getStoredUser();

    // Nothing to poll for — either an older message from before this field
    // existed, or a guest session. Render statically, same as before.
    if (!orderId || !user?.id) return;

    let isActive = true;

    async function poll() {
      if (stoppedRef.current) return;

      try {
        const response = await getOrderStatusCard(orderId!, user!.id, orderStatus.lang || "en");
        if (!isActive) return;

        if (!response.data) {
          // Order is no longer active (completed/cancelled) — nothing left to
          // refresh. Leave the card at its last known state and stop polling.
          isActive = false;
          return;
        }

        setOrderStatus((current) => ({ ...current, ...response.data }));
      } catch {
        // A transient network hiccup shouldn't kill the widget — just try again
        // on the next tick.
      }
    }

    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The order-status page dispatches this the moment it confirms an order is
  // truly done (collected/delivered), to prompt for feedback. That can happen
  // a poll cycle or two before this card's own next refresh would otherwise
  // catch up — this listener snaps the card to fully complete in that exact
  // instant, so "Delivered"/"Collected" is never still showing as in-progress
  // right as the feedback request appears underneath it.
  useEffect(() => {
    function handleFeedbackPrompt(event: Event) {
      const customEvent = event as CustomEvent<{ feedbackOrderId?: string }>;
      if (!customEvent.detail?.feedbackOrderId || customEvent.detail.feedbackOrderId !== orderIdRef.current) return;

      stoppedRef.current = true;
      setOrderStatus((current) => ({
        ...current,
        phase: current.stepLabels.length,
        message: current.orderType === 'delivery'
          ? 'Your drink has been delivered! Enjoy.'
          : 'Your drink has been collected! Enjoy.',
      }));
    }

    window.addEventListener("chatbotSystemMessage", handleFeedbackPrompt);
    return () => window.removeEventListener("chatbotSystemMessage", handleFeedbackPrompt);
  }, []);

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
