// customerApi.ts — API calls for the customer actor.
//
// Covers user stories:
//   #191 Register account       → registerCustomer    → POST /api/auth/register
//   #22  Login                  → loginCustomer       → POST /api/auth/login
//   #14  Reset password         → resetPassword       → POST /api/auth/reset-password
//   #246 Change password        → changePassword      → PATCH /api/auth/change-password
//   #13  View menu              → getMenuItems        → GET /api/menu-items
//   #21  Search beverages       → searchBeverage      → GET /api/menu/search
//   #15  Add to cart            → addCartItem         → POST /api/cart-items
//   #16  View cart              → getCartItems        → GET /api/cart-items
//   #17  Edit cart              → updateCartItem      → PATCH /api/cart-items/:id
//   #23  Checkout               → checkoutCart        → POST /api/checkout
//   #19  Purchase history       → getPurchaseHistory  → GET /api/purchase-history
//   #246 Update account         → updateUser          → PATCH /api/users/:id
//   #307 Feedback                                         → POST /api/feedback
//
// All functions call requestJson from api.base.ts — no direct fetch calls here.

import { requestJson, storeUser, cartItemsToLocalCartData } from './api.base';
import type {
  DripTeaUser,
  DripTeaCartItem,
  DripTeaCartItemResponse,
  DripTeaMenuItem,
  DripTeaPurchaseHistoryItem,
  DripTeaVoucher,
  DripTeaDeliveryDetails,
  DripTeaStore,
  DripTeaStoreCrowdStat,
  DripTeaOrderQueueStatus,
} from './api.base';


// ── Auth ──────────────────────────────────────────────────────────────────────

// Registers a new customer account. POST /api/auth/register
export async function registerCustomer(payload: {
  fullName: string;
  email: string;
  password: string;
}) {
  const response = await requestJson<{ ok: boolean; user: DripTeaUser; token: string }>(
    '/api/auth/register',
    { method: 'POST', body: JSON.stringify(payload) }
  );
  if (response.ok && response.user) storeUser(response.user, response.token);
  return response;
}

// Logs in an existing customer. POST /api/auth/login
export async function loginCustomer(payload: {
  email: string;
  password: string;
}) {
  const response = await requestJson<{ ok: boolean; user: DripTeaUser; token: string }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify(payload) }
  );
  if (response.ok && response.user) storeUser(response.user, response.token);
  return response;
}

// Checks if an email is registered before allowing a password reset.
export async function checkEmailExists(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await requestJson<{ ok: boolean; data: DripTeaUser[] }>(
    `/api/users?search=${encodeURIComponent(normalizedEmail)}`
  );
  const exists = response.data.some(user => user.email.trim().toLowerCase() === normalizedEmail);
  if (!exists) throw new Error('No account was found for that email address.');
  return { ok: true };
}

// Resets a customer's password by email. POST /api/auth/reset-password
export function resetPassword(email: string, newPassword: string) {
  return requestJson<{ ok: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
  });
}

// Changes a logged-in customer's password. PATCH /api/auth/change-password
export function changePassword(userId: string, currentPassword: string, newPassword: string) {
  return requestJson<{ ok: boolean; message: string }>('/api/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  });
}

// ── Menu ──────────────────────────────────────────────────────────────────────

// Fetches menu items, optionally filtered by status. GET /api/menu-items
export function getMenuItems(status: string = 'all') {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem[] }>(`/api/menu-items?status=${encodeURIComponent(status)}`);
}

// Searches menu items by keyword. GET /api/menu/search
export function searchBeverage(keyword: string) {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem[] }>(`/api/menu/search?q=${encodeURIComponent(keyword)}`);
}

// ── Stores ────────────────────────────────────────────────────────────────────

// Fetches all active store locations. GET /api/stores
export function getStores() {
  return requestJson<{ ok: boolean; data: DripTeaStore[] }>('/api/stores');
}

// #301 - Fetches live store crowd/order load. GET /api/stores/crowd
export function getStoreCrowdStats() {
  return requestJson<{ ok: boolean; data: DripTeaStoreCrowdStat[] }>('/api/stores/crowd');
}

// #301 - Fetches queue position/cups before one customer order. GET /api/orders/:id/queue
export function getOrderQueueStatus(orderId: string) {
  return requestJson<{ ok: boolean; data: DripTeaOrderQueueStatus }>(
    `/api/orders/${encodeURIComponent(orderId)}/queue`
  );
}

// ── Cart ──────────────────────────────────────────────────────────────────────

// Adds a customised drink to the cart. POST /api/cart-items
export function addCartItem(payload: Record<string, unknown>) {
  return requestJson<DripTeaCartItemResponse>('/api/cart-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'DripTea add to cart');
}

// Fetches all cart items for a user. GET /api/cart-items?userId
export function getCartItems(userId: string) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem[]; itemCount?: number }>(
    `/api/cart-items?userId=${encodeURIComponent(userId)}`
  );
}

// Fetches a single cart item by ID. GET /api/cart-items/:id
export function getCartItem(cartItemId: string) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem }>(
    `/api/cart-items/${encodeURIComponent(cartItemId)}`
  );
}

// Updates the quantity of a cart item. PATCH /api/cart-items/:id
export function updateCartItemQuantity(cartItemId: string, quantity: number) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem }>(
    `/api/cart-items/${encodeURIComponent(cartItemId)}`,
    { method: 'PATCH', body: JSON.stringify({ quantity }) }
  );
}

