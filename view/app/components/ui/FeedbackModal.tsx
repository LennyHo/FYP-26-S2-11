"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { submitFeedback } from "../../utils/customerApi";
import { getStoredUser, type DripTeaPurchaseHistoryItem } from "../../utils/api.base";
import styles from "./FeedbackModal.module.css";

interface Props {
  order: DripTeaPurchaseHistoryItem;
  onClose: () => void;
  onSubmitted: () => void;
}

function formatCustomization(customization?: Record<string, unknown>) {
  if (!customization) return "";
  const c = customization as { size?: string; ice?: string; sugar?: string; toppings?: string[] };
  const toppings = Array.isArray(c.toppings) ? c.toppings.join(", ") : "";
  return [c.size, c.ice, c.sugar, toppings].filter(Boolean).join(" · ");
}

export default function FeedbackModal({ order, onClose, onSubmitted }: Props) {
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [overallComment, setOverallComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const items = order.items || [];

  function setRating(index: number, rating: number) {
    setRatings((prev) => ({ ...prev, [index]: rating }));
  }

  async function handleSubmit() {
    const missingIndex = items.findIndex((_, index) => !ratings[index]);
    if (missingIndex !== -1) {
      setError(`Please rate ${items[missingIndex].name} before submitting.`);
      return;
    }

    const user = getStoredUser();
    if (!user) {
      setError("Please log in first.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await submitFeedback({
          userId: user.id,
          orderId: order.id,
          menuItemId: item.menuItemId || "",
          menuItemCode: item.menuItemCode,
          drinkName: item.name,
          rating: ratings[i],
          comment: overallComment.trim(),
        });
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Rate Your Order</h2>
            <p className={styles.subtitle}>Order #{order.displayOrderNo || order.orderNo}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.itemList}>
            {items.map((item, index) => {
              const rating = ratings[index] || 0;
              const detail = formatCustomization(item.customization);
              return (
                <div key={`${item.name}-${index}`} className={styles.itemRow}>
                  <img src={item.image || "/img/no-image.png"} alt={item.name} className={styles.itemImage} />
                  <div className={styles.itemInfo}>
                    <strong>{item.name} × {item.quantity}</strong>
                    {detail && <span className={styles.itemDetail}>{detail}</span>}
                  </div>
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`${styles.star} ${star <= rating ? styles.starActive : ""}`}
                        onClick={() => setRating(index, star)}
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.commentField}>
            <label className={styles.commentLabel}>Overall Comments <span className={styles.optional}>(optional)</span></label>
            <textarea
              className={styles.textarea}
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="How was your order overall?"
              rows={3}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.submitBtn} onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
