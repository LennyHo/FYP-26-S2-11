// staffApi.ts — API calls for the store staff actor.
//
// Covers user stories:
//   Staff dashboard  → getOrders               → GET /api/orders?status=
//   Order detail     → getOrder                → GET /api/orders/:id
//   Update status    → updateOrderStatus        → PATCH /api/orders/:id/status
//     (pending → preparing → ready → completed)
//   Menu management  → toggleMenuItemNewArrival → PATCH /api/menu-items/:id/new-arrival
//                    → updateMenuItemStatus      → PATCH /api/menu-items/:id/status
//                    → createMenuItem            → POST /api/menu-items
//
// All functions call requestJson from api.base.ts — no direct fetch calls here.

import { requestJson } from './api.base';
import type { DripTeaOrder, DripTeaMenuItem } from './api.base';

export type { DripTeaOrder, DripTeaMenuItem };

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

// ── Menu item management ──────────────────────────────────────────────────────

// Toggles the isNewArrival flag on a menu item. PATCH /api/menu-items/:id/new-arrival
export function toggleMenuItemNewArrival(id: string) {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem }>(
    `/api/menu-items/${encodeURIComponent(id)}/new-arrival`,
    { method: 'PATCH' }
  );
}

// Toggles a menu item between active and inactive. PATCH /api/menu-items/:id/status
export function updateMenuItemStatus(id: string, status: string) {
  return requestJson<{ ok: boolean; data: { id: string; mongoId: string; status: string } }>(
    `/api/menu-items/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) }
  );
}

// Creates a new menu item. POST /api/menu-items
export function createMenuItem(payload: {
  name: string;
  category: string;
  price: number;
  description?: string;
  ingredients?: string[];
  calories?: number;
  sugar?: number;
  nutriGrade?: string;
  tags?: string[];
  status?: string;
  image?: string;
}) {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem }>('/api/menu-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
