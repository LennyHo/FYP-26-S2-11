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
