"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../layout/Header";
import {
  getPurchaseHistory,
  getStoredUser,
  updateOrderStatus,
  type DripTeaPurchaseHistoryItem,
} from "../../utils/dripteaApi";
import "./PurchaseHistory.css";

const TRACK_STATUSES = new Set(["pending", "preparing"]);
const COLLECT_STATUSES = new Set(["ready"]);

function formatDate(value?: string) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatCustomization(customization?: Record<string, unknown>) {
  if (!customization) return "No customization";

  const toppings = Array.isArray(customization.toppings)
    ? customization.toppings.join(", ")
    : "";

  const text = [
    customization.size,
    customization.ice,
    customization.sugar,
    toppings,
  ]
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
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load purchase history."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPurchaseHistory();

    if (!user) return;
    const timer = window.setInterval(() => void loadPurchaseHistory(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  // Auto-mark pending orders as "ready" once 28 s have elapsed since placement
  // (8 s phase 1 + 20 s phase 2). Runs on every poll so it catches orders the
  // customer placed then navigated away from before the tracking timer could fire.
  useEffect(() => {
    const READY_AFTER_MS = 28_000;
    const now = Date.now();
    orders.forEach((order) => {
      if ((order.status || "").toLowerCase() !== "pending") return;
      if (!order.createdAt) return;
      const age = now - new Date(order.createdAt).getTime();
      if (age >= READY_AFTER_MS) {
        void updateOrderStatus(order.id, "ready").catch(console.error);
      }
    });
  }, [orders]);

  return (
    <div className="purchase-page">
      <Header />

      <main className="purchase-main">
        <section className="purchase-card">
          <div className="purchase-header">
            <p>{customerName || "Account"}</p>
            <h1>Purchase History</h1>
          </div>

          {isLoading ? (
            <p className="purchase-message">Loading purchase history...</p>
          ) : message ? (
            <p className="purchase-message">{message}</p>
          ) : orders.length === 0 ? (
            <p className="purchase-message">No purchase history found.</p>
          ) : (
            <div className="purchase-list">
              {orders.map((order) => (
                <article key={order.id} className="purchase-order">
                  <div className="purchase-order-top">
                    <div>
                      <h2>Order #{order.displayOrderNo || "0001"}</h2>
                      <p>{formatDate(order.createdAt)}</p>
                    </div>

                    <div className="purchase-status">
                      <span className={`purchase-status-badge purchase-status-${(order.status || "pending").toLowerCase()}`}>{formatStatus(order.status)}</span>
                      <strong>
                        S$ {Number(order.totalAmount || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="purchase-divider" />

                  <div className="purchase-items">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div
                          key={`${order.id}-${item.name}-${index}`}
                          className="purchase-item"
                        >
                          <img
                            src={item.image || "/img/no-image.png"}
                            alt={item.name}
                            className="purchase-item-image"
                          />

                          <div className="purchase-item-info">
                            <strong>
                              {item.name} × {item.quantity}
                            </strong>
                            <p>{formatCustomization(item.customization)}</p>
                          </div>

                          <span className="purchase-item-price">
                            S$ {Number(item.lineTotal || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="purchase-message">
                        No purchased items recorded for this order.
                      </p>
                    )}
                  </div>

                  <div className="purchase-payment">
                    Payment status:{" "}
                    <strong>{formatPaymentStatus(order.paymentStatus)}</strong>
                  </div>

                  {TRACK_STATUSES.has((order.status || "").toLowerCase()) && (
                    <Link href={`/order-status/${order.id}`} className="purchase-track-btn">
                      Track Order
                    </Link>
                  )}
                  {COLLECT_STATUSES.has((order.status || "").toLowerCase()) && (
                    <Link href={`/order-status/${order.id}`} className="purchase-collect-btn">
                      Ready to Collect
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}