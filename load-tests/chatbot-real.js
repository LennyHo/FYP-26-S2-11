// Load test against the REAL chatbot endpoint (/api/chat).
// Every request triggers an actual Gemini (fallback Groq) API call
// only scale to the full 100 once the stub test (chat-test-stub.js)
// has passed and you're ready to accept the API cost.
//
// Run (default, 10 VUs):        k6 run load-tests/chatbot-real.js
// Run at full 100 concurrency:  k6 run -e VUS=100 load-tests/chatbot-real.js
// Override target:              k6 run -e BASE_URL=https://driptea-trrn.onrender.com load-tests/chatbot-real.js

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const VUS = Number(__ENV.VUS || 10);

// Real customer _ids seeded into the isolated load-test DB by
// load-tests/seed-loadtest-db.js. Each VU acts as a distinct customer.
const USER_IDS = new SharedArray("users", () =>
  JSON.parse(open("./loadtest-users.json"))
);

export const options = {
  scenarios: {
    customers_chatting: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: VUS }, // ramp up rather than slam all at once
        { duration: "30s", target: VUS }, // hold
        { duration: "10s", target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<8000"], // LLM calls are slow; generous budget
  },
};

const SAMPLE_MESSAGES = [
  "What drinks do you have on the menu?",
  "I want to order a milk tea",
  "What's the status of my last order?",
  "Do you have any vouchers for me?",
  "How many calories in a brown sugar boba?",
  "Where is my nearest store?",
];

export default function () {
  const payload = JSON.stringify({
    message: SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)],
    conversationId: `loadtest-${__VU}-${__ITER}`,
    userId: USER_IDS[(__VU - 1) % USER_IDS.length],
    isQuickPrompt: false,
  });

  const res = http.post(`${BASE_URL}/api/chat`, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: "30s",
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "has reply field": (r) => {
      try {
        return typeof r.json("reply") === "string";
      } catch {
        return false;
      }
    },
  });

  sleep(2);
}
