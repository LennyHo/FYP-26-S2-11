"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../layout/Header";
import { getPurchaseHistory } from "../../utils/customerApi";
import { updateOrderStatus } from "../../utils/staffApi";
import { getStoredUser, type DripTeaPurchaseHistoryItem } from "../../utils/api.base";
import "./PurchaseHistory.css";

const TRACK_STATUSES = new Set(["pending", "preparing"]);
const COLLECT_STATUSES = new Set(["ready"]);

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

function formatStatus(status?: string) {
  if (!status) return "Pending";
  if (status.toLowerCase() === "completed") return "Collected";
  if (status.toLowerCase() === "ready") return "Ready for collection";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatPaymentStatus(status?: string) {
  if (!status) return "Paid";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function totalSpent(orders: DripTeaPurchaseHistoryItem[]) {
  return orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
}

export default function PurchaseHistory() {
  const [orders, setOrders] = useState<DripTeaPurchaseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (user?.fullName) setCustomerName(user.fullName);

    async function loadPurchaseHistory() {
      try {
        if (!user) {
          setMessage("Please log in to view your purchase history.");
          setOrders([]);
          return;
        }
        const response = await getPurchaseHistory(user.id);
        setOrders(response.data || []);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load purchase history.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadPurchaseHistory();
    if (!user) return;
    const timer = window.setInterval(() => void loadPurchaseHistory(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const READY_AFTER_MS = 28_000;
    const now = Date.now();
    orders.forEach((order) => {
      if ((order.status || "").toLowerCase() !== "pending") return;
      if (!order.createdAt) return;
      if (now - new Date(order.createdAt).getTime() >= READY_AFTER_MS) {
        void updateOrderStatus(order.id, "ready").catch(console.error);
      }
    });
  }, [orders]);

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
              return (
                <article key={order.id} className="purchase-order" data-status={status}>

                  {/* Card header */}
                  <div className="purchase-order-head">
                    <div>
                      <h2 className="purchase-order-no">Order #{order.displayOrderNo || "0001"}</h2>
                      <p className="purchase-order-date">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="purchase-order-meta">
                      <span className={`purchase-status-badge purchase-status-${status}`}>
                        {formatStatus(order.status)}
                      </span>
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
                          </div>
                          <span className="purchase-item-price">
                            S$ {Number(item.lineTotal || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="purchase-message">No items recorded for this order.</p>
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
                      {TRACK_STATUSES.has(status) && (
                        <Link href={`/order-status/${order.id}`} className="purchase-track-btn">
                          Track Order
                        </Link>
                      )}
                      {COLLECT_STATUSES.has(status) && (
                        <Link href={`/order-status/${order.id}`} className="purchase-collect-btn">
                          Ready to Collect
                        </Link>
                      )}
                      {status === "completed" && (
                        order.hasFeedback ? (
                          <button
                            type="button"
                            className="purchase-feedback-btn disabled"
                            disabled
                          >
                            Feedback Submitted
                          </button>
                        ) : (
                          <Link href={`/feedback/${order.id}`} className="purchase-feedback-btn">
                            Feedback
                          </Link>
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
    </div>
  );
}
