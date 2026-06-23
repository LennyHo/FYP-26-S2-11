"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../layout/Header";
import { getPurchaseHistory, submitFeedback } from "../../utils/customerApi";
import { getStoredUser } from "../../utils/api.base";
import "./FeedbackPage.css";

export default function FeedbackPage() {
    const router = useRouter();
    const params = useParams();

    const orderId = String(params.orderId || "");
    const itemIndex = Number(params.itemIndex || 0);

    const [item, setItem] = useState<any>(null);
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
    async function loadItem() {
        const user = getStoredUser();

        if (!user) {
        setMessage("Please log in first.");
        return;
        }

        const response = await getPurchaseHistory(user.id);
        const order = response.data?.find((o: any) => o.id === orderId);
        const selectedItem = order?.items?.[itemIndex];

        if (!selectedItem) {
        setMessage("Purchased item not found.");
        return;
        }

        setItem(selectedItem);
    }

    void loadItem();
    }, [orderId, itemIndex]);

    async function handleSubmit() {
        try {
        if (!item) return;

        if (rating < 1) {
            setMessage("Please select a rating.");
            return;
        }

        const user = getStoredUser();

        if (!user) {
            setMessage("Please log in first.");
            return;
        }

        await submitFeedback({
            userId: user.id,
            orderId,
            menuItemId: item.menuItemId,
            menuItemCode: item.menuItemCode,
            drinkName: item.name,
            rating,
            comment: feedback,
        });

        setMessage("Thank you! Your feedback has been submitted.");

        setTimeout(() => {
            router.push("/purchase-history");
        }, 1500);
        } catch (error) {
        setMessage(
            error instanceof Error
            ? error.message
            : "Failed to submit feedback."
        );
        }
    }

    return (
    <div className="feedback-page">
        <Header />

        <main className="feedback-main">
        <button
            type="button"
            className="feedback-back-btn"
            onClick={() => router.push("/purchase-history")}
        >
            ← Back to Purchase History
        </button>

        <section className="feedback-card">
            <h1>Feedback</h1>

            {message && <p className="feedback-message">{message}</p>}

            {item && (
            <>
                <div className="feedback-item">
                <img
                    src={item.image || "/img/no-image.png"}
                    alt={item.name}
                    className="feedback-item-image"
                />

                <div>
                    <h2>{item.name}</h2>
                    <p>Quantity: {item.quantity}</p>
                </div>
                </div>

                <div className="feedback-section">
                <label>Rating</label>

                <div className="feedback-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={star <= rating ? "star active" : "star"}
                        onClick={() => setRating(star)}
                    >
                    ★
                    </button>
                ))}
                </div>
            </div>

            <div className="feedback-section">
                <label>Feedback optional</label>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us what you think about this beverage..."
                />
            </div>

            <button
                type="button"
                className="feedback-submit-btn"
                onClick={handleSubmit}
            >
                Submit Feedback
            </button>
            </>
        )}
        </section>
    </main>
    </div>
    );
}