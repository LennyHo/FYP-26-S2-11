"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../layout/Header";
import {
    checkoutCart,
    getOrder,
    getCartItems,
    getStoredUser,
    updateOrderStatus,
    parseLocalCartLine,
    type DripTeaCartItem,
} from "../../utils/dripteaApi";
import "./Checkout.css";

type CheckoutItem = {
    name: string;
    details: string;
    price: number;
    image?: string;
    fields?: Array<{ label: string; value: string }>;
};

type Confirmation = {
    orderId: string;
    orderNo: string;
    paymentStatus: string;
    status: string;
    total: number;
    details: string;
};

function parseLocalCart(): CheckoutItem[] {
    if (typeof window === "undefined") return [];

    const savedData = window.localStorage.getItem("dripTeaCartData");
    if (!savedData) return [];

    return savedData
    .split("\n")
    .map((line) => {
        const parsedCartLine = parseLocalCartLine(line);

        if (parsedCartLine) {
        return {
            name: parsedCartLine.name,
            details: parsedCartLine.details,
            price: parsedCartLine.price,
            image: parsedCartLine.imageSrc,
        };
        }

        const parts = line.split("|");
        if (parts.length < 3) return null;

        const price = Number(parts[2].replace(/[^0-9.]/g, ""));
        if (Number.isNaN(price)) return null;

        return {
        name: parts[0].replace(/\s*\([^)]*\)\s*$/, "").trim(),
        details: parts[1].trim(),
        price,
        };
    })
    .filter((item): item is CheckoutItem => Boolean(item));
}

function fromBackendCart(items: DripTeaCartItem[]): CheckoutItem[] {
    return items.map((item) => {
    const toppings = Array.isArray(item.customization?.toppings)
        ? (item.customization.toppings as string[]).join(", ")
        : "";

    const details = [
        item.quantity ? `x${item.quantity}` : "",
        typeof item.customization?.size === "string" ? item.customization.size : "",
        typeof item.customization?.ice === "string" ? item.customization.ice : "",
        typeof item.customization?.sugar === "string" ? item.customization.sugar : "",
        toppings,
    ]
        .filter(Boolean)
        .join(", ");

    const fields: Array<{ label: string; value: string }> = [];
    if (item.quantity) fields.push({ label: "Quantity", value: String(item.quantity) });
    if (typeof item.customization?.size === "string") fields.push({ label: "Size", value: item.customization.size });
    if (typeof item.customization?.ice === "string") fields.push({ label: "Ice Level", value: item.customization.ice });
    if (typeof item.customization?.sugar === "string") fields.push({ label: "Sugar", value: item.customization.sugar });
    if (toppings) fields.push({ label: "Toppings", value: toppings });

    return {
        name: item.name,
        details,
        price: Number(item.lineTotal || 0),
        image: item.image,
        fields,
    };
    });
}

function buildOrderDetails(items: CheckoutItem[]) {
    if (!items.length) return "No customization recorded";

    return items
    .map((item) => `${item.name}: ${item.details}`)
    .join(" | ");
}

function makeGuestOrderNo() {
  return String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0");
}

function getProgressStep(status: string) {
    const normalized = status.toLowerCase();
    if (normalized === "completed" || normalized === "ready") return 3;
    if (normalized === "preparing") return 2;
    if (normalized === "cancelled") return 0;
    return 1;
}

function getCustomerStatusLabel(status: string) {
    switch (status.toLowerCase()) {
        case "preparing":
            return "Drinks in progress";
        case "ready":
            return "Ready for collection";
        case "completed":
            return "Completed";
        case "cancelled":
            return "Cancelled";
        default:
            return "Order received";
    }
}

