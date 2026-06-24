"use client";

import { useState } from "react";
import styles from "./FeedbackPromptCard.module.css";
import { submitFeedback } from "../../utils/customerApi";
import { getStoredUser } from "../../utils/api.base";

type Props = {
    orderId: string;
    items: any[];
    onOpenPage: () => void;
};

export default function FeedbackPromptCard({ orderId, items, onOpenPage }: Props) {
    const [ratings, setRatings] = useState<Record<number, number>>({});
    const [comment, setComment] = useState("");
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit() {
        const user = getStoredUser();

    if (!user) {
        setMessage("Please log in first.");
        return;
    }

    for (let i = 0; i < items.length; i++) {
        if (!ratings[i]) {
            setMessage(`Please rate ${items[i].name}.`);
            return;
        }
    }

    try {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await submitFeedback({
            userId: user.id,
            orderId,
            menuItemId: item.menuItemId,
            menuItemCode: item.menuItemCode,
            drinkName: item.name,
            rating: ratings[i],
            comment,
            });
        }

        setSubmitted(true);
        setMessage("Thank you! Your feedback has been submitted.");
    } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to submit feedback.");
    }
    }

    function formatCustomization(customization?: any) {
        const toppings = Array.isArray(customization?.toppings)
        ? customization.toppings.join(", ")
        : "";

        return [
        customization?.size,
        customization?.ice,
        customization?.sugar,
        toppings,
        ]
        .filter(Boolean)
        .join(" · ");
    }

    return (
    <div className={styles.card}>
        {items.map((item, index) => (
        <div key={`${item.name}-${index}`} className={styles.itemBlock}>
            <strong>{item.name} × {item.quantity}</strong>
            <p>{formatCustomization(item.customization)}</p>

            <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                key={star}
                type="button"
                disabled={submitted}
                className={star <= (ratings[index] || 0) ? styles.starActive : styles.star}
                onClick={() =>
                    setRatings((prev) => ({
                    ...prev,
                    [index]: star,
                    }))
                }
                >
                ★
                </button>
            ))}
            </div>
        </div>
        ))}

        <textarea
        className={styles.comment}
        value={comment}
        disabled={submitted}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Any comments? Optional."
        />

        {message && <p className={styles.message}>{message}</p>}

        <div className={styles.actions}>
        <button
            type="button"
            className={styles.submitBtn}
            disabled={submitted}
            onClick={handleSubmit}
        >
            {submitted ? "Submitted" : "Submit Feedback"}
        </button>

        {/*<button
            type="button"
            className={styles.openPageBtn}
            onClick={onOpenPage}
        >
            Open Feedback Page
        </button>*/}
        </div>
    </div>
    );
}