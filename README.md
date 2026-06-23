# FYP-26-S2-11 — DripTea AI Chatbot

An AI-powered ordering chatbot for DripTea, a bubble tea shop. Customers can chat with **Avy**, get personalised drink recommendations, and place orders through a Next.js storefront backed by a Node.js/Express API and MongoDB.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Live Deployment (Vercel)](#live-deployment-vercel)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Environment Variables](#environment-variables)
6. [Database Setup (MongoDB)](#database-setup-mongodb)
7. [Backend Setup](#backend-setup)
8. [Frontend Setup](#frontend-setup)
9. [Testing Connections](#testing-connections)
10. [Default Seed Accounts](#default-seed-accounts)
11. [Essential API Endpoints](#essential-api-endpoints)
12. [Frontend Pages & Features](#frontend-pages--features)
13. [Recent Changes](#recent-changes)
14. [Chatbot Test Prompts](#chatbot-test-prompts)

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
| HTTP         | Axios                                               |
| i18n         | react-i18next                                       |

---

## Live Deployments (Vercel)

The frontend is hosted on Vercel at:

**https://driptea-ruby.vercel.app/**

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

---

## Project Structure

This project follows the **MVC (Model-View-Controller)** architectural pattern:

- **Model** — `src/models/` contains Mongoose schemas that define the data layer (users, menu items, orders, etc.)
- **View** — `view/` is the Next.js frontend that renders the UI and interacts with the user
- **Controller** — `src/Controllers/` holds Express handler functions that contain business logic; `src/routes/` wires HTTP endpoints to those controllers

```
FYP-26-S2-11/
├── view/              ← (V) Next.js app — View layer (port 3000)
│   ├── app/           ← Next.js App Router pages & components
│   │   ├── api/chat/  ← Next.js proxy route — forwards chat requests to Express backend + enriches sources
│   │   ├── components/← Shared UI components
│   │   ├── locales/   ← i18n translation files (react-i18next)
│   │   ├── providers/ ← Redux / context providers
│   │   └── utils/     ← Frontend utility functions
│   ├── public/        ← Static assets (images, videos, nutri-grade images)
│   └── package.json
├── src/
│   ├── ai/            ← AI client — Gemini key rotation + Groq fallback
│   ├── config/        ← env.js, mongo.js (DB connection)
│   ├── models/        ← (M) Mongoose models — Model layer
│   ├── routes/        ← Express route files
│   └── Controllers/   ← (C) Business logic — Controller layer
├── server.js          ← Backend entry point (port 5000)
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
MONGODB_AUTOCONNECT=true

# ── Optional ──────────────────────────────────────────────
PORT=5000
NODE_ENV=development
CHAT_LANGUAGE_MODE=english   # or "match" to reply in the user's language
```

> **Never commit real keys.** Add `.env` to your `.gitignore`.

### Frontend — `view/.env.local`

Create a `.env.local` file inside the `view/` folder:

```env
DRIPTEA_API_BASE=http://localhost:5000

# ElevenLabs — used by the Next.js /api/tts route (text-to-speech bot voice)
# These are server-side only (no NEXT_PUBLIC_ prefix) — never exposed to the browser
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_elevenlabs_voice_id_here
```

> - `DRIPTEA_API_BASE` tells the frontend where the backend is running. Change this to your deployed backend URL when going to production.
> - `ELEVENLABS_VOICE_ID` sets which voice Avy uses when speaking replies. Find voice IDs at [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library).

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

Copy these three lines into your root `.env` file exactly as shown:

```env
MONGODB_URI=mongodb+srv://avisfyp01_db_user:zefhyp1jucca8@driptea-vs1.tt7qbar.mongodb.net/?retryWrites=true&w=majority&appName=driptea-vs1
MONGODB_DB_NAME=driptea_vs1
MONGODB_AUTOCONNECT=true
```

> **Network Access:** If you get a connection timeout, go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Network Access** → add your current IP address (or `0.0.0.0/0` to allow all IPs for development).

### 2. Verify the connection

After starting the backend (see below), run:

```
GET http://localhost:5000/api/health/mongo
```

Expected response:

```json
{
  "ok": true,
  "connected": true,
  "collections": ["users", "menu_items", "cart_items", "orders", "order_items", "payments", "chatbot_sessions", "vouchers"]
}
```

### 3. Initialise collections & seed data

The backend auto-creates collections and seeds default users + the full menu the **first time** a database route is called. You can also trigger it manually:

```
POST http://localhost:5000/api/mongo/setup
```

Expected response (example):

```json
{
  "ok": true,
  "message": "MongoDB collections are ready for DripTea.",
  "collections": {
    "users": 3,
    "menu_items": 12,
    "orders": 0,
    ...
  }
}
```

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

```
GET http://localhost:5000/api/health/mongo
```

```json
{ "ok": true, "connected": true, "collections": [...] }
```

If `connected` is `false`, check `MONGODB_URI` in your `.env` and ensure your IP is whitelisted in Atlas.

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

## Default Seed Accounts

These accounts are created automatically on first startup:

| Role         | Email                   | Password      |
|--------------|-------------------------|---------------|
| User Admin   | admin@driptea.com       | Admin@123     |
| Store Staff  | staff@driptea.com       | Staff@123     |
| Customer     | customer@driptea.com    | Customer@123  |

Use these to log in and test each role's dashboard.

---

## Essential API Endpoints

All backend routes are prefixed with `/api` except the chatbot.

### Health

| Method | Endpoint              | Description                         |
|--------|-----------------------|-------------------------------------|
| GET    | `/api/health`         | Backend alive check                 |
| GET    | `/api/health/mongo`   | MongoDB ping & collection list      |
| POST   | `/api/mongo/setup`    | Initialise collections + seed data  |

### Auth

| Method | Endpoint              | Body fields                                    |
|--------|-----------------------|------------------------------------------------|
| POST   | `/api/auth/register`  | `fullName`, `email`, `password`                |
| POST   | `/api/auth/login`     | `email`, `password`                            |

### Menu

| Method | Endpoint                       | Description                         |
|--------|--------------------------------|-------------------------------------|
| GET    | `/api/menu-items`              | List active menu items              |
| GET    | `/api/menu-items?status=all`   | List all items including inactive   |
| PATCH  | `/api/menu-items/:id/status`   | Toggle item active / inactive       |

### Cart

| Method | Endpoint              | Description               |
|--------|-----------------------|---------------------------|
| GET    | `/api/cart-items`     | Get cart (`?userId=<id>`) |
| POST   | `/api/cart-items`     | Add item to cart          |
| DELETE | `/api/cart-items/:id` | Remove item from cart     |

### Orders

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/orders`               | List orders (staff view) |
| PATCH  | `/api/orders/:id/status`    | Update order status      |
| POST   | `/api/checkout`             | Place order & payment    |

### Chatbot

| Method | Endpoint | Body fields                              |
|--------|----------|------------------------------------------|
| POST   | `/api/chat`  | `message`, `conversationId`, `image` (optional base64) |
| POST   | `/api/transcribe` | `audio` (multipart file) — returns `{ text, language }` |

> `/api/transcribe` is handled by the Express backend (port 5000). The TTS endpoint (`/api/tts`) is a Next.js API route (port 3000) and does not appear here.

---

## Frontend Pages & Features

| URL Path                       | Description                                           |
|--------------------------------|-------------------------------------------------------|
| `/`                            | Landing page — Hero, About, Avy highlight, MeetTheCrew|
| `/buy-driptea`                 | Category browse + instant client-side search          |
| `/menu/[category]`             | Drink listing by category                             |
| `/menu/[category]/[drinkId]`   | Drink detail — customise size, ice, sugar, toppings   |
| `/cart`                        | Shopping cart                                         |
| `/checkout`                    | Order & payment                                       |
| `/login`                       | Customer login                                        |
| `/register`                    | Customer registration                                 |
| `/forgot-password`             | Password reset                                        |
| `/change-password`             | Change password (authenticated)                       |
| `/profile`                     | Customer profile                                      |
| `/purchase-history`            | Customer order history                                |
| `/contact`                     | Contact / enquiry page                                |
| `/global-stores`               | Global store locator                                  |
| `/our-story`                   | Brand story page                                      |
| `/store-staff`                 | Store staff login                                     |
| `/store-staff-dashboard`       | Order queue management (staff)                        |
| `/user-admin`                  | Admin login                                           |
| `/user-admin-dashboard`        | User & menu management (admin)                        |

---

## Recent Changes

### Multilingual Voice Input & Bot Voice (ElevenLabs)

**Speech-to-Text (STT) — Mic & Speak buttons**
- Replaced the Web Speech API with **ElevenLabs Scribe v1** for true audio-based language auto-detection
- Supports English, Malay, Chinese, and Tamil without requiring the user to manually select a language
- `MediaRecorder` captures raw audio; speak mode uses `AudioContext` volume polling (VAD) to detect 600ms of silence and auto-send
- Audio is sent to `POST /api/transcribe` (Express backend) → forwarded to ElevenLabs → returns `{ text, language }`
- Parenthetical sound descriptions (e.g. `(background noise)`, `(laughter)`) are automatically stripped from transcripts before they reach the chatbot
- TTS pause/resume hooks prevent the bot's own voice from being recorded and re-sent as user input

**Text-to-Speech (TTS) — Bot voice narration (Speak mode only)**
- Bot replies are now spoken using ElevenLabs `eleven_multilingual_v2` model via a Next.js API route (`/api/tts`)
- The same voice handles all four languages automatically; no language parameter needed
- Falls back to the browser's built-in Web Speech Synthesis if ElevenLabs is unavailable
- Voice is configurable via `ELEVENLABS_VOICE_ID` in `view/.env.local`

**Tamil language support**
- Added Tamil script (`[஀-௿]`) detection on both frontend and backend
- Backend AI prompt now instructs Gemini to reply entirely in Tamil when Tamil script is detected
- Added Tamil translations for all ordering UI labels (size, ice level, sugar %, toppings)

**Language detection fixes**
- Mic language no longer gets stuck after detecting Chinese or Tamil — resets correctly when input is cleared
- Previous session language no longer persists after page refresh (`sessionStartedRef` skips history on mount)
- Default language changed from `en-US` to `en-GB` (British English, appropriate for Singapore)
- Browser language (`navigator.language`) used as the starting default for mic/speak mode

### Cart Badge Fix
- Fixed a race condition in `Header.tsx` where the navbar cart badge count was reverting to the old count after adding a drink
- Root cause: `syncStoredCartFromBackend` (a backend GET) was racing with `addCartItem` (backend POST) — the GET completed first, returned stale data, and overwrote localStorage before the new item was saved
- Fix: `cartUpdated` event handler now only reads from localStorage (which is already updated before the event fires); backend sync is reserved for initial page load and `authUpdated` (login/logout) where no concurrent POST exists

### Cart Page — UI & Routing Fix
- Moved `cart/edit/[cartItemId]/page.tsx` from `view/app/components/cart/edit/...` to the correct Next.js App Router path `view/app/cart/edit/[cartItemId]/page.tsx` — it was previously unreachable as a route
- Improved cart page layout: added `.cart-content` wrapper (`max-width: 1000px; margin: 0 auto`) so only content below the header is constrained, keeping the navbar full-width and consistent with other pages
- Back to Menu button: `align-self: flex-start` and proper spacing so it no longer appears cramped or centered
- Checkout button: `justify-content: flex-end` on `.checkout-row` with no extra padding — right-aligned cleanly with the cart panel

### Drink Info & Ratings — Moved from Hardcoded to MongoDB
- Added `drinkInfo` (`ingredients`, `diabeticAdvice`, `insulinImpact`) and `rating` fields to the `menuItem` Mongoose schema (`src/models/menuItem.model.js`)
- Both fields are included in the public menu API response (`src/controllers/menu.controller.js`)
- Removed hardcoded `DRINK_INFO` and `DRINK_RATINGS` constants from `DrinkCard.tsx` and `DrinkRecCards.tsx`; components now receive values as props or read from the API response
- `ChatbotSidebar.tsx` builds a `menuById` lookup (keyed by item ID) so it can pass `rating` and `drinkInfo` as props to `DrinkCard` when rendering chatbot drink recommendations

### API Documentation — `dripteaApi.ts`
- Added a single-line comment above every exported function in `view/app/utils/dripteaApi.ts` describing its purpose and the full backend file chain (route → controller → service)
- Removed all `// done by "HDC"` / `// end done by "HDC"` markers from the file

### Code Cleanup — `view/app/components/`
- Deleted `KeywordInfo.tsx` and `KeywordInfo.module.css` — component had no callers
- Deleted `ORGANIZATION.md` — documentation file mixed in with source components
- Deleted all barrel `index.ts` re-export files (`components/index.ts`, `drink/index.ts`, `layout/index.ts`, `chatbot/index.ts`, `pages/index.ts`, `ui/index.ts`, `cart/index.ts`) — none were imported by real code
- Removed the now-empty subdirectories: `chatbot/`, `drink/`, `layout/`, `pages/`, `ui/`

### Login Page — Migrated to TypeScript
- `view/app/login/page.js` converted to `page.tsx`
- Added TypeScript types: `LoginCredentials`, `LoginPayload` interfaces; typed `useRef<HTMLInputElement>`, form event handler, and helper function parameters
- Removed unused `storeUser` import

### Footer Social Links Fix
- Replaced placeholder external URLs with `#` and removed `target="_blank"` / `rel="noreferrer"` from social links to eliminate browser security warnings

### Add Manual Feedback Function
- Purchase History -> Feedback button -> Feedback Page -> Select 1-5 stars -> Write comment -> Submit -> POST /api/feedback -> MongoDB feedbacks collection -> Average rating updated in menu_items.rating
- For example, A gives 5 stars for Classic Milk Tea, B gives 3 stars for Classic Milk Tea, the avarage rating shown in menu.items will be 4 stars.
- Sequence Diagram flow: Customer -> FeedbackGUI -> Feedback.Controller -> Feedback.Model, MenuItem.Model

### Multiple Languages Function
- All languages works well in the whole ordering flow.

### UI & Frontend Improvements

**Landing Page (`/`)**
- Replaced the old "Meet the Crew" section with a full-width video banner (`buy_driptea_3.mp4`) with a CTA overlay
- Added conditional marketing section below the video: perk cards + registration CTA for guests; member benefits grid for logged-in users
- Added new **Avy Section** between About Us and Meet the Crew — highlights chatbot features with a "CHAT WITH AVY" button that opens the sidebar directly via a custom browser event (no URL param side effects)
- "Join the Crew" eyebrow uses Dancing Script font

**Buy DripTea Page (`/buy-driptea`)**
- Updated category card images: Milk Tea → b004, Matcha Teas → b007, Ice Blended → b012, Local Favourites → b011
- Redesigned category cards: full-bleed image, frosted-glass price badge overlay, consistent brown Browse button (hover → secondary blue `#0257AD`)
- Search now loads all menu items once on page mount and filters client-side — instant results with no API delay per keystroke

**Drink Listing Page (`/menu/[category]`)**
- Redesigned drink cards to match category card style: full-bleed image, price badge overlay, full-width "Customize & Add" button
- "Back to Categories" button styled as white pill to match "VIEW ALL DRIPS" button

**Drink Detail Page (`/menu/[category]/[drinkId]`)**
- Replaced coloured letter nutri-grade badge with official `grade_nutri_X_full.png` image (A/B/C/D), displayed below the Sugar and kcal pills, left-aligned
- "Back to Category" now calls `router.back()` instead of always going to `/buy-driptea`
- Removed hover zoom on drink image

**Chatbot Sidebar**
- Improved message entrance animations: spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`), 380ms duration, slide + subtle scale for a natural pop-in feel
- Improved typing indicator: dots now scale up at bounce peak for a livelier pulse
- Fixed `AvyQueryListener` bug where `?avy=open` in the URL prevented the chatbot from being closed — URL param is now cleared immediately after opening

**Store Staff Dashboard**
- Removed "Live orders refreshed HH:MM:SS" timer banner; errors still display when they occur

### Data & Code Cleanup
- Removed `data/menu.json` and `data/nutriCalculator.js` — all menu data is served from MongoDB
- Removed unused imports and dead code from `ChatbotSidebar.tsx`: `menuData`, `applyGlossaryTooltips`, `MessageSource`, `TRUSTED_SOURCE_HOSTS`, `narrationVoiceRef`, `inputRef`, `pickNarrationVoice`, `resumeSpeakModeListening`
- Removed pill/rounded-rectangle backgrounds from chip labels site-wide for a cleaner look

---

## Chatbot Test Prompts

Use these to verify the full ordering flow inside the chat widget:

1. **Greeting** — `Hi`
2. **Basic recommendation** — `What drinks do you have?`
3. **Filter by price** — `I want chocolate drinks under $5`
4. **Multi-flavour** — `I want chocolate or milo drink`
5. **Health query** — `What is the healthiest option?`
6. **Topping query** — `What is pearl? Explain any toppings`
7. **Full order flow** — choose a drink, then follow Avy's prompts for size, ice, sugar, and toppings
8. **Image input** — send a photo of a drink and ask Avy to describe it

### Voice & Multilingual Tests

9. **English mic** — click the mic button, say "What drinks do you have?" in English
10. **Malay mic** — click mic, say "Saya nak satu teh matcha strawberi."
11. **Chinese mic** — click mic, say "我想要一杯奶茶"
12. **Tamil mic** — click mic, say "எனக்கு ஒரு தேநீர் வேண்டும்"
13. **Speak mode (TTS)** — click the Speak button, ask for a recommendation; Avy should reply both in text and with ElevenLabs voice audio
14. **Language auto-switch** — type in Chinese first, then use mic in English; mic should reset to English correctly
