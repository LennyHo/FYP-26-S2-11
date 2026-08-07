# Simple Mocha Test Documentation

This folder contains simple tests for the DripTea project.

The tests use:

- Mocha for `describe()` and `it()`
- Chai for `expect()` assertions
- Supertest for simple API request tests
- `mongodb-memory-server` for `successPathTesting.js` only (see section 7) — a real, temporary, in-memory MongoDB, not the live Atlas database

Run all tests with:

```bash
npm test
```

Do not run the files with plain `node`, because `describe()` and `it()` are provided by Mocha.

`dbSetup.js` isn't a test file — it starts the in-memory MongoDB once before the whole suite and shuts it down after. It has to run before every other file, which is why it's listed first in the `test` script in `package.json`.

## 1. GUI Testing

File: `guiTesting.js`

These tests check that important frontend UI code exists.

| Test | What It Checks | Why |
| --- | --- | --- |
| Cart heading | `Your Shopping Cart` exists in the cart component | Customer can identify the cart page |
| Checkout button | `Proceed to checkout` and `/checkout` route exist | Customer can move from cart to checkout |
| Header cart button | Header contains `Cart` and routes to `/cart` | Customer can open cart from navigation |
| Login form | Email, password, and sign in UI exist | Customer can log in |
| Avy button | `Open Avy chat assistant` accessibility label exists | Chatbot button is available and labelled |

## 2. Functional Testing

File: `functionalTesting.js`

These tests check simple backend behaviour rules.

| Test | What It Checks | Why |
| --- | --- | --- |
| Negative price | Menu item price below `0` is rejected | Prevents invalid drink price |
| Invalid menu status | Menu status must be `active` or `inactive` | Prevents invalid menu state |
| Short register password | Password shorter than 6 characters is rejected | Protects account creation rule |
| Invalid cart customer id | Add-to-cart rejects invalid customer id | Prevents invalid cart operation |
| Invalid order status | Order status must be from the allowed list | Prevents invalid staff order state |

## 3. Chatbot Testing

File: `chatbotTesting.js`

These tests check simple chatbot behaviour without calling the real AI service.

| Test | What It Checks | Why |
| --- | --- | --- |
| Empty message | Chatbot replies `Please send a message.` | Handles blank user input safely |
| Controller success | Controller returns chatbot service output | Confirms controller sends normal chatbot response |
| Controller failure | Controller returns fallback message on error | Confirms chatbot has error handling |
| Chat route | Route file has `POST /chat` | Confirms chatbot API route exists |

## 4. API Integration Testing

File: `apiIntegrationTesting.js`

These tests send real HTTP requests into the actual Express route files using Supertest — every one of the project's **47 API endpoints** has at least one test. Endpoints with a fast input-validation failure (missing field, bad id, invalid enum value) are tested on that failure path, which runs before any database call. Endpoints with no such failure path (plain listings like `GET /api/stores`) have their Mongoose model method stubbed with a small fake "chainable query" (supports `.find().sort().lean()` etc.) so the real route and controller still run, just against fake data — none of these tests need a live MongoDB connection or the real AI service.

