// User Story Architecture Trace - order-status/[orderId]/page.tsx
//
// #28  Track Order Status
//      View: order-status/[orderId]/page.tsx (this file) -> Route: checkout.routes.js -> Ctrl: order.controller.js -> Model: order.model.js
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx -> Ctrl: chatbot.controller.js -> Svc: chatbot.service.js -> Model: order.model.js
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/layout/Header";
import { getOrder, updateOrderStatus, type DripTeaOrder } from "../../utils/staffApi";
import { getOrderQueueStatus } from "../../utils/customerApi";
import type { DripTeaOrderQueueStatus } from "../../utils/api.base";
import ReceiptModal, { type ReceiptData } from "../../components/ui/ReceiptModal";
import { useOutlets } from "../../utils/outlets";
import "../../components/pages/Checkout.css";

const PREPARING_MS = 5_000;
const OUT_FOR_DELIVERY_MS = 10_000;
const DELIVERED_MS = 20_000;
const LS_COLLECTED_KEY = "driptea_collected_orders";
const ORDER_TRACKING_KEY = "driptea_order_tracking";

// Client-only walking directions per outlet — the stores collection has no
// wayfinding field, so this fills in what the database doesn't cover.
const PICKUP_DIRECTIONS: Record<string, { image: string; steps: string[] }> = {
  "DT-001": {
    image: "/img/313somerset.webp",
    steps: [
      "Go to Somerset MRT Station.",
      "Take the escalator on the right when you exit the station.",
      "Head to Basement 2 — the store is at the end of the level.",
      "Show your order number at the counter.",
    ],
  },
  "DT-002": {
    image: "/img/Jem_Mall.jpg",
    steps: [
      "Go to Jurong East MRT Station.",
      "Take the escalator at the back when you exit the station.",
      "Head up to Level 3 — the store is on the right side.",
      "Show your order number at the counter.",
    ],
  },
};

const TrackingDeliveryMap = dynamic(() => import("./TrackingDeliveryMap"), {
  ssr: false,
});

type TrackingItem = {
  name: string;
  details?: string;
  price: number;
  image?: string;
  fields?: Array<{ label: string; value: string }>;
};

type TrackingDelivery = {
  type: string;
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

type TrackingSnapshot = {
  orderNo?: string;
  items?: TrackingItem[];
  delivery?: TrackingDelivery | null;
  subtotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  total?: number;
  savedAt?: string;
};

function normalizeDelivery(delivery?: Partial<TrackingDelivery> | null): TrackingDelivery | null {
  if (!delivery) return null;

  const requiredNumbers = [
    delivery.outletLat,
    delivery.outletLng,
    delivery.customerLat,
    delivery.customerLng,
    delivery.distanceKm,
    delivery.deliveryFee,
  ];

  if (requiredNumbers.some((value) => typeof value !== "number" || Number.isNaN(value))) {
    return null;
  }

  return {
    type: delivery.type || "delivery",
    outletName: delivery.outletName || "DripTea Outlet",
    outletAddress: delivery.outletAddress || "",
    outletLat: delivery.outletLat as number,
    outletLng: delivery.outletLng as number,
    customerLat: delivery.customerLat as number,
    customerLng: delivery.customerLng as number,
    customerAddress: delivery.customerAddress,
    distanceKm: delivery.distanceKm as number,
    deliveryFee: delivery.deliveryFee as number,
    deliveryStatus: delivery.deliveryStatus || "pending",
  };
}

function markCollectedLocally(id: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(LS_COLLECTED_KEY) ?? "[]") as string[];
    if (!ids.includes(id)) {
      localStorage.setItem(LS_COLLECTED_KEY, JSON.stringify([...ids, id]));
    }
  } catch {}
}

function getTrackingSnapshot(orderId: string): TrackingSnapshot | null {
  if (typeof window === "undefined" || !orderId) return null;

  try {
    const snapshots = JSON.parse(window.localStorage.getItem(ORDER_TRACKING_KEY) || "{}");
    return snapshots[orderId] || null;
  } catch {
    return null;
  }
}

