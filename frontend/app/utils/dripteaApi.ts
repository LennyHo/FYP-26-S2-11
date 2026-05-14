// done by "HDC" - small frontend bridge to the backend routes for auth, cart, and payment testing.
export type DripTeaUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
};

export type DripTeaCartItem = {
  id: string;
  userId: string;
  menuItemId: string | null;
  menuItemCode?: string;
  name: string;
  image?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  customization: Record<string, unknown>;
};

// done by "HDC" - frontend bridge follows backend port 4000.
// const API_BASE = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE || 'http://localhost:5000';
const API_BASE = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE || 'http://localhost:4000';
// end done by "HDC"
const USER_STORAGE_KEY = 'dripTeaCurrentUser';
const TOKEN_STORAGE_KEY = 'dripTeaAuthToken';

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.message === 'string' ? payload.message : 'DripTea backend request failed.';
    throw new Error(message);
  }

  return payload as T;
}

export function getStoredUser(): DripTeaUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) as DripTeaUser : null;
  } catch {
    return null;
  }
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event('authUpdated'));
}

export function addCartItem(payload: Record<string, unknown>) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem }>('/api/cart-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCartItems(userId: string) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem[] }>(`/api/cart-items?userId=${encodeURIComponent(userId)}`);
}

export function deleteCartItem(cartItemId: string) {
  return requestJson<{ ok: boolean; deletedId: string }>(`/api/cart-items/${encodeURIComponent(cartItemId)}`, {
    method: 'DELETE',
  });
}

export function checkoutCart(userId: string, paymentMethod: string) {
  return requestJson<{
    ok: boolean;
    order: { id: string; status: string; totalAmount: number; orderType: string };
    payment: { id: string; status: string; method: string };
  }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ userId, paymentMethod }),
  });
}
// end done by "HDC"
