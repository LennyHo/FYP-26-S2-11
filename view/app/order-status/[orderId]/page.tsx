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
import "../../components/pages/Checkout.css";

const PREPARING_MS = 5_000;
const OUT_FOR_DELIVERY_MS = 10_000;
const DELIVERED_MS = 20_000;
const LS_COLLECTED_KEY = "driptea_collected_orders";
const ORDER_TRACKING_KEY = "driptea_order_tracking";

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPhaseFromElapsed(elapsedMs: number, isDeliveryOrder: boolean): 1 | 2 | 3 | 4 {
  if (isDeliveryOrder && elapsedMs >= DELIVERED_MS) return 4;
  if (elapsedMs >= OUT_FOR_DELIVERY_MS) return 3;
  if (elapsedMs >= PREPARING_MS) return 2;
  return 1;
}

function getCountdownSeconds(phase: 1 | 2 | 3 | 4, elapsedMs: number, isDeliveryOrder: boolean) {
  if (phase === 1) return Math.max(0, Math.ceil((PREPARING_MS - elapsedMs) / 1000));
  if (phase === 2) return Math.max(0, Math.ceil((OUT_FOR_DELIVERY_MS - elapsedMs) / 1000));
  if (phase === 3 && isDeliveryOrder) return Math.max(0, Math.ceil((DELIVERED_MS - elapsedMs) / 1000));
  return 0;
}

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";
  const sentStatusRef = useRef(new Set<string>());
  const feedbackPromptSentRef = useRef(false);

  const [order, setOrder] = useState<DripTeaOrder | null>(null);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [countdown, setCountdown] = useState(5);
  const [collected, setCollected] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

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

  const delivery = normalizeDelivery(snapshot?.delivery || order?.deliveryDetails || null);
  const isDeliveryOrder = Boolean(delivery) || order?.orderType === "delivery";
  const createdAt = order?.createdAt ? new Date(order.createdAt) : new Date(nowMs);
  const elapsedMs = order?.createdAt ? Math.max(0, nowMs - createdAt.getTime()) : 0;
  const nextPhase = getPhaseFromElapsed(elapsedMs, isDeliveryOrder);
  const routeProgress = isDeliveryOrder
    ? clamp((elapsedMs - OUT_FOR_DELIVERY_MS) / (DELIVERED_MS - OUT_FOR_DELIVERY_MS), 0, 1)
    : 0;

  useEffect(() => {
    if (!order || !orderId) return;

    const status = order.status.toLowerCase();
    const computedPhase = status === "completed" ? 4 : nextPhase;
    setPhase(computedPhase);
    setCountdown(getCountdownSeconds(computedPhase, elapsedMs, isDeliveryOrder));

    if (status === "completed") {
      setCollected(true);
      markCollectedLocally(orderId);
      return;
    }

    if (computedPhase >= 2 && status === "pending" && !sentStatusRef.current.has("preparing")) {
      sentStatusRef.current.add("preparing");
      void updateOrderStatus(orderId, "preparing").catch(console.error);
    }

    if (computedPhase >= 3 && (status === "pending" || status === "preparing") && !sentStatusRef.current.has("ready")) {
      sentStatusRef.current.add("ready");
      void updateOrderStatus(orderId, "ready").catch(console.error);
    }

    if (isDeliveryOrder && computedPhase >= 4 && status !== "completed" && !sentStatusRef.current.has("completed")) {
      sentStatusRef.current.add("completed");
      setCollected(true);
      markCollectedLocally(orderId);
      dispatchFeedbackPrompt(order);
      void updateOrderStatus(orderId, "completed").catch(console.error);
    }
  }, [elapsedMs, isDeliveryOrder, nextPhase, order, orderId]);

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
    try {
      await updateOrderStatus(orderId, "completed");
      markCollectedLocally(orderId);
      setCollected(true);
      dispatchFeedbackPrompt(order);
    } catch (e) {
      console.error(e);
    }
  }

  const displayItems = snapshot?.items?.length ? snapshot.items : order ? fromOrderItems(order.items) : [];
  const subtotal = snapshot?.subtotal ?? displayItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const deliveryFee = snapshot?.deliveryFee ?? delivery?.deliveryFee ?? 0;
  const total = snapshot?.total ?? Number(order?.totalAmount || subtotal + deliveryFee);
  const orderNo = snapshot?.orderNo || order?.orderNo || orderId;
  const etaEnd = addSeconds(createdAt, isDeliveryOrder ? 20 : 20);
  const progressStep = collected ? 4 : phase;

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
              <button type="button" onClick={() => router.push("/")}>
                Back to Home
              </button>
            </div>

            <div className="tracking-layout">
              <section className="tracking-primary">
                <div className="tracking-progress-card">
                  <div className={`tracking-step ${getStepState(1, progressStep)}`}>
                    <span>{progressStep > 1 ? "OK" : "1"}</span>
                    <strong>Order Confirmed</strong>
                    <em>{formatTime(createdAt)}</em>
                  </div>
                  <div className="tracking-rail" />
                  <div className={`tracking-step ${getStepState(2, progressStep)}`}>
                    <span>2</span>
                    <strong>Preparing</strong>
                    <em>{phase === 1 ? `in ${countdown}s` : formatTime(addSeconds(createdAt, 5))}</em>
                  </div>
                  <div className="tracking-rail" />
                  <div className={`tracking-step ${getStepState(3, progressStep)}`}>
                    <span>3</span>
                    <strong>{isDeliveryOrder ? "Out for Delivery" : "Ready"}</strong>
                    <em>{phase >= 3 ? "Now" : formatTime(addSeconds(createdAt, 10))}</em>
                  </div>
                  <div className="tracking-rail" />
                  <div className={`tracking-step ${getStepState(4, progressStep)}`}>
                    <span>4</span>
                    <strong>{isDeliveryOrder ? "Delivered" : "Collected"}</strong>
                    <em>{collected ? "Done" : `Est. ${formatTime(etaEnd)}`}</em>
                  </div>
                </div>

                <div className="tracking-eta-card">
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
                  <button type="button" onClick={() => setNowMs(Date.now())}>Live Updates</button>
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

                <div className="tracking-info-grid">
                  <div>
                    <h2>{isDeliveryOrder ? "Delivery Address" : "Pickup Details"}</h2>
                    <p>{delivery?.customerAddress || "Collect at selected outlet."}</p>
                    {delivery && <span>{delivery.distanceKm.toFixed(2)} km from {delivery.outletName}</span>}
                  </div>
                  {isDeliveryOrder ? (
                    <div className="tracking-rider-card">
                      <h2>Rider Information</h2>
                      <div className="tracking-rider-content">
                        <div className="tracking-rider-avatar">AT</div>
                        <div>
                          <strong>Alex Tan <span>4.9</span></strong>
                          <p>{collected ? "Delivered your order" : "Delivering your order"}</p>
                        </div>
                        <div className="tracking-rider-actions">
                          <button type="button">Call Rider</button>
                          <button type="button">Message</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2>Collection Information</h2>
                      <p>Show your order number at the counter.</p>
                      <span>Order #{orderNo}</span>
                    </div>
                  )}
                </div>
              </section>

              <aside className="tracking-sidebar">
                <section className="tracking-card">
                  <h2>Your Order <span>({displayItems.length} items)</span></h2>
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
                  <button type="button" onClick={() => window.print()}>View Receipt</button>
                </section>

                <section className="tracking-card">
                  <h2>Need Help?</h2>
                  <p>Our support team is here to help you.</p>
                  <div className="tracking-help-actions">
                    <button type="button" onClick={() => router.push("/contact")}>Chat with Us</button>
                    <span>WhatsApp: +65 9123 4567</span>
                  </div>
                </section>
              </aside>
            </div>

            <p className="page-disclaimer">
              Nutritional information is provided for general reference only and is not a substitute for professional medical advice. Consume at your own risk. DripTea is not liable for any health consequences arising from your order.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