| Route file | Endpoints covered | Example checks |
| --- | --- | --- |
| `chatbot.routes.js` | `POST /chat` (2 scenarios) | Empty message; guest asking about order status is told to log in (exercises this session's intent-routing fix) |
| `auth.routes.js` | `GET /auth/test`, `POST /auth/register`, `POST /auth/login`, `POST /auth/reset-password`, `PATCH /auth/change-password` | Register rejects short password; login rejects a disallowed email domain; reset/change-password reject weak or missing passwords |
| `cart.routes.js` | `POST/GET /cart-items`, `GET/PATCH/DELETE /cart-items/:id`, `GET /vouchers`, `POST /cart/apply-voucher`, `GET /vouchers/used` | Invalid customer/cart-item ids rejected; missing voucher code rejected; voucher list returns via a stubbed query |
| `checkout.routes.js` | `POST /checkout`, `GET /orders`, `POST /orders/test-queue`, `GET /orders/:id`, `GET /orders/:id/queue`, `GET /orders/:id/status-card`, `PATCH /orders/:id/status` | Missing userId/store rejected; invalid order id/status rejected; staff-only `GET /orders` rejects an unauthenticated request; the live status-card widget endpoint rejects a missing userId |
| `inventory.routes.js` | All 5 endpoints (store-staff-only) | Every endpoint rejects a request with no auth token |
| `menu.routes.js` | All 6 endpoints | Negative price, missing name, and invalid status all rejected; listing/search return via stubbed queries |
| `feedback.routes.js` | `POST /feedback`, `GET /feedback/orders`, `GET /feedback/rating/:menuItemId` | Missing order/menu item rejected; empty `ids` list returns `{}` without a DB call; malformed id rejected |
| `store.routes.js` | `GET /stores`, `GET /stores/crowd` | Both return via a stubbed store list |
| `user.routes.js` | `GET/POST /users`, `PATCH /users/:id`, `GET/POST /profiles`, `PATCH /profiles/:value` | Admin-only writes reject an unauthenticated request; malformed user id rejected; listings return via stubbed queries |
| `voucher.routes.js` | `POST/GET /staff/vouchers`, `DELETE /staff/vouchers/:id` | Missing code/title and invalid id rejected; listing returns via a stubbed query |
| `purchaseHistory.routes.js` | `GET /purchase-history` | Missing userId rejected |
| `transcribe.routes.js` | `POST /transcribe` | Missing audio file rejected |

## 5. Database Testing

File: `databaseTesting.js`

These tests check Mongoose model rules without connecting to MongoDB.

| Test | What It Checks | Why |
| --- | --- | --- |
| User collection | User model uses `users` collection | Confirms model maps to correct collection |
| Email cleanup | User email is trimmed and lowercased | Confirms account data is cleaned |
| Menu price required | Menu item requires `price` | Prevents incomplete drink records |
| Cart user id required | Cart item requires `userId` | Prevents cart item without owner |
| Payment status | Payment status must use allowed values | Prevents invalid payment state |

## 6. Order Status Testing

File: `orderStatusTesting.js`

These tests check how the chatbot classifies order-related messages (live status vs. purchase history vs. general delivery FAQ) and the delivery status card's step count. They call the real exported functions directly and do not connect to MongoDB or call the real AI.

| Test | What It Checks | Why |
| --- | --- | --- |
| Direct status phrasing | `isTrackOrderRequest` recognizes "order status", "where is my order/delivery" | Customer's plain tracking question reaches the status card |
| Colloquial "drink" phrasing | `isTrackOrderRequest` recognizes "wheres my drink" | Casual phrasing still gets tracked |
| Typo tolerance | `isTrackOrderRequest` recognizes "wheres my oder", "delivery satus" | Common typos don't fall through to a dead end |
| Status not mistaken for history | `isPurchaseHistory` returns false for "what is my order status" | Live tracking card shows instead of the order list |
| Genuine history still works | `isPurchaseHistory` returns true for "what did I order last time" | History questions aren't broken by the fix above |
| FAQ handler doesn't intercept tracking | `isDeliveryOrPaymentQuestion` returns false for "where is my delivery" | Personal tracking questions aren't swallowed by the general delivery FAQ |
| General FAQ still works | `isDeliveryOrPaymentQuestion` returns true for "do you deliver to Tampines" | Delivery-service FAQ questions aren't broken by the fix above |
| Typo normalization | `normalizeForOrderIntent` corrects "oder"/"satus" | Confirms the normalization helper itself is correct |
| 4th delivery step exists | `chatbot.service.js` defines `orderStatusStepDelivery4` | Delivery card matches the tracking page's 4 stages |
| Dynamic step rendering | `OrderStatusCard.tsx` has no hardcoded 3-step layout | Card supports both pickup (3 steps) and delivery (4 steps) |
| No fabricated order details | `prompt.service.js` instructs the AI not to invent order data | Prevents the AI from hallucinating a fake order status |

## 7. Success Path & Role-Boundary Testing

File: `successPathTesting.js` (needs `dbSetup.js`'s in-memory MongoDB — see above)

Every other file above only tests the *failure* path of an endpoint (bad input, missing auth). These tests run the real *success* path end-to-end against a real (temporary, in-memory) database — a real payment going through, a real order being found — plus the role-permission boundaries a real auth token is supposed to enforce.

| Test | What It Checks | Why |
| --- | --- | --- |
| Register then login | A newly registered account can log in with the same password and gets a session token back | The two most basic account flows actually work together, not just in isolation |
| Add to cart, read it back | A real menu item added to a real cart shows up with the correct quantity and price | Cart math (unit price × quantity) is correct, not just "didn't error" |
| Full pickup checkout | Checkout creates a real order, and `GET /orders/:id` returns it with the correct items and status | Confirms the entire buy flow — cart, order, order items — writes and reads back consistently |
| Chatbot tracks a real order | After a real checkout, asking the chatbot for order status returns the live status card for that exact order | End-to-end proof the intent-routing fix (this session's main work) reaches real data, not just stubs |
| Chatbot status advances without the tracking page | Backdating a real order's `updatedAt` (simulating time passing with the tracking page never opened) makes the chatbot report the correct later phase | Order status is driven by real elapsed time, not by whether a particular browser tab happened to be open |
| Status-card widget serves the order's own customer | `GET /orders/:id/status-card` returns the current card, addressed to the right order | This is the endpoint the chatbot's card polls in the background to refresh itself |
| Status-card widget advances with time, no new message | Backdating `updatedAt` then polling again returns a later phase, with zero new chat messages sent | Proves the widget is genuinely live — not just re-showing what was true when first asked |
| Status-card widget is scoped per customer | A different customer's userId gets 404 on someone else's order id | An order id alone (visible in the browser's network tab) can't be used to poll a stranger's order |
| Status-card widget goes quiet once inactive | Once an order is `completed`, the endpoint returns `data: null` | Tells the frontend widget when to stop polling |
| Staff sees their own store's inventory | A store A staff token can read a store A inventory item | Legitimate access still works once real auth is enforced |
| Staff can't see another store's inventory | A store B staff token gets 404 on a store A inventory item | Store-scoping (`storeId` check in the controller) actually isolates data between stores |
| Customer token rejected from staff endpoint | A real, valid customer session token still gets 403 on `GET /inventory` | Role checking, not just "is logged in," is enforced on staff-only routes |
