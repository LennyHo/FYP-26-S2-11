# FYP-26-S2-11 — DripTea AI Chatbot

An AI-powered ordering chatbot for DripTea, a bubble tea shop. Customers can chat with **Avy**, get personalised drink recommendations, and place orders through a Next.js storefront backed by a Node.js/Express API and MongoDB.
---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Live Deployments](#live-deployments)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Environment Variables](#environment-variables)
6. [Database Setup (MongoDB)](#database-setup-mongodb)
7. [Backend Setup](#backend-setup)
8. [Frontend Setup](#frontend-setup)
9. [Testing Connections](#testing-connections)
10. [Creating Accounts](#creating-accounts)
11. [Essential API Endpoints](#essential-api-endpoints)
12. [Frontend Pages & Features](#frontend-pages--features)
13. [Chatbot Test Prompts](#chatbot-test-prompts)
14. [Maps & Geocoding (OneMap + Leaflet)](#maps--geocoding-onemap--leaflet)
15. [Running Automated Tests](#running-automated-tests)

---

## Tech Stack

| Layer        | Technology                                          |
|--------------|-----------------------------------------------------|
| Frontend     | React 19, Next.js 16, TypeScript                    |
| Backend      | Node.js, Express.js 5                               |
| Database     | MongoDB (via Mongoose)                              |
| AI — Text    | Gemini 2.5 Flash (primary) → Groq Llama (fallback)  |
| AI — Image   | Gemini 2.5 Flash                                    |
| AI — STT     | ElevenLabs Scribe v1 (multilingual speech-to-text)  |
| AI — TTS     | ElevenLabs eleven_multilingual_v2 (bot voice)       |
| Maps         | Leaflet + react-leaflet (store locator & order-tracking maps) |
| Geocoding    | OneMap API (Singapore address search/autocomplete)  |
| HTTP         | Axios                                               |
| Multi-language | Gemini-based translation in the chatbot service (not a frontend i18n library) |

---

## Live Deployments

The app is split across two hosts — the Next.js frontend on Vercel, the Express backend on Render:

| Layer    | Host   | URL                                                                  |
|----------|--------|----------------------------------------------------------------------|
| Frontend | Vercel | [https://driptea-ruby.vercel.app/](https://driptea-ruby.vercel.app/) |
| Backend  | Render | `https://driptea-trrn.onrender.com`                                  |

The Render URL is the hard-coded fallback the frontend uses when `DRIPTEA_API_BASE` / `NEXT_PUBLIC_DRIPTEA_API_BASE` are unset (see `view/app/utils/api.base.ts`), so the deployed frontend reaches the deployed backend without extra config.

### Render Account Login

| Field    | Value                  |
|----------|------------------------|
| Email    | avisfyp01@gmail.com    |
| Password | FYP-2026-S2-11;)       |

Log in at [render.com/login](https://render.com/login) to manage deployments, environment variables, and build logs.

---

## Prerequisites

Make sure all of the following are installed and working on your machine **before** you start:

- **Node.js** v18 or later — `node -v`
- **npm** v9 or later — `npm -v`
- **MongoDB Atlas account** (or a local MongoDB instance)
- A **Groq API key** — [console.groq.com/keys](https://console.groq.com/keys) → sign in → click **+ Create API Key**
- A **Gemini API key** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- An **ElevenLabs API key** — [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys) (used for both STT transcription and TTS bot voice)
- An **ElevenLabs Voice ID** — [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library) → pick a voice → copy its ID
- A **OneMap account** — [onemap.gov.sg/apidocs/register](https://www.onemap.gov.sg/apidocs/register) (used for address search/autocomplete on the checkout delivery step)

---

## Project Structure

This project follows the **MVC (Model-View-Controller)** architectural pattern:

- **Model** — `src/models/` contains Mongoose schemas that define the data layer (users, menu items, orders, etc.)
- **View** — `view/` is the Next.js frontend that renders the UI and interacts with the user
- **Controller** — `src/controllers/` holds Express handler functions that contain business logic; `src/routes/` wires HTTP endpoints to those controllers; `src/services/` and `src/utils/` support them with chatbot/prompt logic and shared helpers

```
FYP-26-S2-11/
├── view/                  ← (V) Next.js app — View layer (port 3000)
│   ├── app/               ← Next.js App Router pages & components
│   │   ├── api/           ← Next.js API routes
│   │   │   ├── chat/      ← Proxy route — forwards chat requests to Express backend + enriches sources
│   │   │   ├── onemap/search/ ← Proxy route — authenticates & queries OneMap address search
│   │   │   └── tts/       ← ElevenLabs text-to-speech route (bot voice)
│   │   ├── components/    ← Shared UI components (chatbot/, layout/, menu/, pages/, ui/)
│   │   ├── [route]/       ← One folder per page (home, login, cart, checkout, menu/[category], order-status/[orderId], etc. — see Frontend Pages & Features)
│   │   └── utils/         ← Frontend utility functions (API clients, validation, chat helpers)
│   ├── public/            ← Static assets (img/, marketing/)
│   ├── .env.local         ← Frontend env file (create this yourself — see Environment Variables)
│   └── package.json
├── src/
│   ├── ai/                ← AI client — Gemini key rotation + Groq fallback
│   ├── config/            ← mongo.js (DB connection)
│   ├── controllers/       ← (C) Business logic — Controller layer
│   ├── middleware/        ← Express middleware (auth.middleware.js)
│   ├── models/            ← (M) Mongoose models — Model layer
│   ├── routes/            ← Express route files
│   ├── services/          ← Chatbot/prompt business logic (chatbot.service.js, prompt.service.js)
│   └── utils/             ← Backend utility functions (intent parsing, validation, order progress)
├── .env                   ← Backend env file (create this yourself — see Environment Variables)
├── server.js              ← Backend entry point (port 5000)
└── package.json
```

> **Note:** `data/menu.json` and `data/nutriCalculator.js` have been removed. All menu data is now served exclusively from MongoDB via the `/api/menu-items` endpoint.

---

## Environment Variables

### Backend — project root `.env`

Create a `.env` file in the **project root** (same folder as `server.js`) and fill in your real keys:

```env
# ── AI Keys ──────────────────────────────────────────────
GROQ_API_KEY=your_groq_api_key_here

# Supports multiple Gemini keys separated by commas (rotated on failure)
GEMINI_API_KEY=your_gemini_key_1,your_gemini_key_2

# ElevenLabs — used by POST /api/transcribe (speech-to-text via Scribe)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# ── MongoDB ───────────────────────────────────────────────
MONGODB_URI=mongodb+srv://avisfyp01_db_user:zefhyp1jucca8@driptea-vs1.tt7qbar.mongodb.net/?retryWrites=true&w=majority&appName=driptea-vs1
MONGODB_DB_NAME=driptea_vs1

# ── Optional ──────────────────────────────────────────────
PORT=5000
NODE_ENV=development
CHAT_LANGUAGE_MODE=match     # default — reply in the customer's language; set to "english" to always reply in English
```

> **Never commit real keys.** Add `.env` to your `.gitignore`.

### Frontend — `view/.env.local`

Create a `.env.local` file inside the `view/` folder:

```env
# Server-side only — used by the Next.js /api/chat proxy route to reach the Express backend
DRIPTEA_API_BASE=http://localhost:5000

# Exposed to the browser (NEXT_PUBLIC_ prefix) — used by client components that call the
# backend directly (e.g. chatbotApi.ts, useSpeech.ts). Leave unset for local dev; the
# frontend falls back to http://localhost:5000 automatically when NODE_ENV=development.
NEXT_PUBLIC_DRIPTEA_API_BASE=http://localhost:5000

# ElevenLabs — used by the Next.js /api/tts route (text-to-speech bot voice)
# These are server-side only (no NEXT_PUBLIC_ prefix) — never exposed to the browser
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id_here

# OneMap — used by the Next.js /api/onemap/search route (address search on the checkout delivery step)
ONEMAP_EMAIL=your_onemap_account_email
ONEMAP_PASSWORD=your_onemap_account_password
```

> - `DRIPTEA_API_BASE` / `NEXT_PUBLIC_DRIPTEA_API_BASE` tell the frontend where the backend is running. Set both to your deployed backend URL in production.
> - `ELEVENLABS_VOICE_ID` sets which voice Avy uses when speaking replies. Find voice IDs at [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library).
> - `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` authenticate against the OneMap API to fetch a search token — register a free account at [onemap.gov.sg/apidocs/register](https://www.onemap.gov.sg/apidocs/register). A saved delivery address caches its `lat`/`lng` on the user document the first time it's geocoded, so re-selecting an already-saved address never calls OneMap again — these credentials are only exercised when searching for a **new** address or geocoding a saved address that predates the coordinate cache.

---

## Database Setup (MongoDB)

### 1. Project MongoDB cluster (shared)

The project already has a shared MongoDB Atlas cluster. Use the credentials below — no need to create your own cluster.

| Field         | Value                                      |
|---------------|--------------------------------------------|
| Host          | DripTea_V1                                 |
| Database name | driptea_vs1                                |
| Username      | avisfyp01_db_user                          |
| Password      | zefhyp1jucca8                              |

Copy these two lines into your root `.env` file exactly as shown:

```env
MONGODB_URI=mongodb+srv://avisfyp01_db_user:zefhyp1jucca8@driptea-vs1.tt7qbar.mongodb.net/?retryWrites=true&w=majority&appName=driptea-vs1
MONGODB_DB_NAME=driptea_vs1
```

> **Network Access:** If you get a connection timeout, go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Network Access** → add your current IP address (or `0.0.0.0/0` to allow all IPs for development).

### 2. Verify the connection

`connectMongo()` (`src/config/mongo.js`) runs automatically on startup and connects using `MONGODB_URI`/`MONGODB_DB_NAME`. If it succeeds you'll see this in the backend terminal:

```
Connected to MongoDB database "driptea_vs1"
```

If it fails, the server logs the error and exits — check `MONGODB_URI` in your `.env` and that your IP is whitelisted in Atlas. There is no separate `/api/health/mongo` endpoint; `GET /api/health` only confirms the Express server itself is up.

### 3. Collections & data

Collections (`users`, `menu_items`, `cart_items`, `orders`, `order_items`, `payments`, `chatbot_sessions`, `vouchers`, `feedback`, `inventory`, `stores`) are created automatically by Mongoose the first time each model writes to them — there is no seed/setup endpoint. The shared Atlas cluster (see above) already has menu items, stores, and vouchers populated; a fresh local database starts empty and you'll need to add menu items via the store-staff dashboard (`/store-staff`) and create your own accounts (see [Creating Accounts](#creating-accounts) below).

---

## Backend Setup

The backend lives at the **project root** (not inside `frontend/`).

```bash
# 1. Navigate to the project root
cd FYP-26-S2-11

# 2. Install dependencies (first time or after pulling new changes)
npm install

# 3. Start the backend
npm run dev
```

The server starts on **port 5000**.
You should see in the terminal:

```
DripTea backend running on http://localhost:5000
Connected to MongoDB database "driptea_vs1"
```

---

## Frontend Setup

The frontend (View layer) is inside the `view/` subfolder.

```bash
# 1. Navigate to the view folder
cd FYP-26-S2-11/view

# 2. Install dependencies (first time or after pulling new changes)
npm install

# 3. Start the dev server
npm run dev
```

The app starts on **port 3000**.
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other frontend commands

| Command         | Purpose                          |
|-----------------|----------------------------------|
| `npm run dev`   | Start dev server (hot-reload)    |
| `npm run build` | Create production build          |
| `npm start`     | Serve the production build       |

---

## Testing Connections

Run these checks in order before developing.

### 1. Backend is alive

```
GET http://localhost:5000/api/health
```

```json
{ "ok": true, "service": "DripTea backend" }
```

### 2. MongoDB is connected

Check the backend terminal output when it starts — MongoDB connects during startup, not via a health endpoint:

```
Connected to MongoDB database "driptea_vs1"
```

If instead you see a connection error and the process exits, check `MONGODB_URI` in your `.env` and ensure your IP is whitelisted in Atlas.

### 3. AI (Gemini / Groq) is working

```
POST http://localhost:5000/api/chat
Content-Type: application/json

{ "message": "Hello" }
```

Expected: a JSON reply with a `reply` field containing Avy's greeting.  
If Gemini fails, the backend automatically falls back to Groq.

### 4. Frontend reaches the backend

Open [http://localhost:3000](http://localhost:3000), open the AI chatbot widget, and type **"Hello"**. Avy should respond in the chat window.

---

## Creating Accounts

There is no auto-seeded admin/staff account — `POST /api/auth/register` (used by `/register`) always creates a **customer** account, ignoring any `role` field sent by the client.

- **Customer** — self-register at [`/register`](http://localhost:3000/register), or use an existing customer account on the shared Atlas cluster.
- **Store Staff / User Admin** — these roles can only be created by an existing User Admin, via `POST /api/users` (used by the `/user-admin-dashboard` user-management screen). To bootstrap the very first admin on a fresh database, insert a user document directly into the `users` collection (e.g. via MongoDB Atlas UI or `mongosh`) with `role: "user_admin"` — see `userSchema.statics.createUserAccount` in `src/models/user.model.js` for the exact fields (password defaults to `Password@123` if none is supplied, and is hashed on write).
- All three roles log in from the same page — [`/login`](http://localhost:3000/login) — which redirects to `/home`, `/store-staff`, or `/user-admin-dashboard` based on the account's `role`.

---

## Essential API Endpoints

All backend routes (including the chatbot) are prefixed with `/api`. This is not the full list — see `test_cases/README.md` for all 47 endpoints across every route file.

### Where these are called from

Every backend call from the frontend goes through `view/app/utils/api.base.ts`'s `requestJson()` — the single fetch helper every API client function below is built on. It reads `DRIPTEA_API_BASE` / `NEXT_PUBLIC_DRIPTEA_API_BASE` (falling back to the deployed Render URL if unset), and retries the next backend URL on 5xx/network failure but throws immediately on 4xx.

| Client file | Used by | Calls (see tables below) |
|-------------|---------|----------------------------|
| `customerApi.ts` | Customer-facing pages — login/register, menu, cart, checkout, vouchers, profile, purchase history, feedback | Auth, Menu, Cart & Vouchers, Checkout & Orders, Purchase History/Feedback/Stores, `PATCH /api/users/:id` (self) |
| `staffApi.ts` | `/store-staff`, `/store-staff-dashboard`, `/store-staff-voucher` | Orders (staff), Menu (write), Inventory, Vouchers (staff) |
| `adminApi.ts` | `/user-admin-dashboard` | Users, Role descriptions |
| `chatbotApi.ts` | Chatbot widget (`components/chatbot/`) | `POST /api/chat` (text/image) via the Next.js `/api/chat` proxy |

Three Next.js API routes (`view/app/api/`) sit in front of the Express backend or third-party APIs:

| Route (Next.js, port 3000) | Talks to | Purpose |
|------|----------|---------|
| `api/chat/route.ts` | Express `POST /api/chat` (port 5000) | Proxies the chat request, then enriches the reply with source links before returning it to the browser |
| `api/tts/route.ts` | ElevenLabs directly | Bot voice (text-to-speech) — does **not** touch the Express backend |
| `api/onemap/search/route.ts` | OneMap directly | Address search/autocomplete on checkout — does **not** touch the Express backend |

The last two exist purely to keep the ElevenLabs and OneMap API keys server-side, out of the browser bundle.

### Health

| Method | Endpoint              | Description                         |
|--------|-----------------------|-------------------------------------|
| GET    | `/api/health`         | Backend alive check                 |

### Auth

| Method | Endpoint                     | Body fields                      | Notes |
|--------|------------------------------|-----------------------------------|-------|
| GET    | `/api/auth/test`             | —                                 | Route sanity check |
| POST   | `/api/auth/register`         | `fullName`, `email`, `password`   | Always creates a **customer** account |
| POST   | `/api/auth/login`            | `email`, `password`               | Works for all roles |
| POST   | `/api/auth/reset-password`   | `email`, new password fields      | |
| PATCH  | `/api/auth/change-password`  | current + new password fields     | Authenticated user |

### Menu

| Method | Endpoint                          | Description                                | Notes |
|--------|------------------------------------|---------------------------------------------|-------|
| GET    | `/api/menu-items`                  | List active menu items                      | |
| GET    | `/api/menu-items?status=all`       | List all items including inactive           | |
| GET    | `/api/menu/search`                 | Search menu items by name                   | |
| POST   | `/api/menu-items`                  | Create a menu item                          | Store staff (`/store-staff`) |
| PATCH  | `/api/menu-items/:id`              | Update a menu item                          | Store staff |
| PATCH  | `/api/menu-items/:id/status`       | Toggle item active / inactive                | Store staff |
| PATCH  | `/api/menu-items/:id/new-arrival`  | Toggle "new arrival" flag                    | Store staff |

### Cart & Vouchers

| Method | Endpoint                    | Description                        |
|--------|------------------------------|-------------------------------------|
| GET    | `/api/cart-items`            | Get cart (`?userId=<id>`)          |
| GET    | `/api/cart-items/:id`        | Get a single cart item             |
| POST   | `/api/cart-items`             | Add item to cart                   |
| PATCH  | `/api/cart-items/:id`         | Update a cart item                 |
| DELETE | `/api/cart-items/:id`         | Remove item from cart              |
| GET    | `/api/vouchers`               | Active vouchers (customer)         |
| GET    | `/api/vouchers/used`          | Used vouchers for a customer       |
| POST   | `/api/cart/apply-voucher`     | Apply a voucher code to the cart   |
| POST   | `/api/staff/vouchers`         | Create a voucher (store staff)     |
| GET    | `/api/staff/vouchers`         | List all vouchers (store staff)    |
| DELETE | `/api/staff/vouchers/:id`     | Delete a voucher (store staff)     |

### Checkout & Orders

| Method | Endpoint                        | Description                                   | Notes |
|--------|-----------------------------------|-------------------------------------------------|-------|
| POST   | `/api/checkout`                  | Place order & payment                          | |
| GET    | `/api/orders`                    | List orders                                     | Requires auth + `store_staff` role |
| GET    | `/api/orders/:id`                | Get one order                                   | |
| GET    | `/api/orders/:id/queue`          | Order's position in the prep queue              | |
| GET    | `/api/orders/:id/status-card`    | Live tracking-card data (polled by the chatbot) | |
| PATCH  | `/api/orders/:id/status`         | Update order status                             | Store staff |
| POST   | `/api/orders/test-queue`         | Seed test orders into the queue                 | Dev/testing helper |

### Purchase History, Feedback & Stores

| Method | Endpoint                            | Description                          |
|--------|--------------------------------------|----------------------------------------|
| GET    | `/api/purchase-history`              | Customer's past orders (`?userId=`)   |
| POST   | `/api/feedback`                      | Submit feedback for an order          |
| GET    | `/api/feedback/orders`               | Feedback for a set of orders          |
| GET    | `/api/feedback/rating/:menuItemId`   | Average rating for a menu item        |
| GET    | `/api/stores`                        | List store outlets                    |
| GET    | `/api/stores/crowd`                  | Store crowd-level stats               |

### Inventory (Store Staff only — `requireAuth` + `store_staff` role)

| Method | Endpoint                | Description             |
|--------|--------------------------|--------------------------|
| GET    | `/api/inventory`         | List inventory items    |
| GET    | `/api/inventory/:id`     | Get one inventory item  |
| POST   | `/api/inventory`         | Create inventory item   |
| PATCH  | `/api/inventory/:id`     | Update quantity         |
| DELETE | `/api/inventory/:id`     | Delete inventory item   |

### Users (User Admin)

| Method | Endpoint                        | Description                       | Notes |
|--------|-----------------------------------|--------------------------------------|-------|
| GET    | `/api/users`                     | List users                          | |
| POST   | `/api/users`                     | Create a user account (any role)    | Requires auth + `user_admin` role |
| PATCH  | `/api/users/:id`                 | Update / suspend a user             | |
| GET    | `/api/role-descriptions`         | Get role description text           | |
| PATCH  | `/api/role-descriptions/:role`   | Update a role's description         | Requires auth + `user_admin` role |

### Chatbot & Voice

| Method | Endpoint | Body fields                              |
|--------|----------|------------------------------------------|
| POST   | `/api/chat`  | `message`, `conversationId`, `image` (optional base64) |
| POST   | `/api/transcribe` | `audio` (multipart file) — returns `{ text, language }` |

> `/api/transcribe` is handled by the Express backend (port 5000). The TTS endpoint (`/api/tts`) is a Next.js API route (port 3000) and does not appear here.

---

## Frontend Pages & Features

| URL Path                          | Description                                           |
|------------------------------------|-------------------------------------------------------|
| `/`                                | Landing page — same login screen as `/login`          |
| `/login`                           | Unified login for customer, store staff & user admin — redirects to `/home`, `/store-staff`, or `/user-admin-dashboard` based on the account's role |
| `/register`                        | Customer registration                                  |
| `/forgot-password`                 | Password reset                                        |
| `/change-password`                 | Change password (authenticated)                       |
| `/home`                            | Storefront homepage — Hero, About, Avy highlight, MeetTheCrew |
| `/buy-driptea`                     | Category browse + instant client-side search          |
| `/menu/[category]`                 | Drink listing by category                             |
| `/menu/[category]/[drinkId]`       | Drink detail — customise size, ice, sugar, toppings    |
| `/cart`                            | Shopping cart                                         |
| `/cart/edit/[cartItemId]`          | Edit a cart item's customisation                       |
| `/checkout`                        | Order & payment                                       |
| `/order-status/[orderId]`          | Live order tracking — pickup/delivery status card & map |
| `/profile`                         | Customer profile                                      |
| `/purchase-history`                | Customer order history                                |
| `/vouchers`                        | Customer's active/used vouchers                        |
| `/contact`                         | Contact / enquiry page                                |
| `/global-stores`                   | Store locator (Leaflet map)                            |
| `/our-story`                       | Brand story page                                      |
| `/store-staff`                     | Menu & inventory management (store staff)               |
| `/store-staff-dashboard`           | Order queue management & order feedback (store staff)   |
| `/store-staff-voucher`             | Voucher management — view, search, delete (staff)      |
| `/user-admin-dashboard`            | User & role management (admin)                          |
| `/marketing`                       | Standalone marketing landing page (not linked from the main app nav) |

> There is no `/user-admin` or `/delivery` route — admin login shares `/login` with the other roles, and delivery tracking lives at `/order-status/[orderId]` rather than a dedicated delivery-picker page.

---

## Chatbot Test Prompts

Sample prompts to help explore Avy's supported features. Similar questions with different wording, or in any supported language (English, Chinese, Malay, Tamil), are understood as well.

### A. General Information

**Menu Information**
- What drinks do you have?
- Show me the menu.
- Show me all the milk teas.
- Show me fruit teas.
- Show me matcha drinks.
- What are your best-selling drinks?
- What are your latest drinks?

**Beverage Information**
- What ingredients are in Matcha Latte?
- Tell me more about Classic Milk Tea.
- Does Matcha Latte contain milk?
- Does Ice Lemon Tea contain caffeine?

**Nutrition Information**
- How much sugar is in Classic Milk Tea?
- How many calories are in Matcha Latte?
- What is the Nutri-Grade of Oolong Milk Tea?
- Which drink has the lowest sugar?
- Which drink has the lowest calories?
- Which drink is the healthiest?

### B. Beverage Recommendations

**Preference-based Recommendation**
- Recommend something fruity.
- Recommend a refreshing drink.
- Recommend something sweet.
- Recommend a chocolate drink.
- Recommend a matcha drink.
- Recommend a drink without milk.
- Recommend a hot drink.
- Surprise me.

**Health-based Recommendation**
- I have a sore throat. What should I drink?
- I have a cough.
- I am feeling sick.
- I want a healthier drink.
- Recommend a low-sugar beverage.
- Recommend a low-calorie drink.
- I'm trying to reduce sugar intake.

> Note: The chatbot provides general beverage suggestions only and does not replace professional medical advice.

### C. Ordering

**Place an Order**
- I want one regular Matcha Latte, no sugar.
- I'd like a Classic Milk Tea.
- Add one Jasmine Green Tea to my cart.
- I want two Oolong Milk Teas.

**Drink Customization**
- Large size.
- Less sugar.
- No sugar.
- Less ice.
- No ice.
- Add pearls.
- Add cheese foam.
- Remove pearls.

**Cart Management**
- Show my cart.
- View my cart.
- Remove Matcha Latte from my cart.
- Clear my cart.
- Update my order.

### D. Order Management

**Order Tracking**
- Track my order.
- Where is my order?
- What is my order status?
- Is my order ready?
- Has my order been collected?

**Purchase History**
- Show my purchase history.
- What was my last order?
- Reorder my last order.
- What did I order yesterday?

### E. Vouchers & Promotions
- Show my vouchers.
- What vouchers do I have?
- Do I have any discounts?
- Show available promotions.
- How do I redeem a voucher?

### F. Navigation Assistance
The chatbot can guide users to different pages within the system.
- Take me to the menu page.
- Open my cart.
- Go to checkout.
- Show my vouchers.
- Open purchase history.
- Take me to the feedback page.
- Open my profile.

### G. Feedback
- I want to submit feedback.
- Leave feedback for my order.
- Rate my last order.

### H. Voice Recognition
Users may tap the microphone button and speak naturally. Example voice commands:
- I would like one Matcha Latte.
- Add one Classic Milk Tea with less sugar.
- Show my cart.

### I. Image Recognition
Users may upload beverage images. Example prompts:
- What drink is this?
- Identify this drink.
- Can I order this drink?
- Tell me more about this beverage.
- I want a beverage with this fruit.

### J. Multi-language Support
The chatbot supports:
- English
- 中文 (Chinese)
- Bahasa Melayu
- தமிழ் (Tamil)

Users may communicate naturally in any supported language.

### K. Multi-intent Queries
The chatbot can process multiple requests in a single conversation. Examples:
- Recommend a fruity drink and show my vouchers.
- Add one Matcha Latte and show my cart.
- Show my purchase history and reorder my last drink.
- Recommend a low-sugar drink and take me to the menu page.
- Track my order and show my order history.
- I need a large ice lemon tea, no sugar, less ice and another regular cranberry matcha tea with 25% sugar, no ice and pearls as topping.

### L. General Conversation
Users may also ask:
- Hi
- Hello
- Thank you
- Goodbye
- What can you do?
- How can you help me?

> Note: The example prompts above are provided for demonstration purposes only. The chatbot supports natural language conversations, and users are not required to follow the exact wording shown here. Similar questions with different phrasing will also be understood where supported.

---

## Maps & Geocoding (OneMap + Leaflet)

Location features appear in three places — there is no standalone `/delivery` route; the delivery address picker is a step inside `/checkout`:

- **Leaflet + react-leaflet** render the interactive maps themselves (tiles, markers, popups).
  - `view/app/global-stores/StoreMap.tsx` — plots both DripTea outlets as pins on a static map.
  - `view/app/components/pages/CheckoutAddressMap.tsx` — on the `/checkout` delivery step, plots the selected outlet and the customer's chosen delivery point.
  - `view/app/components/pages/CheckoutDeliveryAddress.tsx` — the address search UI itself; also computes straight-line distance (`calculateDistanceKm`) to derive the delivery fee.
  - `view/app/order-status/[orderId]/TrackingDeliveryMap.tsx` — shows the live delivery route on the order-tracking page.
- **OneMap** (Singapore government's official mapping API) supplies the address search behind the checkout delivery step:
  - **Search/autocomplete** — typing an address in `CheckoutDeliveryAddress.tsx` calls the Next.js proxy route `view/app/api/onemap/search/route.ts`, which authenticates with `ONEMAP_EMAIL`/`ONEMAP_PASSWORD` to get a token, then queries OneMap's `elastic/search` endpoint. The proxy exists so the OneMap credentials stay server-side.

See [Environment Variables](#environment-variables) for the required `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` setup.

---

## Running Automated Tests

The backend has a Mocha/Chai/Supertest suite in `test_cases/` — see `test_cases/README.md` for full details of what each file covers. Run it from the project root:

```bash
npm test
```

This runs GUI-code-existence checks, backend validation-rule checks, chatbot behaviour checks, real HTTP requests against every route (failure paths, via Supertest), Mongoose model rule checks, order-status intent classification checks, and full success-path/role-boundary flows against a temporary in-memory MongoDB (`mongodb-memory-server`) — none of it touches the live Atlas database or calls the real AI service.

