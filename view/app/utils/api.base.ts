// api.base.ts — Shared foundation for all API actor files.
//
// Architecture:
//   customerApi.ts  ──┐
//   staffApi.ts     ──┤─ all import requestJson, types, and session helpers from here
//   adminApi.ts     ──┤
//   chatbotApi.ts   ──┘
//
// This file does NOT make any backend calls itself.
// It provides the building blocks that every actor file uses.

// ── Types ─────────────────────────────────────────────────────────────────────

export type DripTeaAddress = {
  _id?: string;
  label?: string;
  address: string;
  isDefault?: boolean;
};

export type DripTeaUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  profilePic?: string;
  addresses?: DripTeaAddress[];
  createdAt?: string;
  updatedAt?: string;
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

export type DripTeaDeliveryDetails = {
  type?: string;
  outletName: string;
  outletAddress: string;
  outletLat: number;
  outletLng: number;
  customerLat: number;
  customerLng: number;
  customerAddress?: string;
  distanceKm: number;
  deliveryFee: number;
  deliveryStatus?: string;
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

export type DripTeaLocalCartItem = {
  name: string;
  details: string;
  price: number;
  imageSrc?: string;
};

export type DripTeaMenuItem = {
  id: string;
  mongoId: string;
  name: string;
  image?: string;
  category: string;
  tags?: string[];
  price: number;
  description?: string;
  status: string;
  base_calories?: number;
  base_sugar_g?: number;
  nutri_grade?: string;
  drinkInfo?: {
    ingredients: string[];
    diabeticAdvice: string;
    insulinImpact: string;
  };
  rating?: number;
  isNewArrival?: boolean;
};

export type DripTeaOrder = {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
  orderType: string;
  totalAmount: number;
  deliveryDetails?: DripTeaDeliveryDetails | null;
  paymentStatus: string;
  createdAt?: string;
  updatedAt?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    lineTotal: number;
    image: string;
    menuItemId?: string;
    menuItemCode?: string;
    customization: Record<string, unknown>;
  }>;
};

export type DripTeaVoucher = {
  code: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number | null;
  minSpend?: number;
  // Present on the staff-facing voucher list (GET /api/staff/vouchers) — omitted
  // from the customer-facing active-vouchers list (GET /api/vouchers).
  _id?: string;
  isActive?: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DripTeaFeedback = {
  _id: string;
  drinkName: string;
  rating: number;
  comment: string;
  createdAt?: string;
};

export type DripTeaStore = {
  storeCode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  openingHours?: { weekday: string; weekend: string };
  status?: string;
};

export type DripTeaInventoryItem = {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  description: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DripTeaPurchaseHistoryItem = {
  id: string;
  orderNo: string;
  displayOrderNo?: string;
  status: string;
  orderType?: string;
  paymentStatus: string;
  totalAmount: number;
  deliveryDetails?: DripTeaDeliveryDetails | null;
  createdAt?: string;
  hasFeedback?: boolean;
  items: Array<{
    id?: string;
    name: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    menuItemId?: string;
    menuItemCode?: string;
    customization?: Record<string, unknown>;
  }>;
};

// ── API base URLs ─────────────────────────────────────────────────────────────
// Ordered list of backend URLs to try. requestJson tries them in sequence.
// localhost:5000 is tried first (dev), then the env var (staging), then Render (prod).

export const API_BASES = [
  'http://localhost:5000',
  process.env.NEXT_PUBLIC_DRIPTEA_API_BASE,
  'https://driptea-trrn.onrender.com',
]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/$/, ''))
  .filter((value, index, values) => values.indexOf(value) === index);

export function getDripTeaApiBase() {
  return API_BASES[0];
}

// ── Core fetch helper ─────────────────────────────────────────────────────────
// requestJson is the single entry point for ALL backend calls in the app.
// Every function in customerApi, staffApi, and adminApi calls this.
//
// Retry logic:
//   - 5xx (server error) or network failure → try the next backend URL
//   - 4xx (client error e.g. 404, 401)      → throw immediately, no retry
//   - 2xx (success)                          → return the parsed JSON payload

