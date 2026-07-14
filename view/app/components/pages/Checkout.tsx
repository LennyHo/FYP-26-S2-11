"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Header from "../layout/Header";
import { checkoutCart, getCartItems, getVouchers, applyVoucher } from "../../utils/customerApi";
import type { DripTeaVoucher } from "../../utils/api.base";
import { getOrder, updateOrderStatus } from "../../utils/staffApi";
import { getStoredUser, parseLocalCartLine, PENDING_VOUCHER_KEY, type DripTeaCartItem } from "../../utils/api.base";
import { useOutlets, type DripTeaOutlet } from "../../utils/outlets";
import OrderTypeSelect from "./OrderTypeSelect";
import VoucherSelect from "./VoucherSelect";
import "./Checkout.css";

const PICKUP_OUTLET_KEY = "driptea_pickup_outlet";

// Client-only outlet photos — the stores collection has no image field, so
// this maps each outlet by name to the building it's located in.
const OUTLET_IMAGES: Record<string, string> = {
    "DripTea Jurong East": "/img/Jem_Mall.jpg",
    "DripTea Orchard": "/img/313somerset.webp",
};

const CheckoutDeliveryAddress = dynamic(() => import("./CheckoutDeliveryAddress"), {
    ssr: false,
});

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

export type DeliveryData = {
    type: string;
    storeCode: string;
    outletName: string;
    outletAddress: string;
    outletLat: number;
    outletLng: number;
    customerLat: number;
    customerLng: number;
    customerAddress?: string;
    distanceKm: number;
    deliveryFee: number;
    deliveryStatus: string;
};

const ORDER_TRACKING_KEY = "driptea_order_tracking";

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

function buildOrderDetails(items: CheckoutItem[], delivery: DeliveryData | null) {
    const itemDetails = items.length
        ? items.map((item) => `${item.name}: ${item.details}`).join(" | ")
        : "No customization recorded";

    if (!delivery) return itemDetails;

    return `${itemDetails} | Delivery to ${delivery.customerLat.toFixed(5)}, ${delivery.customerLng.toFixed(5)} | Distance ${delivery.distanceKm.toFixed(2)} km`;
}

function makeGuestOrderNo() {
    return String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0");
}

