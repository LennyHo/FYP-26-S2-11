"use client";

import React, { useEffect, useState } from "react";
import Header from "./Header";
import {
  getPurchaseHistory,
  getStoredUser,
  type DripTeaPurchaseHistoryItem,
} from "../utils/dripteaApi";
import "./PurchaseHistory.css";

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

  useEffect(() => {
    async function loadPurchaseHistory() {
      try {
        const user = getStoredUser();

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
  }, []);

  return (
    <div className="purchase-page">
      <Header />

      <main className="purchase-main">
        <section className="purchase-card">
          <div className="purchase-header">
            <p>Account</p>
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
                      <span>{formatStatus(order.status)}</span>
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
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}