// Shared, server-side order-progress timing — the single source of truth for
// how long an order sits in "preparing" before it's "ready", etc. These are the
// same demo timers the order-status tracking page (order-status/[orderId]/page.tsx)
// has always used to simulate prep/delivery; this module lets any backend reader
// (the chatbot, the tracking page's own polling) derive the same up-to-date
// status without depending on that page's client-side timers having fired.
const PREPARING_MS = 5_000;
const OUT_FOR_DELIVERY_MS = 10_000;
const DELIVERED_MS = 20_000;

const ACTIVE_STATUSES = new Set(["pending", "paid", "preparing", "ready"]);

function phaseDurationMs(status, isDeliveryOrder) {
  if (status === "pending" || status === "paid") return PREPARING_MS;
  if (status === "preparing") return OUT_FOR_DELIVERY_MS - PREPARING_MS;
  if (status === "ready" && isDeliveryOrder) return DELIVERED_MS - OUT_FOR_DELIVERY_MS;
  return 0;
}

function nextStatus(status) {
  if (status === "pending" || status === "paid") return "preparing";
  if (status === "preparing") return "ready";
  return "completed";
}

// Computes what an order's status should be *right now*, given how long it has
// sat in its current status (order.updatedAt, since status updates are the only
// thing that touches it in practice). Pickup orders stop auto-advancing at
// "ready" — matches the tracking page, which waits for a manual "Collect" click.
function deriveCurrentStatus(order) {
  const isDeliveryOrder = order.orderType === "delivery";
  let status = order.status;
  let sinceMs = new Date(order.updatedAt).getTime();
  const nowMs = Date.now();

  while (ACTIVE_STATUSES.has(status)) {
    const duration = phaseDurationMs(status, isDeliveryOrder);
    if (duration <= 0 || nowMs - sinceMs < duration) break;
    sinceMs += duration;
    status = nextStatus(status);
  }

  return status;
}

module.exports = {
  PREPARING_MS,
  OUT_FOR_DELIVERY_MS,
  DELIVERED_MS,
  deriveCurrentStatus,
};