function saveOrderTrackingSnapshot(
    orderId: string,
    orderNo: string,
    items: CheckoutItem[],
    delivery: DeliveryData | null,
    subtotal: number,
    deliveryFee: number,
    discountAmount: number,
    total: number
) {
    if (typeof window === "undefined") return;

    try {
        const current = JSON.parse(window.localStorage.getItem(ORDER_TRACKING_KEY) || "{}");
        current[orderId] = {
            orderNo,
            items,
            delivery,
            subtotal,
            deliveryFee,
            discountAmount,
            total,
            savedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(ORDER_TRACKING_KEY, JSON.stringify(current));
    } catch (error) {
        console.error("[DripTea order tracking snapshot]", error);
    }
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
            return "Ready";
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
    const [delivery, setDelivery] = useState<DeliveryData | null>(null);
    const [paymentMethod] = useState("fake_card");
    const [vouchers, setVouchers] = useState<DripTeaVoucher[]>([]);
    const [voucherCode, setVoucherCode] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [voucherMessage, setVoucherMessage] = useState("");
    const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
    const [cardNumber, setCardNumber] = useState("");
    const [cardName, setCardName] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");
    const [cardFieldErrors, setCardFieldErrors] = useState<{
        cardNumber?: boolean;
        cardName?: boolean;
        expiryDate?: boolean;
        cvv?: boolean;
    }>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const [phase, setPhase] = useState<1 | 2 | 3>(1);
    const [countdown, setCountdown] = useState(8);
    const [collected, setCollected] = useState(false);
    const [orderType, setOrderType] = useState("");
    const [deliveryPreview, setDeliveryPreview] = useState<DeliveryData | null>(null);
    const [rightStep, setRightStep] = useState<1 | 2>(1);
    const [pickupOutlet, setPickupOutlet] = useState<DripTeaOutlet | null>(null);
    const { outlets: pickupOutlets } = useOutlets();

    function fillFakeDetails() {
        setCardNumber("4532 1234 5678 9012");
        setCardName("John Doe");
        setExpiryDate("12/2026");
        setCvv("123");
        setCardFieldErrors({});
    }

    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const displayedDelivery = deliveryPreview || delivery;
    const deliveryFee = displayedDelivery?.deliveryFee ?? 0;
    const total = Math.max(subtotal - discountAmount, 0) + deliveryFee;
    const isDeliveryOrder = Boolean(displayedDelivery);
    const needsDeliveryAddress = orderType === "delivery" && !delivery;
    const isDelivery = orderType === "delivery";

    useEffect(() => {
        async function loadVouchers() {
            try {
                const response = await getVouchers();
                setVouchers(response.data || []);
            } catch (error) {
                console.error("[DripTea vouchers]", error);
            }
        }

        void loadVouchers();
    }, []);

    useEffect(() => {
        setOrderType(window.localStorage.getItem("driptea_order_type") || "");
    }, []);

    // Pre-select the voucher the customer chose via "USE NOW" on the Voucher page.
    // Waits for both the voucher catalogue and the cart (for the subtotal) to load,
    // then applies it once — items.length gates against firing on an empty cart.
    const pendingVoucherAppliedRef = useRef(false);
    useEffect(() => {
        if (pendingVoucherAppliedRef.current) return;
        if (!vouchers.length || !items.length) return;

        const pendingCode = window.localStorage.getItem(PENDING_VOUCHER_KEY);
        if (!pendingCode) return;

        pendingVoucherAppliedRef.current = true;
        window.localStorage.removeItem(PENDING_VOUCHER_KEY);
        void handleVoucherChange(pendingCode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vouchers, items]);

    async function handleVoucherChange(code: string) {
        setVoucherCode(code);
        setVoucherMessage("");

        if (!code) {
            setDiscountAmount(0);
            return;
        }

        setIsApplyingVoucher(true);

        try {
            const currentUser = getStoredUser();
            const response = await applyVoucher({
                userId: currentUser?.id,
                voucherCode: code,
                subtotal,
            });

            setDiscountAmount(response.data.discountAmount);
            setVoucherMessage(`"${response.data.voucher.title}" applied — S$ ${response.data.discountAmount.toFixed(2)} off.`);
        } catch (error) {
            setDiscountAmount(0);
            setVoucherCode("");
            setVoucherMessage(error instanceof Error ? error.message : "Failed to apply voucher.");
        } finally {
            setIsApplyingVoucher(false);
        }
    }

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
        const currentOrderType = window.localStorage.getItem("driptea_order_type");
        if (currentOrderType !== "delivery") return;

        const savedDelivery = window.localStorage.getItem("driptea_delivery");

        if (savedDelivery) {
            try {
                const parsed = JSON.parse(savedDelivery);
                const isValid =
                    parsed &&
                    typeof parsed.customerAddress === "string" &&
                    parsed.customerAddress.trim().length > 0 &&
                    Number.isFinite(parsed.customerLat) &&
                    Number.isFinite(parsed.customerLng);

                if (isValid) {
                    setDelivery(parsed);
                    setRightStep(2);
                } else {
                    window.localStorage.removeItem("driptea_delivery");
                }
            } catch (error) {
                console.error("[DripTea delivery data]", error);
                window.localStorage.removeItem("driptea_delivery");
            }
        }
    }, []);

    useEffect(() => {
        const currentOrderType = window.localStorage.getItem("driptea_order_type");
        if (currentOrderType === "delivery") return;

        const savedOutlet = window.localStorage.getItem(PICKUP_OUTLET_KEY);

        if (savedOutlet) {
            try {
                const parsed = JSON.parse(savedOutlet);
                const isValid = parsed && typeof parsed.storeCode === "string" && parsed.storeCode.trim().length > 0;

                if (isValid) {
                    // Pre-select the last-used outlet but still require the customer to
                    // confirm it on the Outlet step, rather than skipping straight to Summary.
                    setPickupOutlet(parsed);
                } else {
                    window.localStorage.removeItem(PICKUP_OUTLET_KEY);
                }
            } catch (error) {
                console.error("[DripTea pickup outlet]", error);
                window.localStorage.removeItem(PICKUP_OUTLET_KEY);
            }
        }
    }, []);

    function handleDeliveryConfirm(deliveryData: DeliveryData) {
        setDelivery(deliveryData);
        setDeliveryPreview(deliveryData);
        setStatusMessage("");
    }

    function confirmPickupOutlet() {
        if (!pickupOutlet) return;
        window.localStorage.setItem(PICKUP_OUTLET_KEY, JSON.stringify(pickupOutlet));
        setRightStep(2);
    }

    function handleOrderTypeChange(nextOrderType: string) {
        if (nextOrderType === orderType) return;
        setOrderType(nextOrderType);
        window.localStorage.setItem("driptea_order_type", nextOrderType);
        setRightStep(1);
    }

    function handleDeliveryPreviewChange(previewData: DeliveryData | null) {
        setDeliveryPreview(previewData);

        setDelivery((currentDelivery) => {
            if (!currentDelivery) return currentDelivery;
            if (!previewData) {
                window.localStorage.removeItem("driptea_delivery");
                return null;
            }

            const isSameDelivery =
                currentDelivery.outletName === previewData.outletName &&
                currentDelivery.outletAddress === previewData.outletAddress &&
                Math.abs(currentDelivery.outletLat - previewData.outletLat) < 0.000001 &&
                Math.abs(currentDelivery.outletLng - previewData.outletLng) < 0.000001 &&
                Math.abs(currentDelivery.customerLat - previewData.customerLat) < 0.000001 &&
                Math.abs(currentDelivery.customerLng - previewData.customerLng) < 0.000001 &&
                Math.abs(currentDelivery.deliveryFee - previewData.deliveryFee) < 0.001 &&
                currentDelivery.customerAddress === previewData.customerAddress;

            if (isSameDelivery) return currentDelivery;

            window.localStorage.removeItem("driptea_delivery");
            return null;
        });
    }

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

    useEffect(() => {
        if (!confirmation) return;

        setPhase(1);
        let count = 8;
        setCountdown(count);
        let running = true;
        let activeTimer: number;

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

    function validateCardDetails() {
        const errors: typeof cardFieldErrors = {};
        if (!cardNumber.trim()) errors.cardNumber = true;
        if (!cardName.trim()) errors.cardName = true;
        if (!expiryDate.trim()) errors.expiryDate = true;
        if (!cvv.trim()) errors.cvv = true;

        setCardFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function handleFakePayment() {
        if (!validateCardDetails()) {
            setStatusMessage("Please fill in your credit card details before confirming payment.");
            return;
        }

        setStatusMessage("");
        setIsProcessing(true);

        try {
            const currentUser = getStoredUser();
            const orderDetails = buildOrderDetails(items, delivery);

            if (currentUser) {
                const result = await checkoutCart(
                    currentUser.id,
                    paymentMethod,
                    voucherCode ? voucherCode.trim() : undefined,
                    orderType === "delivery" ? "delivery" : "pickup",
                    delivery,
                    orderType === "delivery" ? null : pickupOutlet
                );
                const orderNo = result.order.orderNo || result.order.displayOrderNo || result.order.id;
                const finalTotal = Number(result.order.totalAmount || total);

                saveOrderTrackingSnapshot(
                    result.order.id,
                    orderNo,
                    items,
                    delivery,
                    subtotal,
                    deliveryFee,
                    discountAmount,
                    finalTotal
                );

                window.localStorage.removeItem("dripTeaCartData");
                window.localStorage.removeItem("driptea_delivery");
                window.dispatchEvent(new Event("cartUpdated"));
                setItems([]);
                router.push(`/order-status/${result.order.id}`);

                return;
            }

            const fakeOrderId = `GUEST-${Date.now().toString(36).toUpperCase()}`;

            window.localStorage.removeItem("dripTeaCartData");
            window.localStorage.removeItem("driptea_delivery");
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
                        Back to Cart
                    </button>
                )}

                {confirmation ? (
                    <section className="order-status-page">
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
                                <strong>
                                    {isDeliveryOrder ? (
                                        <>
                                            Out for<br />delivery!
                                        </>
                                    ) : (
                                        <>
                                            Ready for<br />collection!
                                        </>
                                    )}
                                </strong>
                            </div>
                        </div>

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

                                    {delivery && (
                                        <p>
                                            <strong>Delivery Fee:</strong> S$ {delivery.deliveryFee.toFixed(2)}
                                        </p>
                                    )}

                                    <p className="order-phase1-hint">Preparing in {countdown}s...</p>
                                </div>
                            </div>
                        )}

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
                                    <p><strong>Status:</strong> Drinks in progress...</p>
                                </div>
                            </div>
                        )}

                        {phase === 3 && !collected && (
                            <div className="order-status-content">
                                <div className="clock-visual-ready">
                                    {isDeliveryOrder ? (
                                        <>
                                            Out for<br />delivery!
                                        </>
                                    ) : (
                                        <>
                                            Ready for<br />collection!
                                        </>
                                    )}
                                </div>

                                <div className="order-info">
                                    <h1>Order #{confirmation.orderNo}</h1>

                                    {isDeliveryOrder ? (
                                        <>
                                            <p>Your drink is on the way.</p>
                                            {delivery && (
                                                <>
                                                    <p><strong>Outlet:</strong> {delivery.outletName}</p>
                                                    <p><strong>Deliver to:</strong> {delivery.customerAddress || `${delivery.customerLat.toFixed(5)}, ${delivery.customerLng.toFixed(5)}`}</p>
                                                    <p><strong>Distance:</strong> {delivery.distanceKm.toFixed(2)} km</p>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <p>Your drink is ready! Please collect at the counter.</p>
                                    )}

                                    <p><strong>Total Price:</strong> S$ {confirmation.total.toFixed(2)}</p>

                                    <button
                                        type="button"
                                        className="collect-btn"
                                        onClick={async () => {
                                            setCollected(true);

                                            if (confirmation.orderId.startsWith("GUEST-")) return;

                                            try {
                                                await updateOrderStatus(confirmation.orderId, "completed");
                                                const orderRes = await getOrder(confirmation.orderId);

                                                window.dispatchEvent(
                                                    new CustomEvent("chatbotSystemMessage", {
                                                        detail: {
                                                            text:
                                                                "We hope you enjoyed your order. We'd love to hear your thoughts — your feedback helps us deliver a better experience every time.",
                                                            feedbackOrderId: confirmation.orderId,
                                                            feedbackItems: (orderRes.data.items || []).map((item) => ({
                                                                name: item.name,
                                                                image: item.image,
                                                                quantity: item.quantity,
                                                                customization: item.customization,
                                                                menuItemId: item.menuItemId,
                                                                menuItemCode: item.menuItemCode,
                                                            })),
                                                        },
                                                    })
                                                );
                                            } catch (error) {
                                                console.error("[DripTea collect]", error);
                                            }
                                        }}
                                    >
                                        {isDeliveryOrder ? "Mark as Received" : "Click to Collect"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {collected && (
                            <div className="order-collected">
                                <div className="order-collected-icon">✓</div>
                                <h2>
                                    {isDeliveryOrder
                                        ? "Delivered! Enjoy your drink!"
                                        : "Collected! Enjoy your drink!"}
                                </h2>
                                <p>Thank you for your order. We hope to see you again!</p>
                            </div>
                        )}

                        {collected ? (
                            <div className="order-collected-actions">
                                {!confirmation.orderId.startsWith("GUEST-") && (
                                    <button
                                        type="button"
                                        className="order-more-btn"
                                        onClick={() => router.push(`/feedback/${confirmation.orderId}`)}
                                    >
                                        Leave Feedback
                                    </button>
                                )}

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
                            <div className="checkout-form-col">
                                <div className="checkout-card-visual">
                                    <div className="checkout-card-visual-top">
                                        <div className="checkout-card-chip" />
                                        <span className="checkout-card-visual-brand">Mastercard</span>
                                    </div>

                                    <div className="checkout-card-number">
                                        {cardNumber ? `•••• •••• •••• ${cardNumber.replace(/\s/g, "").slice(-4).padStart(4, "•")}` : "•••• •••• •••• ••••"}
                                    </div>

                                    <div className="checkout-card-visual-bottom">
                                        <div>
                                            Card Holder
                                            <strong>{cardName || "Your Name"}</strong>
                                        </div>
                                        <div>
                                            Valid Thru
                                            <strong>{expiryDate || "MM/YYYY"}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="checkout-form-header">
                                    <p className="checkout-label">Credit Card</p>

                                    <div className="checkout-card-logos">
                                        <svg width="38" height="24" viewBox="0 0 38 24" aria-label="Mastercard">
                                            <circle cx="14" cy="12" r="10" fill="#EB001B" />
                                            <circle cx="24" cy="12" r="10" fill="#F79E1B" />
                                            <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00" />
                                        </svg>

                                        <svg width="38" height="24" viewBox="0 0 38 24" aria-label="American Express">
                                            <rect width="38" height="24" rx="4" fill="#2557D6" />
                                            <text x="19" y="16" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="Arial">AMEX</text>
                                        </svg>
                                    </div>
                                </div>

                                <button type="button" className="checkout-fill-btn" onClick={fillFakeDetails}>
                                    Fill Demo Details
                                </button>

                                <label className={`checkout-field ${cardFieldErrors.cardNumber ? "checkout-field-invalid" : ""}`}>
                                    Credit Card Number
                                    <input
                                        value={cardNumber}
                                        onChange={(e) => {
                                            setCardNumber(e.target.value);
                                            if (cardFieldErrors.cardNumber) setCardFieldErrors((prev) => ({ ...prev, cardNumber: false }));
                                        }}
                                        placeholder="Key in the full credit card number"
                                        maxLength={19}
                                    />
                                    {cardFieldErrors.cardNumber && <p className="checkout-field-invalid-message">Required</p>}
                                </label>

                                <label className={`checkout-field ${cardFieldErrors.cardName ? "checkout-field-invalid" : ""}`}>
                                    Name
                                    <input
                                        value={cardName}
                                        onChange={(e) => {
                                            setCardName(e.target.value);
                                            if (cardFieldErrors.cardName) setCardFieldErrors((prev) => ({ ...prev, cardName: false }));
                                        }}
                                        placeholder="Key in your full name on the credit card"
                                    />
                                    {cardFieldErrors.cardName && <p className="checkout-field-invalid-message">Required</p>}
                                </label>

                                <div className="checkout-field-row">
                                    <label className={`checkout-field ${cardFieldErrors.expiryDate ? "checkout-field-invalid" : ""}`}>
                                        Expiry Date
                                        <input
                                            value={expiryDate}
                                            onChange={(e) => {
                                                setExpiryDate(e.target.value);
                                                if (cardFieldErrors.expiryDate) setCardFieldErrors((prev) => ({ ...prev, expiryDate: false }));
                                            }}
                                            placeholder="MM/YYYY"
                                            maxLength={7}
                                            autoComplete="off"
                                        />
                                        {cardFieldErrors.expiryDate && <p className="checkout-field-invalid-message">Required</p>}
                                    </label>

                                    <label className={`checkout-field ${cardFieldErrors.cvv ? "checkout-field-invalid" : ""}`}>
                                        CVV
                                        <input
                                            value={cvv}
                                            onChange={(e) => {
                                                setCvv(e.target.value);
                                                if (cardFieldErrors.cvv) setCardFieldErrors((prev) => ({ ...prev, cvv: false }));
                                            }}
                                            placeholder="CVV"
                                            maxLength={4}
                                            type="password"
                                            autoComplete="off"
                                        />
                                        {cardFieldErrors.cvv && <p className="checkout-field-invalid-message">Required</p>}
                                    </label>
                                </div>

                                <label className="checkout-field">
                                    Voucher
                                    <VoucherSelect
                                        value={voucherCode}
                                        disabled={isApplyingVoucher}
                                        onChange={(code: string) => void handleVoucherChange(code)}
                                        options={vouchers.map((voucher) => ({
                                            value: voucher.code,
                                            label: `${voucher.title} (${voucher.code})`,
                                            title: voucher.title,
                                            code: voucher.code,
                                        }))}
                                    />
                                    {voucherMessage && <p className="checkout-voucher-message">{voucherMessage}</p>}
                                </label>

                            </div>

                            <div className="checkout-cart-col">
                                <div className="checkout-stepper">
                                    <div className={`checkout-step ${rightStep === 1 ? "active" : "done"}`}>
                                        <span>{rightStep > 1 ? "✓" : "1"}</span>
                                        <em>{isDelivery ? "Address" : "Outlet"}</em>
                                    </div>
                                    <div className={`checkout-step-line ${rightStep === 2 ? "active" : ""}`} />
                                    <div className={`checkout-step ${rightStep === 2 ? "active" : ""}`}>
                                        <span>2</span>
                                        <em>Summary</em>
                                    </div>
                                </div>

                                {rightStep === 1 && (
                                    isDelivery ? (
                                        <CheckoutDeliveryAddress
                                            delivery={delivery}
                                            onConfirm={handleDeliveryConfirm}
                                            onPreviewChange={handleDeliveryPreviewChange}
                                            onConfirmed={() => setRightStep(2)}
                                            orderType={orderType}
                                            onOrderTypeChange={handleOrderTypeChange}
                                        />
                                    ) : (
                                        <section className="checkout-address-card checkout-pickup-outlet-card">
                                            <div className="checkout-outlet-selector">
                                                <div className="checkout-outlet-selector-header">
                                                    <p>Pickup from</p>
                                                    <OrderTypeSelect value={orderType || "pickup"} onChange={handleOrderTypeChange} />
                                                </div>
                                                <div className="checkout-outlet-options">
                                                    {pickupOutlets.map((outlet) => (
                                                        <button
                                                            type="button"
                                                            key={outlet.storeCode}
                                                            className={pickupOutlet?.storeCode === outlet.storeCode ? "active" : ""}
                                                            onClick={() => setPickupOutlet(outlet)}
                                                        >
                                                            {OUTLET_IMAGES[outlet.name] && (
                                                                <img
                                                                    src={OUTLET_IMAGES[outlet.name]}
                                                                    alt={outlet.name}
                                                                    className="checkout-outlet-image"
                                                                />
                                                            )}
                                                            <div className="checkout-outlet-info">
                                                                <strong>{outlet.name}</strong>
                                                                <span>{outlet.address}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="checkout-address-confirm"
                                                disabled={!pickupOutlet}
                                                onClick={confirmPickupOutlet}
                                            >
                                                Confirm Outlet
                                            </button>
                                        </section>
                                    )
                                )}

                                {rightStep === 2 && (
                                    <div className="checkout-selection-summary">
                                        <div>
                                            <strong>{isDelivery ? "Delivering to" : "Pickup from"}</strong>
                                            <p>{isDelivery ? (delivery?.customerAddress || "-") : (pickupOutlet?.name || "-")}</p>
                                            {isDelivery && delivery && <span>{delivery.outletName}</span>}
                                        </div>
                                        <button type="button" className="checkout-selection-change" onClick={() => setRightStep(1)}>
                                            Change
                                        </button>
                                    </div>
                                )}

                                {rightStep === 2 && (
                                <div className="checkout-summary-section">
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
                                                                    <p key={f.label}>
                                                                        <span className="checkout-item-field-label">{f.label}:</span> {f.value}
                                                                    </p>
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

                                    <div className="checkout-price-breakdown">
                                        <div className="checkout-price-row">
                                            <span>Subtotal:</span>
                                            <strong>S$ {subtotal.toFixed(2)}</strong>
                                        </div>

                                        {discountAmount > 0 && (
                                            <div className="checkout-price-row checkout-price-row-discount">
                                                <span>Voucher ({voucherCode}):</span>
                                                <strong>- S$ {discountAmount.toFixed(2)}</strong>
                                            </div>
                                        )}

                                        {displayedDelivery && (
                                            <div className="checkout-price-row">
                                                <span>Delivery Fee:</span>
                                                <strong>S$ {deliveryFee.toFixed(2)}</strong>
                                            </div>
                                        )}
                                    </div>

                                    <div className="checkout-total">
                                        <span>Total Price:</span>
                                        <strong>S$ {total.toFixed(2)}</strong>
                                    </div>

                                    {statusMessage && (
                                        <p role="alert" className="checkout-error">{statusMessage}</p>
                                    )}

                                    <div className="checkout-confirm-row">
                                        <button
                                            type="button"
                                            className="checkout-confirm-btn"
                                            onClick={handleFakePayment}
                                            disabled={items.length === 0 || isProcessing || needsDeliveryAddress}
                                        >
                                            {isProcessing ? "Processing..." : "Confirm Payment"}
                                        </button>
                                    </div>
                                </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