export async function requestJson<T>(path: string, init: RequestInit = {}, logLabel?: string): Promise<T> {
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
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        // Success — log storage info if this is a cart call, then return
        if (logLabel) {
          const storage = payload?.storage;
          const cartItemId = payload?.data?.id || '(not reported)';
          console.info(
            `[${logLabel}] SUCCESS backend=${apiBase} mongoHost=${storage?.mongoHost || '(MongoDB host not reported)'} savedTo=${storage?.type || 'unknown'}:${storage?.database || '(database not reported)'}.${storage?.collection || '(collection not reported)'} cartItemId=${cartItemId}`
          );
        }
        return payload as T;
      }

      // 4xx → stop immediately; 5xx → try next backend
      lastMessage = typeof payload?.message === 'string' ? payload.message : 'DripTea backend request failed.';
      shouldTryNext = response.status >= 500;
      if (logLabel) {
        console.warn(`[${logLabel}] FAILED backend=${apiBase} status=${response.status} retrying=${shouldTryNext} message="${lastMessage}"`);
      }
    } catch (error) {
      // Network error (backend unreachable) → try next backend
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

  // All backends exhausted
  throw new Error(lastMessage);
}

// ── Auth session (localStorage) ───────────────────────────────────────────────
// These helpers read/write the logged-in user from localStorage so any component
// can access the current user without making a backend call.
// storeUser and clearStoredUser fire an 'authUpdated' window event so the
// Header re-renders immediately after login or logout.

const USER_STORAGE_KEY = 'dripTeaCurrentUser';
const TOKEN_STORAGE_KEY = 'dripTeaAuthToken';

// Set by the Reward page's "USE NOW" button, read once by the checkout page to
// pre-select that voucher in the dropdown.
export const PENDING_VOUCHER_KEY = 'driptea_pending_voucher';

export function getStoredUser() {
  if (typeof window === 'undefined') return null;

  const raw =
    localStorage.getItem(USER_STORAGE_KEY) ||
    localStorage.getItem('dripteaUser') ||
    localStorage.getItem('driptea_user') ||
    localStorage.getItem('user');

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeUser(user: DripTeaUser, token?: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new Event('authUpdated'));
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event('authUpdated'));
}

// ── Local cart helpers ────────────────────────────────────────────────────────
// The cart is cached in localStorage as a pipe-delimited string, one item per line:
//   "Matcha Latte|Regular|Less Ice|25% Sugar|S$ 7.50|/img/b001.png"
// This lets the cart badge and cart page read the count without a backend call.
// A 'cartUpdated' window event is fired whenever this data changes.

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

  return { name, details, price, imageSrc: imagePart };
}

export function formatLocalCartLine(item: DripTeaLocalCartItem) {
  const safeDetails = item.details.replace(/\s*\|\s*/g, ' / ');
  return `${item.name}|${safeDetails}|S$ ${item.price.toFixed(2)}${item.imageSrc ? `|${item.imageSrc}` : ''}`;
}

export function cartItemsToLocalCartData(items: DripTeaCartItem[]) {
  return items
    .map((item) => {
      const toppings = Array.isArray(item.customization?.toppings)
        ? (item.customization.toppings as string[]).join(', ')
        : '';
      const details = [
        item.quantity ? `Qty ${item.quantity}` : '',
        typeof item.customization?.size === 'string' ? item.customization.size : '',
        typeof item.customization?.ice === 'string' ? item.customization.ice : '',
        typeof item.customization?.sugar === 'string' ? item.customization.sugar : '',
        toppings,
      ].filter(Boolean).join(' | ');

      return formatLocalCartLine({
        name: item.name,
        details,
        price: Number(item.lineTotal || 0),
        imageSrc: item.image,
      });
    })
    .join('\n');
}
