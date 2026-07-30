"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../layout/Header";
import { getPurchaseHistory } from "../../utils/customerApi";
import { updateOrderStatus } from "../../utils/staffApi";
import { getStoredUser, type DripTeaPurchaseHistoryItem } from "../../utils/api.base";
import FeedbackModal from "../ui/FeedbackModal";
import "./PurchaseHistory.css";

const TRACK_STATUSES = new Set(["pending", "preparing", "ready"]);
const COLLECT_STATUSES = new Set(["ready"]);
const LS_COLLECTED_KEY = "driptea_collected_orders";
const ORDER_TRACKING_KEY = "driptea_order_tracking";
const READY_AFTER_MS = 10_000;
const COMPLETED_AFTER_MS = 20_000;

function getLocalCollectedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_COLLECTED_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function getDeliverySnapshotIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const snapshots = JSON.parse(localStorage.getItem(ORDER_TRACKING_KEY) || "{}") as Record<
      string,
      { delivery?: unknown }
    >;

    return new Set(
      Object.entries(snapshots)
        .filter(([, snapshot]) => Boolean(snapshot?.delivery))
        .map(([orderId]) => orderId)
    );
  } catch {
    return new Set();
  }
}

function formatDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-SG", { year: "numeric", month: "short", day: "2-digit" });
}

function formatCustomization(customization?: Record<string, unknown>) {
  if (!customization) return "No customization";
  const toppings = Array.isArray(customization.toppings) ? customization.toppings.join(", ") : "";
  const text = [customization.size, customization.ice, customization.sugar, toppings]
    .filter(Boolean)
    .join(" · ");
  return text || "No customization";
}

