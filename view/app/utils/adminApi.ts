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

// Suspends a user account, preventing login. PATCH /api/users/:id/suspend
export function suspendUser(userId: string) {
  return requestJson<{ ok: boolean; data: DripTeaUser }>(`/api/users/${encodeURIComponent(userId)}/suspend`, {
    method: 'PATCH',
  });
}

// ── User profiles (User Profiles tab) ─────────────────────────────────────────

export type DripTeaProfile = {
  id: string;
  value: string;
  label: string;
  description: string;
  status: 'active' | 'suspended';
  isBuiltIn: boolean;
  updatedAt?: string;
};

// GET /api/profiles
export function getProfiles() {
  return requestJson<{ ok: boolean; data: DripTeaProfile[] }>('/api/profiles');
}

// POST /api/profiles
export function createProfile(payload: { label: string; description: string; status: string }) {
  return requestJson<{ ok: boolean; data: DripTeaProfile }>('/api/profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// PATCH /api/profiles/:value
export function updateProfile(value: string, payload: { description?: string; status?: string; label?: string }) {
  return requestJson<{ ok: boolean; data: DripTeaProfile }>(
    `/api/profiles/${encodeURIComponent(value)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}


