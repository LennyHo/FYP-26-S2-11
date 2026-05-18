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

// done by "HDC" - shared local cart parser handles item details that contain pipe characters.
export type DripTeaLocalCartItem = {
  name: string;
  details: string;
  price: number;
  imageSrc?: string;
};

export function parseLocalCartLine(line: string): DripTeaLocalCartItem | null {
  const parts = String(line || '').split('|').map(part => part.trim());
  if (parts.length < 3) return null;

  const priceIndex = parts.findIndex(part => /S?\$\s*\d+(?:\.\d+)?/i.test(part));
  if (priceIndex < 1) return null;

  const priceMatch = parts[priceIndex].match(/(\d+(?:\.\d+)?)/);
  const price = priceMatch ? Number(priceMatch[1]) : Number.NaN;
  if (!Number.isFinite(price)) return null;

  const imagePart = parts.slice(priceIndex + 1).find(part =>
    part.startsWith('/') || /^https?:\/\//i.test(part) || /\.(png|jpe?g|webp|gif|svg)$/i.test(part)
  );
  const rawName = parts[0].replace(/\s*\([^)]*\)\s*$/, '').trim();
  const nameMatch = rawName.match(/^([^(]+)/);
  const name = (nameMatch ? nameMatch[1] : rawName).trim();
  const details = parts.slice(1, priceIndex).join(' | ').replace(/\s+/g, ' ').trim();

  return {
    name,
    details,
    price,
    imageSrc: imagePart,
  };
}

export function formatLocalCartLine(item: DripTeaLocalCartItem) {
  const safeDetails = item.details.replace(/\s*\|\s*/g, ' / ');
  return `${item.name}|${safeDetails}|S$ ${item.price.toFixed(2)}${item.imageSrc ? `|${item.imageSrc}` : ''}`;
}
// end done by "HDC"

// done by "HDC" - staff panel order queue type from backend orders collection.
export type DripTeaOrder = {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
  orderType: string;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  createdAt?: string;
  updatedAt?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    lineTotal: number;
    customization: Record<string, unknown>;
  }>;
};
// end done by "HDC"

// done by "HDC" - frontend bridge calls deployed Render backend unless Vercel env overrides it.
// const API_BASE = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE || 'http://localhost:4000';
// const API_BASE = process.env.NEXT_PUBLIC_DRIPTEA_API_BASE || 'http://localhost:5000';
const API_BASE = (process.env.NEXT_PUBLIC_DRIPTEA_API_BASE || 'https://fyp-26-s2-11.onrender.com').replace(/\/$/, '');
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

// done by "HDC" - staff order queue reads and updates real MongoDB orders.
export function getOrders(status: string = 'all') {
  return requestJson<{ ok: boolean; data: DripTeaOrder[] }>(`/api/orders?status=${encodeURIComponent(status)}`);
}

export function updateOrderStatus(orderId: string, status: string) {
  return requestJson<{ ok: boolean; data: { id: string; status: string } }>(`/api/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
// end done by "HDC"
// end done by "HDC"
