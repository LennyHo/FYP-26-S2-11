# DripTea Frontend Architecture Guide

This document explains how the current frontend is structured and where teammates should place backend API calls. It is written for the current Next.js frontend and Node.js/Express backend without requiring a risky code restructure.

## Summary

The frontend is not a strict MVC application in the traditional server-rendered sense. It is a Next.js App Router application, so the structure is closer to:

- **View**: pages and React components that render UI.
- **Controller / UI logic**: event handlers, page state, and component actions.
- **Service / API bridge**: helper files in `app/utils/` and Next route handlers in `app/api/`.
- **Model / data source**: backend Node.js routes and MongoDB collections.

For our diagrams, it is safe to describe the frontend as **MVC-inspired**:

```text
User
  -> View: Next.js pages and React components
  -> Controller: component/page event handlers
  -> Service/API Layer: frontend/app/utils/*Api.ts or frontend/app/api/*/route.ts
  -> Backend Controller/Routes: Node.js Express routes
  -> Model/Database: MongoDB collections
```

## Current Frontend Folder Structure

```text
frontend/
  app/
    layout.tsx                 # Root layout for the app
    page.tsx                   # Home page route: /
    globals.css                # Global CSS
    layout.module.css          # Root layout styling
    page.module.css            # Home page styling

    api/
      chat/
        route.ts               # Next.js server-side proxy route for chatbot requests

    components/
      ChatbotSidebar.tsx       # Avy chatbot UI and chat interactions
      ChatbotSidebar.module.css
      Header.tsx               # Main site header
      GlobalLayout.tsx         # Wraps pages and controls chatbot open/close
      Cart.tsx                 # Cart UI
      DrinkCustomize.tsx       # Drink customization UI
      ...                      # Other reusable UI/page sections

    utils/
      dripteaApi.ts            # Main frontend API bridge to Node.js backend
      chatHelpers.ts           # Chatbot formatting/conversation helper logic
      api.js                   # Older/generic API helper; avoid adding new code here unless needed

    login/
      page.js                  # Login page

    cart/
      page.tsx                 # Cart page

    checkout/
      page.tsx                 # Checkout page

    store-staff-dashboard/
      page.tsx                 # Staff order dashboard

    user-admin-dashboard/
      page.tsx                 # Admin dashboard

    menu/
      [category]/
        page.tsx               # Menu category route
        [drinkId]/
          page.tsx             # Drink detail/customization route
```

## Recommended MVC Mapping

Use this mapping in the architecture diagram:

| MVC Layer | Current Frontend Location | Responsibility |
| --- | --- | --- |
| View | `app/**/page.tsx`, `app/**/page.js`, `app/components/*.tsx` | Render UI, forms, buttons, chatbot, cart, dashboards |
| Controller | Event handlers inside pages/components, e.g. `handleLogin`, `sendMessage`, `handleCheckout` | React to user actions, validate simple UI state, call API helper functions |
| Service / API Bridge | `app/utils/dripteaApi.ts`, `app/api/chat/route.ts` | Central place for backend calls and request/response formatting |
| Model | Backend MongoDB collections via `src/routes/driptea.routes.js` | Persistent data: users, menu items, cart items, orders, payments |

Important: React components should not become the main place for backend URLs and `fetch()` logic. Components should call named helper functions from `app/utils/`.

## Where API Calls Should Go

### Preferred Rule

Put new frontend-to-backend calls in:

```text
frontend/app/utils/dripteaApi.ts
```

Then import those functions into pages/components.

Example:

```ts
// app/utils/dripteaApi.ts
export function getMenuItems() {
  return requestJson<{ ok: boolean; data: MenuItem[] }>('/api/menu-items');
}
```

```tsx
// app/components/MenuCategory.tsx or app/menu/[category]/page.tsx
import { getMenuItems } from '../utils/dripteaApi';
```

This keeps the component as the View/Controller and keeps API communication in the Service layer.

### When To Use `app/api/*/route.ts`

Use a Next.js API route when the frontend should not directly call the backend from the browser.

Good examples:

- The request needs a server-only environment variable.
- The frontend needs a proxy to avoid exposing backend details.
- The route combines backend data with another server-side source.
- The request needs server-side filtering or security checks.

Current example:

```text
frontend/app/api/chat/route.ts
```

This route receives chatbot messages from the browser, calls the Node.js backend `/chat`, and can enrich chatbot sources server-side.

## Existing API Flow

### Cart / Checkout / Orders

Current frontend bridge:

```text
frontend/app/utils/dripteaApi.ts
```

Current functions:

