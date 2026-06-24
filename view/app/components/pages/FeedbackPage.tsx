"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../layout/Header";
import { getPurchaseHistory, submitFeedback } from "../../utils/customerApi";
import { getStoredUser } from "../../utils/api.base";
import "./FeedbackPage.css";

type FeedbackForm = {
    rating: number;
    comment: string;
};

export default function FeedbackPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = String(params.orderId || "");

    const [order, setOrder] = useState<any>(null);
    const [forms, setForms] = useState<Record<number, FeedbackForm>>({});
    const [message, setMessage] = useState("");

    useEffect(() => {
    async function loadOrder() {
        const user = getStoredUser();

        if (!user) {
        setMessage("Please log in first.");
        return;
        }

        const response = await getPurchaseHistory(user.id);
        const selectedOrder = response.data?.find((o: any) => o.id === orderId);

        if (!selectedOrder) {
        setMessage("Order not found.");
        return;
        }

        setOrder(selectedOrder);

        const initialForms: Record<number, FeedbackForm> = {};
        selectedOrder.items.forEach((_item: any, index: number) => {
        initialForms[index] = {
            rating: 0,
            comment: "",
        };
        });

        setForms(initialForms);
    }

    void loadOrder();
    }, [orderId]);

    function updateRating(index: number, rating: number) {
        setForms((prev) => ({
            ...prev,
            [index]: {
            ...prev[index],
            rating,
            },
        }));
    }

    function updateComment(index: number, comment: string) {
        setForms((prev) => ({
            ...prev,
            [index]: {
            ...prev[index],
            comment,
            },
        }));
    }

    async function handleSubmit() {
    try {
        const user = getStoredUser();

        if (!user) {
        setMessage("Please log in first.");
        return;
        }

        if (!order) return;

        for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const form = forms[i];

        if (!form || form.rating < 1) {
            setMessage(`Please select a rating for ${item.name}.`);
            return;
        }

        await submitFeedback({
            userId: user.id,
            orderId: order.id,
            menuItemId: item.menuItemId,
            menuItemCode: item.menuItemCode,
            drinkName: item.name,
            rating: form.rating,
            comment: form.comment,
        });
        }

        setMessage("Thank you! Your feedback has been submitted.");

        setTimeout(() => {
        router.push("/purchase-history");
        }, 1200);
    } catch (error) {
        setMessage(
        error instanceof Error ? error.message : "Failed to submit feedback."
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
            <div className="feedback-card-header">
                <h1 className="feedback-card-title">Leave a Review</h1>
                {order && (
                    <p className="feedback-order-no">Order #{order.displayOrderNo || order.orderNo}</p>
                )}
            </div>

            <div className="feedback-card-body">
                {message && <p className="feedback-message">{message}</p>}

                {order && (
                <>
                    <div className="feedback-item-list">
                    {order.items.map((item: any, index: number) => (
                        <div key={`${item.name}-${index}`} className="feedback-item-card">
                        <div className="feedback-item">
                            <img
                            src={item.image || "/img/no-image.png"}
                            alt={item.name}
                            className="feedback-item-image"
                            />
                            <div className="feedback-item-info">
                                <h2>{item.name}</h2>
                                <span className="feedback-item-qty">× {item.quantity}</span>
                            </div>
                        </div>

                        <div className="feedback-section">
                            <label>Rating</label>
                            <div className="feedback-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                key={star}
                                type="button"
                                className={star <= (forms[index]?.rating || 0) ? "star active" : "star"}
                                onClick={() => updateRating(index, star)}
                                >
                                ★
                                </button>
                            ))}
                            </div>
                            {!forms[index]?.rating && (
                                <span className="feedback-star-hint">Tap a star to rate</span>
                            )}
                        </div>

                        <div className="feedback-section">
                            <label>Comments (optional)</label>
                            <textarea
                            value={forms[index]?.comment || ""}
                            onChange={(e) => updateComment(index, e.target.value)}
                            placeholder={`What did you think of the ${item.name}?`}
                            />
                        </div>
                        </div>
                    ))}
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
            </div>
        </section>
        </main>
    </div>
    );
}