// Load test against the no-op stub endpoint (/api/chat-test).
// Measures Express/infra concurrency handling WITHOUT calling Gemini/Groq —
//
// Run:  k6 run load-tests/chat-test-stub.js
// Override target:  k6 run -e BASE_URL=http://localhost:5000 load-tests/chat-test-stub.js

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

export const options = {
  scenarios: {
    hundred_customers_at_once: {
      executor: "per-vu-iterations",
      vus: 100,
      iterations: 1,
      maxDuration: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
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
    conversationId: `loadtest-${__VU}`,
    userId: `loadtest-user-${__VU}`,
    isQuickPrompt: false,
  });

  const res = http.post(`${BASE_URL}/api/chat-test`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
    "echoed body back": (r) => r.json("ok") === true,
  });

  sleep(1);
}
