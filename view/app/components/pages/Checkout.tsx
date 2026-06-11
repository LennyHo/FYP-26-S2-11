"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../layout/Header";
import {
    checkoutCart,
    getOrder,
    getCartItems,
    getStoredUser,
    parseLocalCartLine,
    type DripTeaCartItem,
} from "../../utils/dripteaApi";
import "./Checkout.css";

type CheckoutItem = {
    name: string;
    details: string;
    price: number;
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

    return {
        name: item.name,
        details,
        price: Number(item.lineTotal || 0),
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
    const [paymentMethod, setPaymentMethod] = useState("fake_card");
    const [voucherCode, setVoucherCode] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

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
            Back to cart
        </button>
        )}

        {confirmation ? (
        <section className="order-status-page">
            <div className="order-progress">
            <div className={`progress-step ${getProgressStep(confirmation.status) >= 1 ? "active" : ""}`}>
                <span>1</span>
                <strong>Order sent!</strong>
            </div>

            <div className={`progress-line ${getProgressStep(confirmation.status) >= 2 ? "active" : ""}`} />

            <div className={`progress-step ${getProgressStep(confirmation.status) >= 2 ? "active" : ""}`}>
                <span>2</span>
                <strong>Drinks in<br />progress..</strong>
            </div>

            <div className={`progress-line ${getProgressStep(confirmation.status) >= 3 ? "active" : ""}`} />

            <div className={`progress-step ${getProgressStep(confirmation.status) >= 3 ? "active" : ""}`}>
                <span>3</span>
                <strong>Ready for<br />collection!</strong>
            </div>
            </div>

            <div className="order-status-content">
            <div className="clock-visual">10 min</div>

            <div className="order-info">
                <h1>Order Number: {confirmation.orderNo}</h1>

                <p>
                <strong>Customization:</strong> {confirmation.details}
                </p>

                <p>
                <strong>Total Price:</strong> S$ {confirmation.total.toFixed(2)}
                </p>

                <p>
                <strong>Estimated Time:</strong> 10 Minutes
                </p>

                <p>
                <strong>Status:</strong> {getCustomerStatusLabel(confirmation.status)}
                </p>
            </div>
            </div>

            <button
            type="button"
            className="back-menu-wide-btn"
            onClick={() => router.push("/buy-driptea")}
            >
            Back to Menu
            </button>
        </section>
        ) : (
        <section className="checkout-card">
            <p className="checkout-label">Checkout</p>
            <h1>Fake payment</h1>

            <div className="checkout-content">
            <div className="checkout-items">
                {items.length === 0 ? (
                <p>Your cart is empty.</p>
                ) : (
                items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="checkout-item">
                    <div>
                        <strong>{item.name}</strong>
                        <p>{item.details}</p>
                    </div>

                    <strong>S$ {item.price.toFixed(2)}</strong>
                    </div>
                ))
                )}
            </div>

            <label className="checkout-field">
                Payment method
                <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                >
                <option value="fake_card">Fake card</option>
                <option value="fake_wallet">Fake wallet</option>
                <option value="fake_counter">Pay at counter</option>
                </select>
            </label>

            <label className="checkout-field">
                Voucher code optional
                <input
                value={voucherCode}
                onChange={(event) => setVoucherCode(event.target.value)}
                placeholder="Enter voucher code"
                />
            </label>

            <div className="checkout-footer">
                <strong>Total: S$ {total.toFixed(2)}</strong>

                <button
                type="button"
                onClick={handleFakePayment}
                disabled={items.length === 0 || isProcessing}
                >
                {isProcessing ? "Processing..." : "Pay with fake payment"}
                </button>
            </div>

            {statusMessage && (
                <p role="alert" className="checkout-error">
                {statusMessage}
                </p>
            )}
            </div>
        </section>
        )}
    </main>
    </div>
    );
}