function isMongoObjectId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

function formatOrderDetails(items: DripTeaOrder["items"]) {
  return items
    .map((item) => {
      const c = item.customization || {};
      const toppings = Array.isArray(c.toppings) ? (c.toppings as string[]).join(", ") : "";
      const parts = [c.size, c.ice, c.sugar, toppings].filter(Boolean).join(", ");
      return `${item.name}: x${item.quantity}${parts ? `, ${parts}` : ""}`;
    })
    .join(" | ");
}

function describeCustomization(customization: Record<string, unknown> | undefined) {
  const c = (customization || {}) as { size?: string; ice?: string; sugar?: string; toppings?: string[] };
  const toppings = Array.isArray(c.toppings) ? c.toppings.join(", ") : "";
  return [c.size, c.ice, c.sugar, toppings].filter(Boolean).join(", ");
}

function fromOrderItems(items: DripTeaOrder["items"]): TrackingItem[] {
  return items.map((item) => {
    const c = item.customization || {};
    const toppings = Array.isArray(c.toppings) ? (c.toppings as string[]).join(", ") : "";
    const fields = [
      { label: "Qty", value: String(item.quantity || 1) },
      typeof c.size === "string" ? { label: "Size", value: c.size } : null,
      typeof c.ice === "string" ? { label: "Ice", value: c.ice } : null,
      typeof c.sugar === "string" ? { label: "Sugar", value: c.sugar } : null,
      toppings ? { label: "Toppings", value: toppings } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    return {
      name: item.name,
      price: Number(item.lineTotal || 0),
      image: item.image,
      fields,
    };
  });
}

function formatOrderDate(value?: string) {
  if (!value) return "Today";
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function addSeconds(value: Date, seconds: number) {
  return new Date(value.getTime() + seconds * 1000);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function getStepState(step: number, currentStep: number) {
  if (step < currentStep) return "done";
  if (step === currentStep) return "active";
  return "";
}

function getStepLabel(step: number, currentStep: number) {
  if (step < currentStep) return "Done";
  if (step === currentStep) return "Now";
  return "Upcoming";
}

function TrackingStepIcon({ step, isDeliveryOrder }: { step: 1 | 2 | 3 | 4; isDeliveryOrder: boolean }) {
  if (step === 2) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 8h11v4.5a5.5 5.5 0 0 1-11 0V8Z" />
        <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 5c0-1 1-1 1-2M12 5c0-1 1-1 1-2" />
      </svg>
    );
  }

  // The lorry icon only applies to delivery orders — pickup orders reuse the checkmark instead.
  if (step === 3 && isDeliveryOrder) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h11v9H3V7Zm11 3h3l3 3v3h-6v-6Z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Maps the *real* backend order status directly to a display phase — the visual
// tracker (and any "delivered" claim) always reflects what the store/rider has
// actually confirmed, never a guess based on how long ago the order was created.
const STATUS_PHASE: Record<string, 1 | 2 | 3 | 4> = {
  pending: 1,
  paid: 1,
  preparing: 2,
  ready: 3,
  completed: 4,
};

// How long the simulated auto-progression waits *within* a given status before
// nudging it to the next one, for orders staff never manually touch. Measured
// from when that status was first observed here, not from order creation —
// otherwise a slow checkout (or reopening the tracking link later) could make
// elapsed-since-creation blow past every threshold at once and mark a delivery
// "delivered" before it had even started preparing.
function phaseDurationMs(status: string, isDeliveryOrder: boolean) {
  if (status === "pending" || status === "paid") return PREPARING_MS;
  if (status === "preparing") return OUT_FOR_DELIVERY_MS - PREPARING_MS;
  if (status === "ready" && isDeliveryOrder) return DELIVERED_MS - OUT_FOR_DELIVERY_MS;
  return 0;
}

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";
  const sentStatusRef = useRef(new Set<string>());
  const feedbackPromptSentRef = useRef(false);
  const phaseAnchorRef = useRef<{ status: string; sinceMs: number } | null>(null);

  const [order, setOrder] = useState<DripTeaOrder | null>(null);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [countdown, setCountdown] = useState(5);
  const [collected, setCollected] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [showReceipt, setShowReceipt] = useState(false);
  const [queueStatus, setQueueStatus] = useState<DripTeaOrderQueueStatus | null>(null);
  const { outlets } = useOutlets();

  useEffect(() => {
    if (orderId) setSnapshot(getTrackingSnapshot(orderId));
  }, [orderId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let running = true;
    let pollTimer: number | undefined;

    async function loadOrder() {
      try {
        const res = await getOrder(orderId);
        if (!running) return;

        setOrder(res.data);
        if (res.data.status.toLowerCase() === "completed") {
          setCollected(true);
          markCollectedLocally(orderId);
        }
        setError("");
      } catch {
        if (running) setError("Unable to load order. Please try again.");
      } finally {
        if (running) setIsLoading(false);
      }
    }

    void loadOrder();
    pollTimer = window.setInterval(() => void loadOrder(), 3000);

    return () => {
      running = false;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !isMongoObjectId(orderId)) return;

    let running = true;

    async function loadQueueStatus() {
      try {
        const response = await getOrderQueueStatus(orderId);
        if (running) setQueueStatus(response.data);
      } catch {
        if (running) setQueueStatus(null);
      }
    }

    void loadQueueStatus();
    const timer = window.setInterval(() => void loadQueueStatus(), 5000);

    return () => {
      running = false;
      window.clearInterval(timer);
    };
  }, [orderId]);

  const delivery = normalizeDelivery(snapshot?.delivery || order?.deliveryDetails || null);
  const isDeliveryOrder = Boolean(delivery) || order?.orderType === "delivery";
  const pickupOutletName = order?.deliveryDetails?.outletName || "";
  const pickupDirections = order?.deliveryDetails?.storeCode
    ? PICKUP_DIRECTIONS[order.deliveryDetails.storeCode]
    : undefined;
  // Elapsed time *within the current real status*, not since order creation — see
  // phaseDurationMs above for why that distinction matters.
  const anchor = phaseAnchorRef.current;
  const realStatus = order?.status?.toLowerCase() || "pending";
  const elapsedInPhaseMs = Math.max(0, nowMs - (anchor?.status === realStatus ? anchor.sinceMs : nowMs));
  const routeProgress = isDeliveryOrder && (realStatus === "ready" || realStatus === "completed")
    ? realStatus === "completed"
      ? 1
      : clamp(elapsedInPhaseMs / Math.max(1, DELIVERED_MS - OUT_FOR_DELIVERY_MS), 0, 1)
    : 0;

  useEffect(() => {
    if (!order || !orderId) return;

    const status = order.status.toLowerCase();

    // Reset the anchor whenever the backend-confirmed status actually changes —
    // this is what stops a stale page load (or a slow checkout before this page
    // even mounted) from reporting "delivered" while the drink is still pending.
    if (phaseAnchorRef.current?.status !== status) {
      phaseAnchorRef.current = { status, sinceMs: Date.now() };
    }
    const elapsedInPhase = Date.now() - phaseAnchorRef.current.sinceMs;

    const computedPhase = STATUS_PHASE[status] ?? 1;
    setPhase(computedPhase);
    setCountdown(Math.max(0, Math.ceil((phaseDurationMs(status, isDeliveryOrder) - elapsedInPhase) / 1000)));

    if (status === "completed") {
      setCollected(true);
      markCollectedLocally(orderId);
      return;
    }

    if (status === "pending" && elapsedInPhase >= PREPARING_MS && !sentStatusRef.current.has("preparing")) {
      sentStatusRef.current.add("preparing");
      void updateOrderStatus(orderId, "preparing").catch(console.error);
    }

    if (status === "preparing" && elapsedInPhase >= (OUT_FOR_DELIVERY_MS - PREPARING_MS) && !sentStatusRef.current.has("ready")) {
      sentStatusRef.current.add("ready");
      void updateOrderStatus(orderId, "ready").catch(console.error);
    }

    // Delivery orders only auto-complete once they've genuinely reached "ready" —
    // never as a side effect of pure elapsed time, which is what previously let
    // "delivered" show up while the drink hadn't finished preparing.
    if (isDeliveryOrder && status === "ready" && elapsedInPhase >= (DELIVERED_MS - OUT_FOR_DELIVERY_MS) && !sentStatusRef.current.has("completed")) {
      sentStatusRef.current.add("completed");
      setCollected(true);
      markCollectedLocally(orderId);
      dispatchFeedbackPrompt(order);
      void updateOrderStatus(orderId, "completed").catch(console.error);
    }
  }, [nowMs, isDeliveryOrder, order, orderId]);

  function dispatchFeedbackPrompt(sourceOrder: DripTeaOrder | null) {
    if (!sourceOrder || feedbackPromptSentRef.current) return;
    feedbackPromptSentRef.current = true;

    window.dispatchEvent(
      new CustomEvent("chatbotSystemMessage", {
        detail: {
          text:
            "We hope you enjoyed your order. We'd love to hear your thoughts - your feedback helps us deliver a better experience every time.",
          feedbackOrderId: orderId,
          feedbackItems: (sourceOrder.items || []).map((item) => ({
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
  }

  async function handleCollect() {
    // Mark collected and prompt for feedback immediately (client-side, same as the
    // delivery auto-complete path below) rather than gating on the PATCH request —
    // if that request fails or races with the page's own polling, the customer still
    // sees "Collected" from the next poll anyway, so the prompt should fire regardless
    // of whether this specific request resolves cleanly.
    markCollectedLocally(orderId);
    setCollected(true);
    dispatchFeedbackPrompt(order);

    try {
      await updateOrderStatus(orderId, "completed");
    } catch (e) {
      console.error(e);
    }
  }

  const displayItems = snapshot?.items?.length ? snapshot.items : order ? fromOrderItems(order.items) : [];
  const subtotal = snapshot?.subtotal ?? displayItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const deliveryFee = snapshot?.deliveryFee ?? delivery?.deliveryFee ?? 0;
  const total = snapshot?.total ?? Number(order?.totalAmount || subtotal + deliveryFee);
  const orderNo = snapshot?.orderNo || order?.orderNo || orderId;

  // Older orders may not have outletName/outletAddress saved on the order record
  // itself — storeCode is always present, so resolve against the live stores list
  // as a fallback rather than showing a generic placeholder.
  const resolvedOutlet = outlets.find((o) => o.storeCode === order?.deliveryDetails?.storeCode);

  const receiptData: ReceiptData | null = order
    ? {
        orderNo,
        orderDate: order.createdAt,
        orderType: isDeliveryOrder ? "Delivery" : "Pickup",
        customerName: order.customer || "Guest",
        customerAddress: isDeliveryOrder ? delivery?.customerAddress : undefined,
        outletName: order.deliveryDetails?.outletName || delivery?.outletName || resolvedOutlet?.name,
        outletAddress: order.deliveryDetails?.outletAddress || delivery?.outletAddress || resolvedOutlet?.address,
        paymentStatus: order.paymentStatus,
        items: order.items.map((item) => {
          const quantity = Number(item.quantity || 1);
          const amount = Number(item.lineTotal || 0);
          return {
            name: item.name,
            quantity,
            unitPrice: quantity > 0 ? amount / quantity : amount,
            amount,
            customization: describeCustomization(item.customization),
          };
        }),
        subtotal,
        deliveryFee,
        discountAmount: snapshot?.discountAmount,
        total,
      }
    : null;

  // Based on the remaining countdown in the *current* phase, not order-creation time —
  // otherwise this could show a "By HH:MM" that's already in the past once real prep
  // takes longer than the simulated thresholds.
  const etaEnd = addSeconds(new Date(nowMs), countdown);
  const progressStep = collected ? 4 : phase;
  const visualProgressStep = collected ? 5 : progressStep;
  const mobileStep: 1 | 2 | 3 | 4 = collected ? 4 : phase;
  const mobileStepTitle = mobileStep === 1
    ? "Order Confirmed"
    : mobileStep === 2
      ? "Preparing"
      : mobileStep === 3
        ? (isDeliveryOrder ? "Out for Delivery" : "Ready")
        : (isDeliveryOrder ? "Delivered" : "Collected");

  return (
    <div className="checkout-page">
      <Header />
      <main className="tracking-main">
        {isLoading && <p className="order-status-loading">Loading order status...</p>}
        {!isLoading && error && <p className="order-status-error">{error}</p>}

        {!isLoading && order && (
          <>
            <div className="tracking-header">
              <div>
                <h1>Track Your Order</h1>
                <p>
                  Order #{orderNo} <span>-</span> Placed on {formatOrderDate(order.createdAt)}
                </p>
              </div>
              <button type="button" onClick={() => router.push("/home")}>
                Back to Menu
              </button>
            </div>

            <div className="tracking-layout">
              <section className="tracking-primary">
                <div className={`tracking-progress-card${isDeliveryOrder ? "" : " tracking-progress-card-3step"}`}>
                  <div className={`tracking-mobile-current-step ${collected ? "done" : "active"}`}>
                    <span className="tracking-mobile-step-icon"><TrackingStepIcon step={mobileStep} isDeliveryOrder={isDeliveryOrder} /></span>
                    <div>
                      <small>Current status</small>
                      <strong>{mobileStepTitle}</strong>
                      <em>{collected ? "Done" : "Now"}</em>
                    </div>
                  </div>
                  <div className={`tracking-step ${getStepState(1, visualProgressStep)}`}>
                    <span aria-label="Order confirmed"><TrackingStepIcon step={1} isDeliveryOrder={isDeliveryOrder} /></span>
                    <strong>Order Confirmed</strong>
                    <em>{getStepLabel(1, visualProgressStep)}</em>
                  </div>
                  <div className={`tracking-rail ${visualProgressStep > 1 ? "done" : ""}`} />
                  <div className={`tracking-step ${getStepState(2, visualProgressStep)}`}>
                    <span aria-label="Preparing"><TrackingStepIcon step={2} isDeliveryOrder={isDeliveryOrder} /></span>
                    <strong>Preparing</strong>
                    <em>{getStepLabel(2, visualProgressStep)}</em>
                  </div>
                  <div className={`tracking-rail ${visualProgressStep > 2 ? "done" : ""}`} />
                  {isDeliveryOrder ? (
                    <>
                      <div className={`tracking-step ${getStepState(3, visualProgressStep)}`}>
                        <span aria-label="Out for delivery"><TrackingStepIcon step={3} isDeliveryOrder={isDeliveryOrder} /></span>
                        <strong>Out for Delivery</strong>
                        <em>{getStepLabel(3, visualProgressStep)}</em>
                      </div>
                      <div className={`tracking-rail ${visualProgressStep > 3 ? "done" : ""}`} />
                      <div className={`tracking-step ${getStepState(4, visualProgressStep)}`}>
                        <span aria-label="Delivered"><TrackingStepIcon step={4} isDeliveryOrder={isDeliveryOrder} /></span>
                        <strong>Delivered</strong>
                        <em>{getStepLabel(4, visualProgressStep)}</em>
                      </div>
                    </>
                  ) : (
                    <div className={`tracking-step ${getStepState(3, visualProgressStep)}`}>
                      <span aria-label={collected ? "Collected" : "Ready"}><TrackingStepIcon step={3} isDeliveryOrder={isDeliveryOrder} /></span>
                      <strong>{collected ? "Collected" : "Ready"}</strong>
                      <em>{getStepLabel(3, visualProgressStep)}</em>
                    </div>
                  )}
                </div>

                <div className={`tracking-eta-card ${collected ? "is-complete" : ""}`}>
                  <div>
                    <span className="tracking-eta-icon">i</span>
                    <strong>{isDeliveryOrder ? "Estimated Delivery" : "Estimated Ready Time"}</strong>
                    <p>
                      {collected
                        ? "Completed"
                        : countdown > 0
                          ? `${countdown}s to next update`
                          : `By ${formatTime(etaEnd)}`}
                    </p>
                  </div>
                  <p>
                    {isDeliveryOrder
                      ? collected
                        ? "The driver has delivered your drink."
                        : phase >= 3
                          ? "The driver is en route to your delivery address."
                          : "Your drink is being prepared before the driver starts the trip."
                      : phase >= 3
                        ? "Your order is ready for collection."
                        : "Your order will be ready for collection soon."}
                  </p>
                </div>

                {isDeliveryOrder && delivery ? (
                  <div className="tracking-map-card">
                    <TrackingDeliveryMap
                      delivery={delivery}
                      progress={routeProgress}
                      showRider={phase >= 3 && !collected}
                    />
                    <div className="tracking-map-legend tracking-map-legend-overlay">
                      <span>{delivery.outletName}</span>
                      <span>Delivery rider</span>
                      <span>Your location</span>
                    </div>
                  </div>
                ) : (
                  <div className="tracking-pickup-card">
                    <h2>{isDeliveryOrder ? "Delivery Order" : "Pickup Order"}</h2>
                    <p><strong>Customization:</strong> {formatOrderDetails(order.items)}</p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {isDeliveryOrder
                        ? collected
                          ? "Delivered"
                          : "Delivery details unavailable"
                        : phase >= 3
                          ? "Ready for collection"
                          : "Preparing"}
                    </p>
                    {!isDeliveryOrder && phase >= 3 && !collected && (
                      <button type="button" className="collect-btn" onClick={handleCollect}>
                        Click to Collect
                      </button>
                    )}
                  </div>
                )}

                <div className={`tracking-info-grid${isDeliveryOrder ? "" : " tracking-info-grid-single"}`}>
                  <div>
                    <h2>{isDeliveryOrder ? "Delivery Address" : "How to Get There"}</h2>
                    {isDeliveryOrder ? (
                      <div className="tracking-address-content">
                        <span className="tracking-address-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                        </span>
                        <div>
                          <p>{delivery?.customerAddress || "Collect at selected outlet."}</p>
                          {delivery && (
                            <span className="tracking-distance-badge">
                              {delivery.distanceKm.toFixed(2)} km from {delivery.outletName}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : pickupDirections ? (
                      <div className="tracking-pickup-directions">
                        <div className="tracking-pickup-outlet-photo">
                          <img src={pickupDirections.image} alt={pickupOutletName || "Pickup outlet"} />
                          {pickupOutletName && <span>{pickupOutletName}</span>}
                        </div>
                        <ol className="tracking-pickup-steps">
                          {pickupDirections.steps.map((step, index) => (
                            <li key={step}>
                              <span>{index + 1}</span>
                              <span>
                                {index === pickupDirections.steps.length - 1
                                  ? <>Show <strong>Order #{orderNo}</strong> at the counter.</>
                                  : step}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <ol className="tracking-pickup-steps">
                        <li><span>1</span><span>Head to your selected outlet.</span></li>
                        <li><span>2</span><span>Show <strong>Order #{orderNo}</strong> at the counter to collect.</span></li>
                      </ol>
                    )}
                  </div>
                  {isDeliveryOrder && (
                    <div className="tracking-rider-card">
                      <h2>Rider Information</h2>
                      <div className="tracking-rider-content">
                        <div className="tracking-rider-avatar">AT</div>
                        <div>
                          <strong>Alex Tan <span>4.9</span></strong>
                          <p>{collected ? "Delivered your order" : "Delivering your order"}</p>
                          <p className="tracking-rider-phone">+65 1234 5678</p>
                        </div>
                        <div className="tracking-rider-actions">
                          <button type="button">Call Rider</button>
                          <button type="button">Message</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <aside className="tracking-sidebar">
                <section className="tracking-card">
                  <h2>Your Order</h2>
                  <div className="tracking-order-items">
                    {displayItems.map((item, index) => (
                      <div className="tracking-order-item" key={`${item.name}-${index}`}>
                        <img src={item.image || "/img/no-image.png"} alt={item.name} />
                        <div>
                          <strong>{item.name}</strong>
                          {item.fields?.length ? (
                            item.fields.slice(0, 4).map((field) => (
                              <p key={field.label}>{field.label}: {field.value}</p>
                            ))
                          ) : (
                            <p>{item.details || "Customized drink"}</p>
                          )}
                        </div>
                        <b>S$ {Number(item.price || 0).toFixed(2)}</b>
                      </div>
                    ))}
                  </div>
                  <div className="tracking-total-lines">
                    <p><span>Subtotal</span><strong>S$ {subtotal.toFixed(2)}</strong></p>
                    {deliveryFee > 0 && <p><span>Delivery Fee</span><strong>S$ {deliveryFee.toFixed(2)}</strong></p>}
                    <p className="tracking-grand-total"><span>Total</span><strong>S$ {total.toFixed(2)}</strong></p>
                  </div>
                </section>

                <section className="tracking-card">
                  <h2>Order Details</h2>
                  <p><span>Order Number</span><strong>{orderNo}</strong></p>
                  <p><span>Order Type</span><strong>{isDeliveryOrder ? "Delivery" : "Pickup"}</strong></p>
                  <p><span>Payment Method</span><strong>Visa **** 4242</strong></p>
                  <p><span>Order Placed</span><strong>{formatOrderDate(order.createdAt)}</strong></p>
                  <button type="button" onClick={() => setShowReceipt(true)}>View Receipt</button>
                </section>

                <section className="tracking-card tracking-queue-card">
                  <h2>Store Queue</h2>
                  <p><span>Outlet</span><strong>{queueStatus?.storeName || pickupOutletName || delivery?.outletName || "Selected store"}</strong></p>
                  <div className="tracking-queue-grid">
                    <div>
                      <span>Orders now</span>
                      <strong>{queueStatus?.activeOrderCount ?? 0}</strong>
                    </div>
                    <div>
                      <span>Cups in queue</span>
                      <strong>{queueStatus?.activeCupCount ?? 0}</strong>
                    </div>
                    <div>
                      <span>Orders before you</span>
                      <strong>{queueStatus?.ordersBefore ?? 0}</strong>
                    </div>
                    <div>
                      <span>Cups before you</span>
                      <strong>{queueStatus?.cupsBefore ?? 0}</strong>
                    </div>
                  </div>
                  <p className="tracking-queue-note">
                    {queueStatus?.isQueueActive
                      ? `You are #${queueStatus.position} in this store queue. Ready orders leave after collection.`
                      : isDeliveryOrder
                        ? (collected ? "Delivered to your address." : "Your drink has left the store queue.")
                        : (collected ? "Collected at the counter." : "Your drink is ready for collection.")}
                  </p>
                  {isDeliveryOrder && (
                    <p><span>Delivery Status</span><strong>{collected ? "Delivered" : phase >= 3 ? "Out for delivery" : "Preparing"}</strong></p>
                  )}
                </section>

                <section className="tracking-card">
                  <h2>Need Help?</h2>
                  <p>Our support team is here to help you.</p>
                  <div className="tracking-help-actions">
                    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("openAvyChat"))}>Chat with Us</button>
                  </div>
                </section>
              </aside>
            </div>

            <p className="page-disclaimer">
              Nutritional information is provided for general reference only and is not a substitute for professional medical advice. Consume at your own risk. DripTea is not liable for any health consequences arising from your order.
            </p>

            {showReceipt && receiptData && (
              <ReceiptModal receipt={receiptData} onClose={() => setShowReceipt(false)} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