function formatStatus(status?: string, isDeliveryOrder = false) {
  if (!status) return "Pending";
  if (status.toLowerCase() === "completed") return isDeliveryOrder ? "Delivered" : "Collected";
  if (status.toLowerCase() === "ready") return isDeliveryOrder ? "Out for delivery" : "Ready for collection";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPaymentStatus(status?: string) {
  if (!status) return "Paid";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function totalSpent(orders: DripTeaPurchaseHistoryItem[]) {
  return orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
}

// order.orderType is set explicitly at checkout ("pickup" or "delivery") and is
// authoritative. deliveryDetails is now populated for BOTH modes (it carries the
// pickup outlet too), so it must never be used as a delivery signal on its own —
// only fall back to it for legacy/manual orders that predate orderType.
function resolveIsDeliveryOrder(
  order: DripTeaPurchaseHistoryItem,
  deliverySnapshotIds: Set<string>
) {
  if (order.orderType === "delivery") return true;
  if (order.orderType === "pickup") return false;
  return Boolean(order.deliveryDetails) || deliverySnapshotIds.has(order.id);
}

export default function PurchaseHistory() {
  const router = useRouter();
  const [orders, setOrders] = useState<DripTeaPurchaseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [localCollectedIds, setLocalCollectedIds] = useState<Set<string>>(getLocalCollectedIds);
  const [deliverySnapshotIds, setDeliverySnapshotIds] = useState<Set<string>>(getDeliverySnapshotIds);
  const [feedbackOrder, setFeedbackOrder] = useState<DripTeaPurchaseHistoryItem | null>(null);

  // Re-sync localStorage when the customer navigates back from the order-status page
  useEffect(() => {
    function syncFromStorage() {
      setLocalCollectedIds(getLocalCollectedIds());
      setDeliverySnapshotIds(getDeliverySnapshotIds());
    }
    window.addEventListener("focus", syncFromStorage);
    document.addEventListener("visibilitychange", syncFromStorage);
    return () => {
      window.removeEventListener("focus", syncFromStorage);
      document.removeEventListener("visibilitychange", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    setCustomerName(user.fullName || "");

    async function loadPurchaseHistory() {
      try {
        const response = await getPurchaseHistory(user.id);
        setOrders(response.data || []);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load purchase history.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPurchaseHistory();
    const timer = window.setInterval(() => void loadPurchaseHistory(), 5000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    const now = Date.now();
    orders.forEach((order) => {
      const status = (order.status || "").toLowerCase();
      if (!order.createdAt) return;
      const age = now - new Date(order.createdAt).getTime();
      const isDeliveryOrder = resolveIsDeliveryOrder(order, deliverySnapshotIds);

      if (isDeliveryOrder && status !== "completed" && age >= COMPLETED_AFTER_MS) {
        void updateOrderStatus(order.id, "completed").catch(console.error);
        return;
      }

      if ((status === "pending" || status === "preparing") && age >= READY_AFTER_MS) {
        void updateOrderStatus(order.id, "ready").catch(console.error);
      }
    });
  }, [orders, deliverySnapshotIds]);

  const activeOrders = orders.filter(o =>
    ["pending", "preparing", "ready"].includes((o.status || "").toLowerCase())
  ).length;

  return (
    <div className="purchase-page">
      <Header />

      <main className="purchase-main">

        {/* Header */}
        <div className="purchase-header">
          <div className="purchase-header-top">
            <div className="purchase-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <h1>Purchase History</h1>
          </div>
          <p className="purchase-header-sub">{customerName || "Account"}</p>
        </div>

        {/* Summary chips */}
        {!isLoading && !message && orders.length > 0 && (
          <div className="purchase-summary">
            <div className="purchase-summary-chip">
              <strong>{orders.length}</strong> order{orders.length !== 1 ? "s" : ""}
            </div>
            <div className="purchase-summary-chip">
              Total spent <strong>S$ {totalSpent(orders).toFixed(2)}</strong>
            </div>
            {activeOrders > 0 && (
              <div className="purchase-summary-chip">
                <strong>{activeOrders}</strong> active
              </div>
            )}
          </div>
        )}

        {/* States */}
        {isLoading ? (
          <p className="purchase-loading">Loading your orders…</p>
        ) : message ? (
          <p className="purchase-message">{message}</p>
        ) : orders.length === 0 ? (
          <div className="purchase-empty">
            <div className="purchase-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <h2>No orders yet</h2>
            <p>Your purchase history will appear here once you place an order.</p>
          </div>
        ) : (
          <div className="purchase-list">
            {orders.filter((order) => order.items && order.items.length > 0).map((order) => {
              const status = (order.status || "pending").toLowerCase();
              const isDeliveryOrder = resolveIsDeliveryOrder(order, deliverySnapshotIds);
              const isCompleted = status === "completed";
              const customerCollected = localCollectedIds.has(order.id);
              // Show Collect until the customer explicitly clicks it (tracked in localStorage)
              const showCollect = !isDeliveryOrder && (COLLECT_STATUSES.has(status) || (isCompleted && !customerCollected && !order.hasFeedback));
              const showFeedback = isCompleted && (isDeliveryOrder || customerCollected || !!order.hasFeedback);
              const showTrack = TRACK_STATUSES.has(status);
              return (
                <article key={order.id} className="purchase-order" data-status={status}>

                  {/* Card header */}
                  <div className="purchase-order-head">
                    <div>
                      <h2 className="purchase-order-no">Order #{order.displayOrderNo || "0001"}</h2>
                      <p className="purchase-order-date">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="purchase-order-meta">
                      <div className="purchase-order-badges">
                        <span className="purchase-type-badge">
                          {isDeliveryOrder ? "Delivery" : "Pickup"}
                        </span>
                        {!isDeliveryOrder && order.deliveryDetails?.outletName && (
                          <span className="purchase-outlet-badge">
                            {order.deliveryDetails.outletName}
                          </span>
                        )}
                        <span className={`purchase-status-badge purchase-status-${status}`}>
                          {formatStatus(order.status, isDeliveryOrder)}
                        </span>
                      </div>
                      <span className="purchase-order-amount">
                        S$ {Number(order.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="purchase-divider" />

                  {/* Items */}
                  <div className="purchase-items">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div key={`${order.id}-${item.name}-${index}`} className="purchase-item">
                          <img
                            src={item.image || "/img/no-image.png"}
                            alt={item.name}
                            className="purchase-item-image"
                          />
                          <div className="purchase-item-info">
                            <strong className="purchase-item-name">
                              {item.name} × {item.quantity}
                            </strong>
                            <p className="purchase-item-custom">
                              {formatCustomization(item.customization)}
                            </p>
                            <p className="purchase-item-unit">
                              S$ {Number(item.unitPrice || 0).toFixed(2)} each
                            </p>
                          </div>
                          <span className="purchase-item-price">
                            S$ {Number(item.lineTotal || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="purchase-message">No items recorded for this order.</p>
                    )}
                    {isDeliveryOrder && order.deliveryDetails?.deliveryFee != null && (
                      <div className="purchase-delivery-fee-row">
                        <span>Delivery Fee</span>
                        <span>S$ {Number(order.deliveryDetails.deliveryFee).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="purchase-order-foot">
                    <div className="purchase-payment-label">
                      Payment
                      <span className="purchase-payment-badge">
                        {formatPaymentStatus(order.paymentStatus)}
                      </span>
                    </div>
                    <div className="purchase-order-actions">
                      {showTrack && (
                        <Link href={`/order-status/${order.id}`} className="purchase-track-btn">
                          {isDeliveryOrder ? "Track Delivery" : "Track Order"}
                        </Link>
                      )}
                      {showCollect && (
                        <Link href={`/order-status/${order.id}`} className="purchase-collect-btn">
                          {COLLECT_STATUSES.has(status) ? "Ready to Collect" : "Collect"}
                        </Link>
                      )}
                      {showFeedback && (
                        order.hasFeedback ? (
                          <button
                            type="button"
                            className="purchase-feedback-btn disabled"
                            disabled
                          >
                            Feedback Submitted
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="purchase-feedback-btn"
                            onClick={() => setFeedbackOrder(order)}
                          >
                            Feedback
                          </button>
                        )
                      )}
                    </div>
                  </div>

                </article>
              );
            })}
          </div>
        )}

      </main>

      {feedbackOrder && (
        <FeedbackModal
          order={feedbackOrder}
          onClose={() => setFeedbackOrder(null)}
          onSubmitted={() => {
            setOrders((prev) =>
              prev.map((o) => (o.id === feedbackOrder.id ? { ...o, hasFeedback: true } : o))
            );
            setFeedbackOrder(null);
          }}
        />
      )}
    </div>
  );
}