// Updates customisation details on a cart item. PATCH /api/cart-items/:id
export function updateCartItem(cartItemId: string, payload: Record<string, unknown>) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem }>(
    `/api/cart-items/${encodeURIComponent(cartItemId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) }
  );
}

// Removes a cart item. DELETE /api/cart-items/:id
export function deleteCartItem(cartItemId: string) {
  return requestJson<{ ok: boolean; deletedId: string }>(
    `/api/cart-items/${encodeURIComponent(cartItemId)}`,
    { method: 'DELETE' }
  );
}

// Pushes guest localStorage cart items into the backend on login.
export async function migrateLocalCartToBackend(userId: string): Promise<void> {
  const localData = window.localStorage.getItem('dripTeaCartData');
  if (!localData) return;

  const lines = localData.split('\n').filter((l) => l.trim());
  if (!lines.length) return;

  const { parseLocalCartLine } = await import('./api.base');

  const migrations = lines.map(async (line) => {
    const parsed = parseLocalCartLine(line);
    if (!parsed) return;

    const codeMatch = (parsed.imageSrc || '').match(/\/([a-z]\d{2,4})\.(?:png|jpe?g|webp)/i);
    const menuItemCode = codeMatch ? codeMatch[1].toLowerCase() : null;
    if (!menuItemCode) return;

    const parts = (parsed.details || '').split('|').map((p) => p.trim());
    const qtyMatch = parts[0]?.match(/Qty\s+(\d+)/i);
    const quantity = qtyMatch ? Number(qtyMatch[1]) : 1;
    const size = parts[1] || 'Regular';
    const ice = parts[2] || 'Normal Ice';
    const sugar = parts[3] || '100% Sugar';
    const toppingRaw = (parts[4] || '').trim();
    const toppings = toppingRaw ? [toppingRaw] : [];

    await addCartItem({ userId, menuItemId: menuItemCode, quantity, customization: { size, ice, sugar, toppings } });
  });

  await Promise.allSettled(migrations);
}

// Syncs the backend cart to localStorage. Must be called after migrateLocalCartToBackend.
export async function syncStoredCartFromBackend(userId: string): Promise<DripTeaCartItem[]> {
  const response = await getCartItems(userId);
  const cartData = cartItemsToLocalCartData(response.data || []);

  if (cartData) {
    window.localStorage.setItem('dripTeaCartData', cartData);
  } else {
    window.localStorage.removeItem('dripTeaCartData');
  }

  return response.data || [];
}

// ── Vouchers ──────────────────────────────────────────────────────────────────

// Fetches all vouchers the customer can apply at checkout. GET /api/vouchers
export function getVouchers() {
  return requestJson<{ ok: boolean; data: DripTeaVoucher[] }>('/api/vouchers');
}

// Validates a voucher against the cart and previews the discount. POST /api/cart/apply-voucher
export function applyVoucher(payload: { userId?: string; voucherCode: string; subtotal?: number }) {
  return requestJson<{
    ok: boolean;
    message?: string;
    data: {
      voucher: { code: string; title: string; discountType: 'percentage' | 'fixed'; discountValue: number };
      subtotal: number;
      discountAmount: number;
      total: number;
    };
  }>('/api/cart/apply-voucher', { method: 'POST', body: JSON.stringify(payload) });
}

// Fetches the vouchers a customer has actually redeemed on past orders. GET /api/vouchers/used
export function getUsedVouchers(userId: string) {
  return requestJson<{
    ok: boolean;
    data: Array<{
      orderId: string;
      orderNo: string;
      voucherCode: string;
      voucherTitle: string;
      discountAmount: number;
      usedAt?: string;
    }>;
  }>(`/api/vouchers/used?userId=${encodeURIComponent(userId)}`);
}

// ── Checkout ──────────────────────────────────────────────────────────────────

// Submits the cart as an order and records a payment. POST /api/checkout
export function checkoutCart(
  userId: string,
  paymentMethod: string,
  voucherCode?: string,
  orderType?: string,
  deliveryDetails?: DripTeaDeliveryDetails | null,
  pickupOutlet?: { storeCode: string } | null
) {
  const payload: Record<string, unknown> = { userId, paymentMethod };
  if (voucherCode) payload.voucherCode = voucherCode;
  if (orderType) payload.orderType = orderType;
  if (deliveryDetails) payload.deliveryDetails = deliveryDetails;
  if (pickupOutlet?.storeCode) payload.storeCode = pickupOutlet.storeCode;

  return requestJson<{
    ok: boolean;
    order: { id: string; orderNo: string; displayOrderNo?: string; status: string; totalAmount: number; orderType: string; deliveryDetails?: DripTeaDeliveryDetails | null };
    payment: { id: string; status: string; method: string };
  }>('/api/checkout', { method: 'POST', body: JSON.stringify(payload) });
}

// ── Purchase history ──────────────────────────────────────────────────────────

// Fetches a customer's past orders. GET /api/purchase-history
export function getPurchaseHistory(userId: string) {
  return requestJson<{ ok: boolean; data: DripTeaPurchaseHistoryItem[] }>(
    `/api/purchase-history?userId=${encodeURIComponent(userId)}`
  );
}

// Updates a user's profile. PATCH /api/users/:id
export function updateUser(userId: string, payload: {
  profilePic?: string;
  fullName?: string;
  email?: string;
  addresses?: DripTeaUser['addresses'];
}) {
  return requestJson<{ ok: boolean; data: DripTeaUser }>(
    `/api/users/${encodeURIComponent(userId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) }
  );
}

// Receive Feedback
export async function submitFeedback(payload: {
  userId: string;
  orderId: string;
  menuItemId: string;
  menuItemCode?: string;
  drinkName: string;
  rating: number;
  comment?: string;
}) {
  return requestJson<{ ok: boolean; data: unknown }>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
