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

export type DripTeaStorageTarget = {
  type: string;
  database?: string;
  collection?: string;
  mongoHost?: string;
};

export type DripTeaCartItemResponse = {
  ok: boolean;
  data: DripTeaCartItem;
  storage?: DripTeaStorageTarget;
  backend?: {
    host?: string | null;
    url?: string | null;
    origin?: string | null;
    renderService?: string | null;
    renderExternalUrl?: string | null;
  };
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

// done by "HDC" - frontend bridge tries env override, Render, then local backend.
const API_BASES = [
  process.env.NEXT_PUBLIC_DRIPTEA_API_BASE,
  'https://driptea-trrn.onrender.com',
  'http://localhost:5000',
]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/$/, ''))
  .filter((value, index, values) => values.indexOf(value) === index);
// end done by "HDC"
const USER_STORAGE_KEY = 'dripTeaCurrentUser';
const TOKEN_STORAGE_KEY = 'dripTeaAuthToken';

export function getDripTeaApiBase() {
  return API_BASES[0];
}

async function requestJson<T>(path: string, init: RequestInit = {}, logLabel?: string): Promise<T> {
  let lastMessage = 'DripTea backend request failed.';

  for (let index = 0; index < API_BASES.length; index += 1) {
    const apiBase = API_BASES[index];
    let shouldTryNext = false;

    try {
      if (logLabel) {
        console.info(`[${logLabel}] ATTEMPT ${index + 1}/${API_BASES.length} backend=${apiBase}${path}`);
      }

      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        if (logLabel) {
          const storage = payload?.storage;
          const cartItemId = payload?.data?.id || "(not reported)";
          console.info(
            `[${logLabel}] SUCCESS backend=${apiBase} mongoHost=${storage?.mongoHost || "(MongoDB host not reported)"} savedTo=${storage?.type || "unknown"}:${storage?.database || "(database not reported)"}.${storage?.collection || "(collection not reported)"} cartItemId=${cartItemId}`
          );
        }

        return payload as T;
      }

      lastMessage = typeof payload?.message === 'string' ? payload.message : 'DripTea backend request failed.';
      shouldTryNext = response.status >= 500;
      if (logLabel) {
        console.warn(`[${logLabel}] FAILED backend=${apiBase} status=${response.status} retrying=${shouldTryNext} message="${lastMessage}"`);
      }
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : 'DripTea backend request failed.';
      shouldTryNext = true;
      if (logLabel) {
        console.warn(`[${logLabel}] ERROR backend=${apiBase} retrying=true message="${lastMessage}"`);
      }
    }

    if (!shouldTryNext) {
      throw new Error(lastMessage);
    }
  }

  throw new Error(lastMessage);
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
  return requestJson<DripTeaCartItemResponse>('/api/cart-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'DripTea add to cart');
}

export function getCartItems(userId: string) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem[] }>(`/api/cart-items?userId=${encodeURIComponent(userId)}`);
}

export function deleteCartItem(cartItemId: string) {
  return requestJson<{ ok: boolean; deletedId: string }>(`/api/cart-items/${encodeURIComponent(cartItemId)}`, {
    method: 'DELETE',
  });
}

export function checkoutCart(userId: string, paymentMethod: string, voucherCode?: string) {
  const payload: Record<string, unknown> = { userId, paymentMethod };
  if (voucherCode) payload.voucherCode = voucherCode;

  return requestJson<{
    ok: boolean;
    order: { id: string; status: string; totalAmount: number; orderType: string };
    payment: { id: string; status: string; method: string };
  }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
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
