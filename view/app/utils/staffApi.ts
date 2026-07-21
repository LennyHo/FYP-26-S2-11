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
//                    → updateMenuItem            → PATCH /api/menu-items/:id
//   Vouchers         → getStaffVouchers          → GET /api/staff/vouchers
//                    → createVoucher             → POST /api/staff/vouchers
//                    → deleteVoucher             → DELETE /api/staff/vouchers/:id
//
// All functions call requestJson from api.base.ts — no direct fetch calls here.

import { requestJson } from './api.base';
import type { DripTeaOrder, DripTeaMenuItem, DripTeaInventoryItem, DripTeaFeedback, DripTeaVoucher } from './api.base';

export type { DripTeaOrder, DripTeaMenuItem, DripTeaInventoryItem, DripTeaFeedback, DripTeaVoucher };

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

// ── Feedback (staff view) ─────────────────────────────────────────────────────

// Fetches feedback for a list of order IDs, grouped by orderId. GET /api/feedback/orders?ids=...
export function getOrderFeedbacks(orderIds: string[]) {
  if (!orderIds.length) {
    return Promise.resolve({ ok: true, data: {} as Record<string, DripTeaFeedback[]> });
  }
  return requestJson<{ ok: boolean; data: Record<string, DripTeaFeedback[]> }>(
    `/api/feedback/orders?ids=${orderIds.map(encodeURIComponent).join(',')}`
  );
}

// ── Voucher management ───────────────────────────────────────────────────────

// Fetches every voucher, including inactive/expired ones. GET /api/staff/vouchers
export function getStaffVouchers() {
  return requestJson<{ ok: boolean; data: DripTeaVoucher[] }>('/api/staff/vouchers');
}

// Deletes a voucher. DELETE /api/staff/vouchers/:id
export function deleteVoucher(id: string) {
  return requestJson<{ ok: boolean; data: { id: string } }>(
    `/api/staff/vouchers/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}

// Creates a new voucher. Vouchers have no store/outlet field, so this is immediately
// visible to every store staff account (same GET /api/staff/vouchers list for everyone).
// POST /api/staff/vouchers
export function createVoucher(payload: {
  code: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number | null;
  minSpend?: number;
  isActive?: boolean;
  expiresAt?: string | null;
}) {
  return requestJson<{ ok: boolean; data: DripTeaVoucher }>('/api/staff/vouchers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Inventory management ──────────────────────────────────────────────────────

// Fetches all inventory items. GET /api/inventory
export function getInventory() {
  return requestJson<{ ok: boolean; data: DripTeaInventoryItem[] }>('/api/inventory');
}

// Creates a new inventory item. POST /api/inventory
export function createInventoryItem(payload: {
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold?: number;
  description?: string;
}) {
  return requestJson<{ ok: boolean; data: DripTeaInventoryItem }>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Updates an inventory item's quantity (absolute value). PATCH /api/inventory/:id
export function updateInventoryQty(id: string, quantity: number) {
  return requestJson<{ ok: boolean; data: DripTeaInventoryItem }>(
    `/api/inventory/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify({ quantity }) }
  );
}

// Deletes an inventory item. DELETE /api/inventory/:id
export function deleteInventoryItem(id: string) {
  return requestJson<{ ok: boolean; data: { id: string } }>(
    `/api/inventory/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
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

// Updates a menu item's full details (name, category, price, description, ingredients, nutrition, tags, image).
// PATCH /api/menu-items/:id
export function updateMenuItem(id: string, payload: {
  name: string;
  category: string;
  price: number;
  description?: string;
  ingredients?: string[];
  calories?: number;
  sugar?: number;
  nutriGrade?: string;
  tags?: string[];
  image?: string;
}) {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem }>(
    `/api/menu-items/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(payload) }
  );
}