export default function Checkout() {
    const router = useRouter();

    const [items, setItems] = useState<CheckoutItem[]>([]);
    const [paymentMethod] = useState("fake_card");
    const [voucherCode, setVoucherCode] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [cardName, setCardName] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const [phase, setPhase] = useState<1 | 2 | 3>(1);
    const [countdown, setCountdown] = useState(8);
    const [collected, setCollected] = useState(false);

    function fillFakeDetails() {
        setCardNumber("4532 1234 5678 9012");
        setCardName("John Doe");
        setExpiryDate("12/2026");
        setCvv("123");
    }

    const total = items.reduce((sum, item) => sum + item.price, 0);

    useEffect(() => {
    async function loadCheckoutCart() {
        const currentUser = getStoredUser();

        if (currentUser) {
        try {
            const response = await getCartItems(currentUser.id);
            setItems(fromBackendCart(response.data || []));
            return;
        } catch (error) {
            console.error("[DripTea checkout cart]", error);
        }
        }

        setItems(parseLocalCart());
    }

    void loadCheckoutCart();
}, []);

    useEffect(() => {
        if (!confirmation || confirmation.orderId.startsWith("GUEST-")) return;

        let isActive = true;
        const orderId = confirmation.orderId;

        async function refreshOrderStatus() {
            try {
                const response = await getOrder(orderId);
                if (!isActive) return;

                setConfirmation(current => {
                    if (!current) return current;

                    return {
                        ...current,
                        orderNo: response.data.orderNo || current.orderNo,
                        status: response.data.status || current.status,
                        total: Number(response.data.totalAmount || current.total),
                    };
                });
            } catch (error) {
                console.error("[DripTea order status]", error);
            }
        }

        void refreshOrderStatus();
        const timer = window.setInterval(() => void refreshOrderStatus(), 3000);

        return () => {
            isActive = false;
            window.clearInterval(timer);
        };
    }, [confirmation?.orderId]);

    // Sequential phase timer: 8 s (order sent) → 20 s countdown → ready for collection
    useEffect(() => {
        if (!confirmation) return;

        setPhase(1);
        let count = 8;
        setCountdown(count);
        let running = true;
        let activeTimer: ReturnType<typeof setInterval>;

        const startPhase2 = () => {
            setPhase(2);
            count = 20;
            setCountdown(count);
            activeTimer = window.setInterval(() => {
                if (!running) return;
                count--;
                setCountdown(count);
                if (count <= 0) {
                    window.clearInterval(activeTimer);
                    setPhase(3);
                    if (!confirmation.orderId.startsWith("GUEST-")) {
                        void updateOrderStatus(confirmation.orderId, "ready").catch(console.error);
                    }
                }
            }, 1000);
        };

        activeTimer = window.setInterval(() => {
            if (!running) return;
            count--;
            setCountdown(count);
            if (count <= 0) {
                window.clearInterval(activeTimer);
                startPhase2();
            }
        }, 1000);

        return () => {
            running = false;
            window.clearInterval(activeTimer);
        };
    }, [confirmation?.orderId]);

    async function handleFakePayment() {
        setStatusMessage("");
        setIsProcessing(true);

        try {
        const currentUser = getStoredUser();
        const orderDetails = buildOrderDetails(items);

        if (currentUser) {
            const result = await checkoutCart(
            currentUser.id,
            paymentMethod,
            voucherCode ? voucherCode.trim() : undefined
            );

            window.localStorage.removeItem("dripTeaCartData");
            window.dispatchEvent(new Event("cartUpdated"));
            setItems([]);

            setConfirmation({
            orderId: result.order.id,
            orderNo: result.order.orderNo || result.order.displayOrderNo || result.order.id,
            paymentStatus: result.payment.status,
            status: result.order.status,
            total: result.order.totalAmount,
            details: orderDetails,
            });

            return;
        }

    const fakeOrderId = `GUEST-${Date.now().toString(36).toUpperCase()}`;

    window.localStorage.removeItem("dripTeaCartData");
    window.dispatchEvent(new Event("cartUpdated"));
    setItems([]);

    setConfirmation({
        orderId: fakeOrderId,
        orderNo: `GUEST-${makeGuestOrderNo()}`,
        paymentStatus: "paid",
        status: "pending",
        total,
        details: orderDetails,
    });
    } catch (error) {
    setStatusMessage(error instanceof Error ? error.message : "Payment failed.");
    } finally {
    setIsProcessing(false);
    }
}

return (
    <div className="checkout-page">
    <Header />

    <main className="checkout-main">
        {!confirmation && (
        <button
            type="button"
            className="checkout-back-btn"
            onClick={() => router.push("/cart")}
        >
            ← Back to cart
        </button>
        )}

        {confirmation ? (
        <section className="order-status-page">
            {/* Progress bar — driven by phase */}
            <div className="order-progress">
            <div className={`progress-step ${phase >= 1 ? "active" : ""}`}>
                <span>1</span>
                <strong>Order sent!</strong>
            </div>
            <div className={`progress-line ${phase >= 2 ? "active" : ""}`} />
            <div className={`progress-step ${phase >= 2 ? "active" : ""}`}>
                <span>2</span>
                <strong>Drinks in<br />progress..</strong>
            </div>
            <div className={`progress-line ${phase >= 3 ? "active" : ""}`} />
            <div className={`progress-step ${phase >= 3 ? "active" : ""}`}>
                <span>3</span>
                <strong>Ready for<br />collection!</strong>
            </div>
            </div>

            {/* Phase 1 — order sent notification with cover image */}
            {phase === 1 && (
            <div className="order-status-content">
                <img
                src="/buy_dripTea_cover.png"
                alt="Order sent"
                className="order-sent-img"
                />
                <div className="order-info">
                <h1>Order #{confirmation.orderNo}</h1>
                <p>Your order has been sent to our baristas!</p>
                <p><strong>Total Price:</strong> S$ {confirmation.total.toFixed(2)}</p>
                <p className="order-phase1-hint">Preparing in {countdown}s…</p>
                </div>
            </div>
            )}

            {/* Phase 2 — 2:50 countdown */}
            {phase === 2 && (
            <div className="order-status-content">
                <div className="clock-visual">
                {countdown > 0
                    ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
                    : "Done!"}
                </div>
                <div className="order-info">
                <h1>Order #{confirmation.orderNo}</h1>
                <p><strong>Customization:</strong> {confirmation.details}</p>
                <p><strong>Total Price:</strong> S$ {confirmation.total.toFixed(2)}</p>
                <p><strong>Estimated Time:</strong> 20 sec</p>
                <p><strong>Status:</strong> Drinks in progress…</p>
                </div>
            </div>
            )}

            {/* Phase 3 — ready for collection */}
            {phase === 3 && !collected && (
            <div className="order-status-content">
                <div className="clock-visual-ready">Ready for<br />collection!</div>
                <div className="order-info">
                <h1>Order #{confirmation.orderNo}</h1>
                <p>Your drink is ready! Please collect at the counter.</p>
                <p><strong>Total Price:</strong> S$ {confirmation.total.toFixed(2)}</p>
                <button
                    type="button"
                    className="collect-btn"
                    onClick={async () => {
                        if (!confirmation.orderId.startsWith("GUEST-")) {
                            await updateOrderStatus(confirmation.orderId, "completed").catch(console.error);
                        }
                        setCollected(true);
                    }}
                >
                    Click to Collect
                </button>
                </div>
            </div>
            )}

            {/* Collected — affirmative message */}
            {collected && (
            <div className="order-collected">
                <div className="order-collected-icon">✓</div>
                <h2>Collected! Enjoy your drink!</h2>
                <p>Thank you for your order. We hope to see you again!</p>
            </div>
            )}

            {collected ? (
            <div className="order-collected-actions">
                <button
                type="button"
                className="order-more-btn"
                onClick={() => router.push("/buy-driptea")}
                >
                Order More
                </button>
                <button
                type="button"
                className="back-menu-wide-btn"
                onClick={() => router.push("/purchase-history")}
                >
                Back to Purchase History
                </button>
            </div>
            ) : (
            <button
                type="button"
                className="back-menu-wide-btn"
                onClick={() => router.push("/buy-driptea")}
            >
                Back to Menu
            </button>
            )}
        </section>

        ) : (
        <section className="checkout-card">
            <div className="checkout-two-col">

            {/* LEFT — payment form */}
            <div className="checkout-form-col">
                <div className="checkout-form-header">
                    <p className="checkout-label">Credit Card</p>
                    <div className="checkout-card-logos">
                        {/* Mastercard */}
                        <svg width="38" height="24" viewBox="0 0 38 24" aria-label="Mastercard">
                            <circle cx="14" cy="12" r="10" fill="#EB001B" />
                            <circle cx="24" cy="12" r="10" fill="#F79E1B" />
                            <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00" />
                        </svg>
                        {/* Amex */}
                        <svg width="38" height="24" viewBox="0 0 38 24" aria-label="American Express">
                            <rect width="38" height="24" rx="4" fill="#2557D6" />
                            <text x="19" y="16" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="Arial">AMEX</text>
                        </svg>
                    </div>
                </div>

                <button type="button" className="checkout-fill-btn" onClick={fillFakeDetails}>
                    Fill Demo Details
                </button>

                <label className="checkout-field">
                    Credit Card Number
                    <input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Key in the full credit card number"
                        maxLength={19}
                    />
                </label>

                <label className="checkout-field">
                    Name
                    <input
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Key in your full name on the credit card"
                    />
                </label>

                <div className="checkout-row">
                    <label className="checkout-field">
                        Expiry Date
                        <input
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            placeholder="MM/YYYY"
                            maxLength={7}
                        />
                    </label>
                    <label className="checkout-field">
                        CVV
                        <input
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            placeholder="CVV"
                            maxLength={4}
                            type="password"
                        />
                    </label>
                </div>

                <label className="checkout-field">
                    Voucher
                    <input
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        placeholder="Key in the voucher code"
                    />
                </label>

                {/* Mobile only — confirm button after the payment form */}
                {statusMessage && (
                    <p role="alert" className="checkout-error checkout-confirm-mobile">{statusMessage}</p>
                )}
                <div className="checkout-confirm-row checkout-confirm-mobile">
                    <button
                        type="button"
                        className="checkout-confirm-btn"
                        onClick={handleFakePayment}
                        disabled={items.length === 0 || isProcessing}
                    >
                        {isProcessing ? "Processing..." : "Confirm Payment"}
                    </button>
                </div>
            </div>

            {/* RIGHT — cart summary */}
            <div className="checkout-cart-col">
                <h2>Your Shopping Cart</h2>

                <div className="checkout-items">
                    {items.length === 0 ? (
                        <p>Your cart is empty.</p>
                    ) : (
                        items.map((item, index) => (
                            <div key={`${item.name}-${index}`} className="checkout-item">
                                <div className="checkout-item-index">{index + 1}.</div>
                                <img
                                    src={item.image || "/img/no-image.png"}
                                    alt={item.name}
                                    className="checkout-item-img"
                                />
                                <div className="checkout-item-info">
                                    <strong>{item.name}</strong>
                                    {item.fields && item.fields.length > 0 ? (
                                        <div className="checkout-item-fields">
                                            {item.fields.map(f => (
                                                <p key={f.label}><span className="checkout-item-field-label">{f.label}:</span> {f.value}</p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p>{item.details}</p>
                                    )}
                                </div>
                                <strong className="checkout-item-price">S$ {item.price.toFixed(2)}</strong>
                            </div>
                        ))
                    )}
                </div>

                <div className="checkout-total">
                    <span>Total Price:</span>
                    <strong>S$ {total.toFixed(2)}</strong>
                </div>

                {/* Desktop only — hidden on mobile so button sits below the payment form */}
                {statusMessage && (
                    <p role="alert" className="checkout-error checkout-confirm-desktop">{statusMessage}</p>
                )}

                <div className="checkout-confirm-row checkout-confirm-desktop">
                    <button
                        type="button"
                        className="checkout-confirm-btn"
                        onClick={handleFakePayment}
                        disabled={items.length === 0 || isProcessing}
                    >
                        {isProcessing ? "Processing..." : "Confirm Payment"}
                    </button>
                </div>
            </div>

            </div>
        </section>
        )}
    </main>
    </div>
    );
}
