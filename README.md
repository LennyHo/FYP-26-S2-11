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
13. [Chatbot Test Prompts](#chatbot-test-prompts)

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

The backend auto-creates collections and seeds default users, the full menu, and default vouchers the **first time** a database route is called. You can also trigger it manually:

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

### Vouchers

| Method | Endpoint                    | Description                                  |
|--------|-----------------------------|----------------------------------------------|
| GET    | `/api/vouchers`             | Get all active vouchers (customer)           |
| GET    | `/api/vouchers/used`        | Get used vouchers for a customer             |
| POST   | `/api/cart/apply-voucher`   | Apply a voucher code to cart                 |
| GET    | `/api/staff/vouchers`       | Get all vouchers (store staff)               |
| DELETE | `/api/staff/vouchers/:id`   | Delete a voucher (store staff)               |

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
| `/store-staff-voucher`         | Voucher management — view, search, delete (staff)     |

