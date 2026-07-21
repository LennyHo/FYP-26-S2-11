// adminApi.ts — API calls for the user-admin actor.
//
// Covers user stories:
//   User management  → getUsers          → GET /api/users
//                    → createUserAccount → POST /api/users
//                    → updateUser        → PATCH /api/users/:id
//                    → suspendUser       → PATCH /api/users/:id (sets status: suspended)
//
// Menu management (toggleMenuItemNewArrival, updateMenuItemStatus, createMenuItem)
// belongs to store staff and lives in staffApi.ts.
//
// All functions call requestJson from api.base.ts — no direct fetch calls here.

import { requestJson } from './api.base';
import type { DripTeaAddress, DripTeaUser } from './api.base';

export type { DripTeaAddress, DripTeaUser };

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
  addresses?: DripTeaAddress[];
  storeCode?: string | null;
}) {
  return requestJson<{ ok: boolean; data: DripTeaUser }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Updates a user's profile fields. PATCH /api/users/:id
export function updateUser(userId: string, payload: Partial<Pick<DripTeaUser, 'fullName' | 'email' | 'role' | 'status' | 'profilePic' | 'addresses'>> & { storeCode?: string | null }) {
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

// ── Role descriptions (User Profiles tab) ───────────────────────────────────────

// Fetches the description text for each profile/role type. GET /api/role-descriptions
export function getRoleDescriptions() {
  return requestJson<{ ok: boolean; data: Record<string, string> }>('/api/role-descriptions');
}

// Updates the description text for a profile/role type. PATCH /api/role-descriptions/:role
export function updateRoleDescription(role: string, description: string) {
  return requestJson<{ ok: boolean; data: { role: string; description: string } }>(
    `/api/role-descriptions/${encodeURIComponent(role)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ description }),
    }
  );
}

