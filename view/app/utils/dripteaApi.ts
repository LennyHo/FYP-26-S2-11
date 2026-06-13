// Frontend API bridge — all fetch calls to the Express backend go through this file.
// Covers all user stories that require HTTP requests:
// Auth: #11/#14/#22/#37/#191 | Users: #01-#10/#246 | Menu: #13/#21/#33-#36
// Cart: #15-#17/#199-#201 | Checkout/Orders: #18/#23/#28 | History: #19/#198 | Chatbot: #25-#32/#197/#202/#203
export type DripTeaUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  profilePic?: string; // URL or base64 string
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

// Parses a pipe-delimited cart line string back into a structured cart item object.
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

// Order type used by the store staff dashboard to display and manage the order queue.
export type DripTeaOrder = {
  id: string;
  orderNo: string;
  customer: string;
  status: string;
  orderType: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt?: string;
  updatedAt?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    lineTotal: number;
    image: string;
    customization: Record<string, unknown>;
  }>;
};

const API_BASES = [
  'http://localhost:5000',
  process.env.NEXT_PUBLIC_DRIPTEA_API_BASE,
  'https://driptea-trrn.onrender.com',
]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/$/, ''))
  .filter((value, index, values) => values.indexOf(value) === index);
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

export function getStoredUser() {
  if (typeof window === "undefined") return null;

  const raw =
    localStorage.getItem(USER_STORAGE_KEY) ||
    localStorage.getItem("dripteaUser") ||
    localStorage.getItem("driptea_user") ||
    localStorage.getItem("user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
export function storeUser(user: DripTeaUser, token?: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  window.dispatchEvent(new Event("authUpdated"));
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event('authUpdated'));
}

// Registers a new customer account. POST /api/auth/register → auth.routes.js → auth.service.js
export async function registerCustomer(payload: {
  fullName: string;
  email: string;
  password: string;
}) {
  const response = await requestJson<{ ok: boolean; user: DripTeaUser; token: string }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (response.ok && response.user) {
    storeUser(response.user, response.token);
  }

  return response;
}

// Logs in an existing user and stores the session. POST /api/auth/login → auth.routes.js → auth.service.js
export async function loginCustomer(payload: {
  email: string;
  password: string;
}) {
  const response = await requestJson<{ ok: boolean; user: DripTeaUser; token: string }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (response.ok && response.user) {
    storeUser(response.user, response.token);
  }

  return response;
}

// Adds a customised drink to the cart. POST /api/cart-items → cart.routes.js → cart.controller.js
export function addCartItem(payload: Record<string, unknown>) {
  return requestJson<DripTeaCartItemResponse>('/api/cart-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'DripTea add to cart');
}

// Fetches all cart items for a user. GET /api/cart-items?userId → cart.routes.js → cart.controller.js
export async function getCartItems(
  userId: string
): Promise<{
  ok: boolean;
  data: DripTeaCartItem[];
  itemCount?: number;
}> {
  return requestJson(
    `/api/cart-items?userId=${encodeURIComponent(userId)}`
  );
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

// Syncs the backend cart to localStorage so the cart page can read it offline. Uses getCartItems.
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

// Fetches a single cart item by ID. GET /api/cart-items/:id → cart.routes.js → cart.controller.js
export function getCartItem(cartItemId: string) {
  return requestJson<{
    ok: boolean;
    data: DripTeaCartItem;
  }>(`/api/cart-items/${encodeURIComponent(cartItemId)}`);
}

// Updates the quantity of a cart item. PATCH /api/cart-items/:id → cart.routes.js → cart.controller.js
export function updateCartItemQuantity(cartItemId: string, quantity: number) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem }>(
    `/api/cart-items/${encodeURIComponent(cartItemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }
  );
}

// Removes a cart item. DELETE /api/cart-items/:id → cart.routes.js → cart.controller.js
export function deleteCartItem(cartItemId: string) {
  return requestJson<{ ok: boolean; deletedId: string }>(`/api/cart-items/${encodeURIComponent(cartItemId)}`, {
    method: 'DELETE',
  });
}

// Updates customisation details (size, ice, sugar, toppings) on a cart item. PATCH /api/cart-items/:id → cart.routes.js → cart.controller.js
export function updateCartItem(cartItemId: string, payload: Record<string, unknown>) {
  return requestJson<{ ok: boolean; data: DripTeaCartItem }>(
    `/api/cart-items/${encodeURIComponent(cartItemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

// Submits the cart as an order and records a payment. POST /api/checkout → checkout.routes.js → checkout.controller.js
export function checkoutCart(userId: string, paymentMethod: string, voucherCode?: string) {
  const payload: Record<string, unknown> = { userId, paymentMethod };
  if (voucherCode) payload.voucherCode = voucherCode;

  return requestJson<{
    ok: boolean;
    order: { id: string; orderNo: string; displayOrderNo?: string; status: string; totalAmount: number; orderType: string };
    payment: { id: string; status: string; method: string };
  }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Fetches all orders filtered by status, used by the store staff dashboard. GET /api/orders → checkout.routes.js → order.controller.js
export function getOrders(status: string = 'all') {
  return requestJson<{ ok: boolean; data: DripTeaOrder[] }>(`/api/orders?status=${encodeURIComponent(status)}`);
}

// Fetches a single order by ID for the staff order detail view. GET /api/orders/:id → checkout.routes.js → order.controller.js
export function getOrder(orderId: string) {
  return requestJson<{ ok: boolean; data: DripTeaOrder }>(`/api/orders/${encodeURIComponent(orderId)}`);
}

// Updates an order status (e.g. pending → preparing → ready). PATCH /api/orders/:id/status → checkout.routes.js → order.controller.js
export function updateOrderStatus(orderId: string, status: string) {
  return requestJson<{ ok: boolean; data: { id: string; status: string } }>(`/api/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
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
  drinkInfo?: {
    ingredients: string[];
    diabeticAdvice: string;
    insulinImpact: string;
  };
  rating?: number;
};

// Fetches menu items, optionally filtered by status. Used by menu pages, chatbot, and admin panel. GET /api/menu-items → menu.routes.js → menu.controller.js → menu.service.js
export function getMenuItems(status: string = 'all') {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem[] }>(`/api/menu-items?status=${encodeURIComponent(status)}`);
}

// Searches menu items by keyword (name, category, description). GET /api/menu/search → menu.routes.js → menu.controller.js
export function searchBeverage(keyword: string) {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem[] }>(`/api/menu/search?q=${encodeURIComponent(keyword)}`);
}

// Toggles a menu item between active and inactive, used by the admin panel. PATCH /api/menu-items/:id/status → menu.routes.js → menu.controller.js
export function updateMenuItemStatus(id: string, status: string) {
  return requestJson<{ ok: boolean; data: { id: string; mongoId: string; status: string } }>(`/api/menu-items/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// Creates a new menu item, used by the admin panel. POST /api/menu-items → menu.routes.js → menu.controller.js
export function createMenuItem(payload: { name: string; category: string; price: number; description?: string; tags?: string[]; status?: string }) {
  return requestJson<{ ok: boolean; data: DripTeaMenuItem }>('/api/menu-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Fetches all users, optionally filtered by search keyword. Used by the admin user management panel. GET /api/users → user.routes.js → user.controller.js
export function getUsers(search: string = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return requestJson<{ ok: boolean; data: DripTeaUser[] }>(`/api/users${query}`);
}

// Checks if an email is registered before allowing a password reset. Uses getUsers internally.
export async function checkEmailExists(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await getUsers(normalizedEmail);
  const exists = response.data.some(user => user.email.trim().toLowerCase() === normalizedEmail);

  if (!exists) {
    throw new Error('No account was found for that email address.');
  }

  return { ok: true };
}

// Creates a new user account (any role), used by the admin panel. POST /api/users → user.routes.js → user.controller.js
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

// Updates a user's profile fields (name, email, role, status, profile picture). PATCH /api/users/:id → user.routes.js → user.controller.js
export function updateUser(userId: string, payload: Partial<Pick<DripTeaUser, 'fullName' | 'email' | 'role' | 'status' | 'profilePic'>>) {
  return requestJson<{ ok: boolean; data: DripTeaUser }>(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Suspends a user account, preventing login. PATCH /api/users/:id → user.routes.js → user.controller.js
export function suspendUser(userId: string) {
  return requestJson<{ ok: boolean; data: DripTeaUser }>(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'suspended' }),
  });
}

// Resets a user's password by email, used on the forgot password page. POST /api/auth/reset-password → auth.routes.js → auth.service.js
export function resetPassword(email: string, newPassword: string) {
  return requestJson<{ ok: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
  });
}

// Changes a logged-in user's password after verifying the current one. PATCH /api/auth/change-password → auth.routes.js → auth.service.js
export function changePassword(userId: string, currentPassword: string, newPassword: string) {
  return requestJson<{ ok: boolean; message: string }>('/api/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  });
}

// Purchase History API
export type DripTeaPurchaseHistoryItem = {
  id: string;
  orderNo: string;
  displayOrderNo?: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt?: string;
  items: Array<{
    id?: string;
    name: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    customization?: Record<string, unknown>;
  }>;
};

// Fetches a customer's past orders for the purchase history page. GET /api/purchase-history → purchaseHistory.routes.js → purchaseHistory.controller.js
export function getPurchaseHistory(userId: string) {
  return requestJson<{ ok: boolean; data: DripTeaPurchaseHistoryItem[] }>(
    `/api/purchase-history?userId=${encodeURIComponent(userId)}`
  );
}