- `addCartItem(payload)`
- `getCartItems(userId)`
- `deleteCartItem(cartItemId)`
- `checkoutCart(userId, paymentMethod)`
- `getOrders(status)`
- `updateOrderStatus(orderId, status)`
- `getStoredUser()`
- `clearStoredUser()`

These functions call the Node.js backend using:

```ts
const API_BASE = (process.env.NEXT_PUBLIC_DRIPTEA_API_BASE || 'https://fyp-26-s2-11.onrender.com').replace(/\/$/, '');
```

For local backend development, use this environment variable:

```text
NEXT_PUBLIC_DRIPTEA_API_BASE=http://localhost:5000
```

Then the frontend calls:

```text
http://localhost:5000/api/cart-items
http://localhost:5000/api/checkout
http://localhost:5000/api/orders
```

### Chatbot

Current browser flow:

```text
ChatbotSidebar.tsx
  -> POST /api/chat
  -> frontend/app/api/chat/route.ts
  -> Node.js backend /chat
```

This is the best pattern for chatbot requests because `app/api/chat/route.ts` acts as a server-side proxy.

## Backend Routes Used By The Frontend

The Node.js backend is mounted in `server.js`:

```js
app.use("/api", dripTeaRoutes);
app.post("/chat", ...);
```

The main backend route file is:

```text
src/routes/driptea.routes.js
```

Current backend endpoints include:

| Backend Endpoint | Purpose | Frontend Caller |
| --- | --- | --- |
| `POST /api/auth/login` | User login | Currently inside `app/login/page.js` |
| `POST /api/auth/register` | User registration | Registration page or future auth helper |
| `GET /api/menu-items` | Read menu items from MongoDB | Should be added to `dripteaApi.ts` when needed |
| `GET /api/cart-items?userId=...` | Read user cart | `getCartItems()` |
| `POST /api/cart-items` | Add item to cart | `addCartItem()` |
| `DELETE /api/cart-items/:id` | Remove cart item | `deleteCartItem()` |
| `POST /api/checkout` | Convert cart into order/payment | `checkoutCart()` |
| `GET /api/orders?status=...` | Staff order queue | `getOrders()` |
| `PATCH /api/orders/:id/status` | Update order status | `updateOrderStatus()` |
| `POST /chat` | AI chatbot backend | `app/api/chat/route.ts` proxy |

## Recommended API Organization Going Forward

For new work, use this pattern:

```text
frontend/app/components/SomeComponent.tsx
  imports a function from
frontend/app/utils/dripteaApi.ts
  which calls
Node.js backend route
```

Do this:

```tsx
import { loginUser } from '../utils/dripteaApi';

const payload = await loginUser(email, password);
```

Avoid this in new components:

```tsx
fetch('http://localhost:5000/api/auth/login', ...)
```

The reason is simple: if the backend URL changes, only `dripteaApi.ts` should need editing.

## Suggested Future Cleanup, Not Required Now

Do not restructure everything immediately unless the team has time to test thoroughly. A safer plan is:

1. Keep current pages/components working.
2. Add new API functions to `app/utils/dripteaApi.ts`.
3. Gradually move direct `fetch()` calls out of components into `dripteaApi.ts`.
4. Keep `app/api/chat/route.ts` as the chatbot proxy.
5. On the backend, later split `src/routes/driptea.routes.js` into clearer MVC-style files:

```text
src/
  routes/
    auth.routes.js
    cart.routes.js
    order.routes.js
  controllers/
    auth.controller.js
    cart.controller.js
    order.controller.js
  services/
    auth.service.js
    cart.service.js
    order.service.js
  models/
    user.model.js
    order.model.js
```

This backend cleanup is optional for now. The frontend can already be documented as MVC-inspired if the API bridge layer is used consistently.

## Example Diagram Text

You can use this text in your report or diagram:

```text
The DripTea frontend follows an MVC-inspired structure. Next.js pages and React components act as the View layer. Component event handlers act as lightweight Controllers by responding to user actions. Shared API helper files in app/utils act as the Service/API layer, centralizing communication with the Node.js backend. The backend exposes Express routes that interact with MongoDB collections, which represent the Model layer.
```

## Team Rule Of Thumb

When adding a new backend connection, ask:

1. Is this UI rendering? Put it in `app/components/` or a route `page.tsx`.
2. Is this user interaction/state? Keep it in the component/page as an event handler.
3. Is this an HTTP request to Node.js? Put it in `app/utils/dripteaApi.ts`.
4. Does the browser need a server-side proxy? Put it in `app/api/<feature>/route.ts`.
5. Is this database logic? It belongs in the Node.js backend, not the frontend.

