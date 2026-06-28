// User Story Architecture Trace — order-status/[orderId]/page.tsx
//
// #28  Track Order Status
//      View: order-status/[orderId]/page.tsx (this file) → Route: checkout.routes.js → Ctrl: order.controller.js → Model: order.model.js
//
// #203 Track Order Status via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Model: order.model.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/layout/Header";
import { getOrder, updateOrderStatus, type DripTeaOrder } from "../../utils/staffApi";
import "../../components/pages/Checkout.css";

const PHASE1_MS = 8_000;
const TOTAL_MS = 28_000;
const LS_COLLECTED_KEY = "driptea_collected_orders";

function markCollectedLocally(id: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(LS_COLLECTED_KEY) ?? "[]") as string[];
    if (!ids.includes(id)) {
      localStorage.setItem(LS_COLLECTED_KEY, JSON.stringify([...ids, id]));
    }
  } catch {}
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

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";

  const [order, setOrder] = useState<DripTeaOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [countdown, setCountdown] = useState(8);
  const [collected, setCollected] = useState(false);

  // Single effect keyed on orderId — fetches once, starts the phase timer, then
  // polls in the background. The timer lives entirely inside this effect so it
  // is never torn down by a polling state update.
  useEffect(() => {
    if (!orderId) return;

    let running = true;
    let countTimer: number | undefined;
    let pollTimer: number | undefined;

    function startPhase2Timer(initialCount: number) {
      let count = initialCount;
      setPhase(2);
      setCountdown(count);
      const t = window.setInterval(() => {
        if (!running) return;
        count--;
        setCountdown(count);
        if (count <= 0) {
          window.clearInterval(t);
          setPhase(3);
          void updateOrderStatus(orderId, "ready").catch(console.error);
        }
      }, 1000);
      countTimer = t;
    }

    async function init() {
      try {
        const res = await getOrder(orderId);
        if (!running) return;

        const firstOrder = res.data;
        setOrder(firstOrder);

        const status = firstOrder.status.toLowerCase();

        if (status === "completed") {
          setPhase(3);
          setCollected(true);
          markCollectedLocally(orderId);
          setIsLoading(false);
          return;
        }

        if (status === "ready") {
          setPhase(3);
          setIsLoading(false);
          return;
        }

        const age = firstOrder.createdAt
          ? Date.now() - new Date(firstOrder.createdAt).getTime()
          : 0;

        if (age >= TOTAL_MS) {
          setPhase(3);
          void updateOrderStatus(orderId, "ready").catch(console.error);
          setIsLoading(false);
          return;
        }

        if (age >= PHASE1_MS) {
          // Jump straight into phase 2 with remaining time
          startPhase2Timer(Math.ceil((TOTAL_MS - age) / 1000));
        } else {
          // Start phase 1 with remaining time, then chain into phase 2
          let count = Math.ceil((PHASE1_MS - age) / 1000);
          setPhase(1);
          setCountdown(count);
          countTimer = window.setInterval(() => {
            if (!running) return;
            count--;
            setCountdown(count);
            if (count <= 0) {
              window.clearInterval(countTimer);
              startPhase2Timer(20);
            }
          }, 1000);
        }
      } catch {
        if (running) setError("Unable to load order. Please try again.");
      } finally {
        if (running) setIsLoading(false);
      }
    }

    void init();

    // Background poll — only updates display state, never touches the timer
    pollTimer = window.setInterval(async () => {
      if (!running) return;
      try {
        const res = await getOrder(orderId);
        setOrder(res.data);
        const s = res.data.status.toLowerCase();
        if (s === "completed") setCollected(true);
        if (s === "completed" || s === "cancelled") window.clearInterval(pollTimer);
      } catch {}
    }, 3000);

    return () => {
      running = false;
      if (countTimer) window.clearInterval(countTimer);
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [orderId]);

  async function handleCollect() {
    try {
      await updateOrderStatus(orderId, "completed");
      markCollectedLocally(orderId);
      setCollected(true);

      console.log("[OrderStatus] dispatch chatbotSystemMessage", {
        orderId,
        items: order?.items,
      });
      
      window.dispatchEvent(
        new CustomEvent("chatbotSystemMessage", {
          detail: {
            text:
              "We hope you enjoyed your order. We'd love to hear your thoughts — your feedback helps us deliver a better experience every time.",
            feedbackOrderId: orderId,
            feedbackItems: (order?.items || []).map((item) => ({
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
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="checkout-page">
      <Header />
      <main className="checkout-main">
        {isLoading && <p className="order-status-loading">Loading order status...</p>}
        {!isLoading && error && <p className="order-status-error">{error}</p>}

        {!isLoading && order && (
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
                <strong>Ready for<br />collection!</strong>
              </div>
            </div>

            {phase === 1 && (
              <div className="order-status-content">
                <img src="/buy_dripTea_cover.png" alt="Order sent" className="order-sent-img" />
                <div className="order-info">
                  <h1>Order #{order.orderNo}</h1>
                  <p>Your order has been sent to our baristas!</p>
                  <p><strong>Total Price:</strong> S$ {Number(order.totalAmount).toFixed(2)}</p>
                  <p className="order-phase1-hint">Preparing in {countdown}s…</p>
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
                  <h1>Order #{order.orderNo}</h1>
                  <p><strong>Customization:</strong> {formatOrderDetails(order.items)}</p>
                  <p><strong>Total Price:</strong> S$ {Number(order.totalAmount).toFixed(2)}</p>
                  <p><strong>Estimated Time:</strong> 20 sec</p>
                  <p><strong>Status:</strong> Drinks in progress…</p>
                </div>
              </div>
            )}

            {phase === 3 && !collected && (
              <div className="order-status-content">
                <div className="clock-visual-ready">Ready for<br />collection!</div>
                <div className="order-info">
                  <h1>Order #{order.orderNo}</h1>
                  <p>Your drink is ready! Please collect at the counter.</p>
                  <p><strong>Total Price:</strong> S$ {Number(order.totalAmount).toFixed(2)}</p>
                  <button type="button" className="collect-btn" onClick={handleCollect}>
                    Click to Collect
                  </button>
                </div>
              </div>
            )}

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
                  onClick={() => router.push(`/feedback/${orderId}`)}
                >
                  Leave Feedback
                </button>
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
                onClick={() => router.push("/purchase-history")}
              >
                Back to Purchase History
              </button>
            )}
          </section>
        )}
      <p className="page-disclaimer">
        Nutritional information is provided for general reference only and is not a substitute for professional medical advice. Consume at your own risk. DripTea is not liable for any health consequences arising from your order.
      </p>
      </main>
    </div>
  );
}
