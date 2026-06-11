# Simple Mocha Test Documentation

This folder contains simple tests for the DripTea project.

The tests use:

- Mocha for `describe()` and `it()`
- Chai for `expect()` assertions
- Supertest for simple API request tests

Run all tests with:

```bash
npm test
```

Do not run the files with plain `node`, because `describe()` and `it()` are provided by Mocha.

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
| Login prompt | Chatbot service contains login prompt before cart action | Prevents cart add before login |

## 4. API Integration Testing

File: `apiIntegrationTesting.js`

These tests send simple HTTP requests through Express route files using Supertest.

| Test | What It Checks | Why |
| --- | --- | --- |
| `POST /api/menu-items` | Rejects negative price | Checks route and controller together |
| `PATCH /api/menu-items/:id/status` | Rejects invalid menu status | Checks route and controller together |
| `POST /api/auth/register` | Rejects short password | Checks route, controller, and service together |
| `POST /api/cart-items` | Rejects invalid customer id | Checks route, controller, and service together |
| `POST /api/chat` | Handles empty message | Checks chatbot route and controller together |

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
