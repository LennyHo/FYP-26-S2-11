// staffApi.ts — API calls for the store staff actor.
//
// Covers user stories:
//   Staff dashboard  → getOrders         → GET /api/orders?status=
//   Order detail     → getOrder          → GET /api/orders/:id
//   Update status    → updateOrderStatus → PATCH /api/orders/:id/status
//     (pending → preparing → ready → completed)
//
// All functions call requestJson from api.base.ts — no direct fetch calls here.

import { requestJson } from './api.base';
import type { DripTeaOrder } from './api.base';

export type { DripTeaOrder };

// Fetches all orders filtered by status. GET /api/orders
export function getOrders(status: string = 'all') {
  return requestJson<{ ok: boolean; data: DripTeaOrder[] }>(`/api/orders?status=${encodeURIComponent(status)}`);
}

// Fetches a single order by ID. GET /api/orders/:id
export function getOrder(orderId: string) {
  return requestJson<{ ok: boolean; data: DripTeaOrder }>(`/api/orders/${encodeURIComponent(orderId)}`);
}

// Updates an order status (e.g. pending → preparing → ready). PATCH /api/orders/:id/status
export function updateOrderStatus(orderId: string, status: string) {
  return requestJson<{ ok: boolean; data: { id: string; status: string } }>(
    `/api/orders/${encodeURIComponent(orderId)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) }
  );
}
