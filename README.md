# FYP-26-S2-11: DripTea AI Chatbot

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
11. [Frontend Pages & Features](#frontend-pages--features)
12. [Chatbot Test Prompts](#chatbot-test-prompts)
13. [Maps & Geocoding (OneMap + Leaflet)](#maps--geocoding-onemap--leaflet)
14. [Running Automated Tests](#running-automated-tests)
15. [Load Testing (k6)](#load-testing-k6)

---

## Tech Stack

| Layer        | Technology                                          |
|--------------|-----------------------------------------------------|
| Frontend     | React 19, Next.js 16, TypeScript                    |
| Backend      | Node.js, Express.js 5                               |
| Database     | MongoDB (via Mongoose)                              |
| AI (text)    | Gemini 2.5 Flash, falling back to Groq Llama        |
| AI (image)   | Gemini 2.5 Flash                                    |
| AI (speech-to-text) | ElevenLabs Scribe v1 (multilingual)          |
| AI (text-to-speech) | ElevenLabs eleven_multilingual_v2 (bot voice) |
| Maps         | Leaflet + react-leaflet (store locator & order-tracking maps) |
| Geocoding    | OneMap API (Singapore address search/autocomplete)  |
| HTTP         | Axios                                               |
| Multi-language | Gemini-based translation in the chatbot service (not a frontend i18n library) |

---

## Live Deployments

The app is split across two hosts. The Next.js frontend runs on Vercel, the Express backend on Render:

| Layer    | Host   | URL                                                                  |
|----------|--------|----------------------------------------------------------------------|
| Frontend | Vercel | [https://driptea-ruby.vercel.app/](https://driptea-ruby.vercel.app/) |
| Backend  | Render | `https://driptea-trrn.onrender.com`                                  |

The Render URL is the hard-coded fallback the frontend uses when `DRIPTEA_API_BASE` / `NEXT_PUBLIC_DRIPTEA_API_BASE` are unset (see `view/app/utils/api.base.ts`), so the deployed frontend reaches the deployed backend without extra config.

### Render Account Access

Deployment credentials are **not** stored in this repo. To manage deployments, environment variables, or build logs, ask a team member to invite you to the Render project, then log in at [render.com/login](https://render.com/login) with your own account.

---

## Prerequisites

Make sure all of the following are installed and working on your machine **before** you start:

- **Node.js** v18 or later (check with `node -v`)
- **npm** v9 or later (check with `npm -v`)
- **MongoDB Atlas account**, or a local MongoDB instance
- A **Groq API key / openai/gpt-oss-20b**. Sign in at [console.groq.com/keys](https://console.groq.com/keys), then click **+ Create API Key**
- A **Gemini API key** from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- An **ElevenLabs API key** from [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys), used for both STT transcription and the TTS bot voice
- An **ElevenLabs Voice ID**. Open [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library), pick a voice, and copy its ID
- A **OneMap account** from [onemap.gov.sg/apidocs/register](https://www.onemap.gov.sg/apidocs/register), used for address search/autocomplete on the checkout delivery step

---

## Project Structure

This project follows the **MVC (Model-View-Controller)** architectural pattern:

- **Model:** `src/models/` contains Mongoose schemas that define the data layer (users, menu items, orders, etc.)
- **View:** `view/` is the Next.js frontend that renders the UI and interacts with the user
- **Controller:** `src/controllers/` holds Express handler functions that contain business logic. `src/routes/` wires HTTP endpoints to those controllers, and `src/services/` and `src/utils/` support them with chatbot/prompt logic and shared helpers

```
FYP-26-S2-11/
├── view/                  # (V) Next.js app, the View layer (port 3000)
│   ├── app/               # Next.js App Router pages & components
│   │   ├── api/           # Next.js API routes
│   │   │   ├── chat/      # proxy: forwards chat requests to Express, enriches sources
│   │   │   ├── onemap/search/ # proxy: authenticates & queries OneMap address search
│   │   │   └── tts/       # ElevenLabs text-to-speech route (bot voice)
│   │   ├── components/    # Shared UI components (chatbot/, layout/, menu/, pages/, ui/)
│   │   ├── [route]/       # One folder per page (home, login, cart, checkout,
│   │   │                  #   menu/[category], order-status/[orderId], etc.)
│   │   └── utils/         # Frontend utilities (API clients, validation, chat helpers)
│   ├── public/            # Static assets (img/, marketing/)
│   ├── .env.local         # Frontend env file (create this yourself)
│   └── package.json
├── src/
│   ├── ai/                # AI client: Gemini key rotation + Groq fallback
│   ├── config/            # mongo.js (DB connection)
│   ├── controllers/       # (C) Business logic, the Controller layer
│   ├── middleware/        # Express middleware (auth.middleware.js)
│   ├── models/            # (M) Mongoose models, the Model layer
│   ├── routes/            # Express route files
│   ├── services/          # Chatbot/prompt logic (chatbot.service.js, prompt.service.js)
│   └── utils/             # Backend utilities (intent parsing, validation, order progress)
├── .env                   # Backend env file (create this yourself)
├── server.js              # Backend entry point (port 5000)
└── package.json
```

> **Note:** `data/menu.json` and `data/nutriCalculator.js` have been removed. All menu data is now served exclusively from MongoDB via the `/api/menu-items` endpoint.

---

## Environment Variables

### Backend: project root `.env`

Create a `.env` file in the **project root** (same folder as `server.js`) and fill in your real keys:

### ENVIRONMENT

```env
# AI keys
GROQ_API_KEY=your_groq_api_key_here

# Supports multiple Gemini keys separated by commas (rotated on failure)
GEMINI_API_KEY=your_gemini_key_1,your_gemini_key_2

# ElevenLabs, used by POST /api/transcribe (speech-to-text via Scribe)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/?retryWrites=true&w=majority&appName=<app-name>
MONGODB_DB_NAME=driptea_vs1

# Optional
PORT=5000
NODE_ENV=development
CHAT_LANGUAGE_MODE=match     # default, replies in the customer's language. Use "english" to always reply in English

# Load testing only (see "Load Testing (k6)"). Must NOT equal MONGODB_DB_NAME
LOADTEST_DB_NAME=driptea_loadtest
LOADTEST_USERS=100           # number of synthetic customers to seed
```

> **Never commit real keys.** Add `.env` to your `.gitignore`.

### Frontend: `view/.env.local`

Create a `.env.local` file inside the `view/` folder:

```env
# Server-side only. Used by the Next.js /api/chat proxy route to reach the Express backend
DRIPTEA_API_BASE=http://localhost:5000

# Exposed to the browser (NEXT_PUBLIC_ prefix), used by client components that call the
# backend directly (e.g. chatbotApi.ts, useSpeech.ts). Leave unset for local dev. The
# frontend falls back to http://localhost:5000 automatically when NODE_ENV=development.
NEXT_PUBLIC_DRIPTEA_API_BASE=http://localhost:5000

# ElevenLabs, used by the Next.js /api/tts route (text-to-speech bot voice).
# Server-side only (no NEXT_PUBLIC_ prefix), so they never reach the browser
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id_here

# OneMap, used by the Next.js /api/onemap/search route (address search at checkout)
ONEMAP_EMAIL=your_onemap_account_email
ONEMAP_PASSWORD=your_onemap_account_password
```

> - `DRIPTEA_API_BASE` / `NEXT_PUBLIC_DRIPTEA_API_BASE` tell the frontend where the backend is running. Set both to your deployed backend URL in production.
> - `ELEVENLABS_VOICE_ID` sets which voice Avy uses when speaking replies. Find voice IDs at [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library).
> - `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` authenticate against the OneMap API to fetch a search token. Register a free account at [onemap.gov.sg/apidocs/register](https://www.onemap.gov.sg/apidocs/register). A saved delivery address caches its `lat`/`lng` on the user document the first time it's geocoded, so re-selecting an already-saved address never calls OneMap again. These credentials only come into play when searching for a **new** address, or geocoding a saved address that predates the coordinate cache.

---

## Database Setup (MongoDB)

### 1. Project MongoDB cluster (shared)

The project has a shared MongoDB Atlas cluster, database name `driptea_vs1`, so there's no need to create your own. **The connection string is not stored in this repo.** Ask a team member for it privately, or copy your own from [cloud.mongodb.com](https://cloud.mongodb.com) under **Database**, then **Connect**, then **Drivers**.

Put it in your root `.env` file:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/?retryWrites=true&w=majority&appName=<app-name>
MONGODB_DB_NAME=driptea_vs1
```

> **Network Access:** If you get a connection timeout, open [cloud.mongodb.com](https://cloud.mongodb.com), go to **Network Access**, and add your current IP address (or `0.0.0.0/0` to allow all IPs for development).

### 2. Verify the connection

`connectMongo()` (`src/config/mongo.js`) runs automatically on startup and connects using `MONGODB_URI`/`MONGODB_DB_NAME`. If it succeeds you'll see this in the backend terminal:

```
Connected to MongoDB database "driptea_vs1"
```

If it fails, the server logs the error and exits. Check `MONGODB_URI` in your `.env`, and that your IP is whitelisted in Atlas. There is no separate `/api/health/mongo` endpoint; `GET /api/health` only confirms the Express server itself is up.

### 3. Collections & data

Collections (`users`, `menu_items`, `cart_items`, `orders`, `order_items`, `payments`, `chatbot_sessions`, `vouchers`, `feedback`, `inventory`, `stores`) are created automatically by Mongoose the first time each model writes to them. There is no seed or setup endpoint. The shared Atlas cluster already has menu items, stores, and vouchers populated. A fresh local database starts empty, so you'll need to add menu items via the store-staff dashboard (`/store-staff`) and create your own accounts (see [Creating Accounts](#creating-accounts) below).

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

Check the backend terminal output when it starts. MongoDB connects during startup, not via a health endpoint:

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

There is no auto-seeded admin/staff account. `POST /api/auth/register` (used by `/register`) always creates a **customer** account, ignoring any `role` field sent by the client.

- **Customer:** self-register at [`/register`](http://localhost:3000/register), or use an existing customer account on the shared Atlas cluster.
- **Store Staff / User Admin:** only an existing User Admin can create these roles, via `POST /api/users` (used by the `/user-admin-dashboard` user-management screen). To bootstrap the very first admin on a fresh database, insert a user document directly into the `users` collection (e.g. via the MongoDB Atlas UI or `mongosh`) with `role: "user_admin"`. See `userSchema.statics.createUserAccount` in `src/models/user.model.js` for the exact fields. The password defaults to `Password@123` if none is supplied, and is hashed on write.
- All three roles log in from the same page, [`/login`](http://localhost:3000/login), which redirects to `/home`, `/store-staff`, or `/user-admin-dashboard` based on the account's `role`.

---

## Frontend Pages & Features

| URL Path                          | Description                                           |
|------------------------------------|-------------------------------------------------------|
| `/`                                | Unified login for customer, store staff & user admin. Redirects to `/home`, `/store-staff`, or `/user-admin-dashboard` based on the account's role |
| `/register`                        | Customer registration                                  |
| `/forgot-password`                 | Password reset                                        |
| `/change-password`                 | Change password (authenticated)                       |
| `/home`                            | Storefront homepage: Hero, About, Avy highlight, MeetTheCrew |
| `/buy-driptea`                     | Category browse + instant client-side search          |
| `/menu/[category]`                 | Drink listing by category                             |
| `/menu/[category]/[drinkId]`       | Drink detail: customise size, ice, sugar, toppings    |
| `/cart`                            | Shopping cart                                         |
| `/cart/edit/[cartItemId]`          | Edit a cart item's customisation                       |
| `/checkout`                        | Order & payment                                       |
| `/order-status/[orderId]`          | Live order tracking: pickup/delivery status card & map |
| `/profile`                         | Customer profile                                      |
| `/purchase-history`                | Customer order history                                |
| `/vouchers`                        | Customer's active/used vouchers                        |
| `/contact`                         | Contact / enquiry page                                |
| `/global-stores`                   | Store locator (Leaflet map)                            |
| `/our-story`                       | Brand story page                                      |
| `/store-staff`                     | Menu & inventory management (store staff)               |
| `/store-staff-dashboard`           | Order queue management & order feedback (store staff)   |
| `/store-staff-voucher`             | Voucher management: view, search, delete (staff)      |
| `/user-admin-dashboard`            | User & role management (admin)                          |
| `/marketing`                       | Standalone marketing landing page (not linked from the main app nav) |

> There is no `/user-admin` or `/delivery` route. Admin login shares `/login` with the other roles, and delivery tracking lives at `/order-status/[orderId]` rather than a dedicated delivery-picker page.

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

Location features appear in three places. There is no standalone `/delivery` route; the delivery address picker is a step inside `/checkout`.

- **Leaflet + react-leaflet** render the interactive maps themselves (tiles, markers, popups).
  - `view/app/global-stores/StoreMap.tsx` plots both DripTea outlets as pins on a static map.
  - `view/app/components/pages/CheckoutAddressMap.tsx` plots the selected outlet and the customer's chosen delivery point on the `/checkout` delivery step.
  - `view/app/components/pages/CheckoutDeliveryAddress.tsx` is the address search UI itself. It also computes straight-line distance (`calculateDistanceKm`) to derive the delivery fee.
  - `view/app/order-status/[orderId]/TrackingDeliveryMap.tsx` shows the live delivery route on the order-tracking page.
- **OneMap** (Singapore government's official mapping API) supplies the address search behind the checkout delivery step:
  - **Search/autocomplete:** typing an address in `CheckoutDeliveryAddress.tsx` calls the Next.js proxy route `view/app/api/onemap/search/route.ts`, which authenticates with `ONEMAP_EMAIL`/`ONEMAP_PASSWORD` to get a token, then queries OneMap's `elastic/search` endpoint. The proxy exists so the OneMap credentials stay server-side.

See [Environment Variables](#environment-variables) for the required `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` setup.

---

## Running Automated Tests

The backend has a Mocha/Chai/Supertest suite in `test_cases/`. See `test_cases/README.md` for full details of what each file covers. Run it from the project root:

```bash
npm test
```

This runs GUI-code-existence checks, backend validation-rule checks, chatbot behaviour checks, real HTTP requests against every route (failure paths, via Supertest), Mongoose model rule checks, order-status intent classification checks, and full success-path/role-boundary flows against a temporary in-memory MongoDB (`mongodb-memory-server`). None of it touches the live Atlas database or calls the real AI service.

---

## Load Testing (k6)

`load-tests/` holds [k6](https://k6.io/docs/get-started/installation/) scripts that simulate 100 customers chatting at once. Unlike `npm test`, these run against a **real running backend**, so they need their own seeded database first.

| File                     | Purpose                                                                 |
|--------------------------|-------------------------------------------------------------------------|
| `seed-loadtest-db.js`    | Seeds/clears the isolated load-test database (run this first)            |
| `chat-test-stub.js`      | Hits `/api/chat-test`, a no-op stub route. Measures Express/DB concurrency **without** calling Gemini/Groq, so it costs nothing |
| `chatbot-real.js`        | Hits the real `/api/chat`. Every request is a real LLM call, so it consumes API quota |
| `loadtest-users.json`    | Generated by the seed script: the `_id`s of the seeded test customers    |

### 1. Seed the load-test database

```bash
node load-tests/seed-loadtest-db.js
```

The script writes **only** to `LOADTEST_DB_NAME` (default `driptea_loadtest`), never to your real database. It:

- Copies `menu_items`, `stores`, and `vouchers` out of `MONGODB_DB_NAME` **read-only**, so the load test has real menu data to work with.
- Creates `LOADTEST_USERS` (default 100) synthetic customers — `loadtest+1@example.com` … `loadtest+100@example.com`, all with password `Password@123`. Accounts are inserted-or-ignored on email, so re-running the script leaves existing test accounts (and their password hashes) alone and only fills in missing ones. Extra accounts added by a previous `--add` run are removed so a reseed always lands on exactly `LOADTEST_USERS`.
- Writes their ids to `load-tests/loadtest-users.json`, which `chatbot-real.js` reads so each virtual user acts as a distinct real customer.

> **Safety guard:** the script throws and exits if `LOADTEST_DB_NAME` is the same as `MONGODB_DB_NAME`, so it can't overwrite the shared Atlas data.

### 2. Start the backend against the load-test database

```bash
MONGODB_DB_NAME=driptea_loadtest node server.js
```

On Windows PowerShell:

```powershell
$env:MONGODB_DB_NAME="driptea_loadtest"; node server.js
```

### 3. Run the tests

```bash
# Free: stub endpoint, 100 concurrent virtual users
k6 run load-tests/chat-test-stub.js

# Real chatbot, 10 virtual users by default
k6 run load-tests/chatbot-real.js

# Real chatbot at full 100 concurrency (uses real API quota)
k6 run -e VUS=100 load-tests/chatbot-real.js

# Point at the deployed backend instead of localhost
k6 run -e BASE_URL=https://driptea-trrn.onrender.com load-tests/chat-test-stub.js
```

Run the stub test first and only scale `chatbot-real.js` to 100 once it passes and you're ready to accept the API cost.

### 4. Clean up

```bash
node load-tests/seed-loadtest-db.js --drop
```

This drops the whole `driptea_loadtest` database. Remember to restart the backend without the `MONGODB_DB_NAME` override afterwards.
