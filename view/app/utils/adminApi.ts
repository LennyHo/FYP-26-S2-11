// adminApi.ts — API calls for the admin actor.
//
// Covers user stories:
//   User management  → getUsers            → GET /api/users
//                    → createUserAccount   → POST /api/users
//                    → updateUser          → PATCH /api/users/:id
//                    → suspendUser         → PATCH /api/users/:id (sets status: suspended)
//   Menu management  → updateMenuItemStatus → PATCH /api/menu-items/:id/status
//                    → createMenuItem       → POST /api/menu-items
//
// All functions call requestJson from api.base.ts — no direct fetch calls here.

import { requestJson } from './api.base';
import type { DripTeaUser, DripTeaMenuItem } from './api.base';

// ── User management ───────────────────────────────────────────────────────────

// Fetches all users, optionally filtered by search keyword. GET /api/users
export function getUsers(search: string = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return requestJson<{ ok: boolean; data: DripTeaUser[] }>(`/api/users${query}`);
}

// Creates a new user account (any role). POST /api/users
export function createUserAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  role: string;
  status: string;
}) {
  return requestJson<{ ok: boolean; data: DripTeaUser }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Updates a user's profile fields. PATCH /api/users/:id
export function updateUser(userId: string, payload: Partial<Pick<DripTeaUser, 'fullName' | 'email' | 'role' | 'status' | 'profilePic'>>) {
  return requestJson<{ ok: boolean; data: DripTeaUser }>(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Suspends a user account, preventing login. PATCH /api/users/:id
export function suspendUser(userId: string) {
  return requestJson<{ ok: boolean; data: DripTeaUser }>(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'suspended' }),
  });
}

// ── Menu item management ──────────────────────────────────────────────────────

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
  tags?: string[];
  status?: string;
}) {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem }>('/api/menu-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
