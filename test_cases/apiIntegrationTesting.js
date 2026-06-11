// API Integration Testing
// These tests send HTTP requests into an Express app using the real route files.
// They test the route + controller path, but only with simple invalid inputs.
const { expect } = require("chai");
const express = require("express");
const request = require("supertest");

const menuRoutes = require("../src/routes/menu.routes");
const authRoutes = require("../src/routes/auth.routes");
const cartRoutes = require("../src/routes/cart.routes");
const chatbotRoutes = require("../src/routes/chatbot.routes");

// This helper builds a small test app without starting the real server.
function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use("/api", menuRoutes);
  app.use("/api", authRoutes);
  app.use("/api", cartRoutes);
  app.use("/api", chatbotRoutes);

  return app;
}

describe("API integration testing", function () {
  const originalConsoleError = console.error;

  // Some invalid API requests log expected errors, so this keeps the test output readable.
  before(function () {
    console.error = () => {};
  });

  // Restore console.error after API integration tests finish.
  after(function () {
    console.error = originalConsoleError;
  });

  // Test 1: POST /api/menu-items should reject a negative price.
  it("POST /api/menu-items rejects negative price", async function () {
    const response = await request(createTestApp())
      .post("/api/menu-items")
      .send({ name: "Test Drink", category: "Milk Tea", price: -1 });

    expect(response.status).to.equal(400);
    expect(response.body.ok).to.equal(false);
  });

  // Test 2: PATCH /api/menu-items/:id/status should reject invalid status.
  it("PATCH /api/menu-items/:id/status rejects invalid status", async function () {
    const response = await request(createTestApp())
      .patch("/api/menu-items/b001/status")
      .send({ status: "deleted" });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Status must be active or inactive.");
  });

  // Test 3: POST /api/auth/register should reject a short password.
  it("POST /api/auth/register rejects short password", async function () {
    const response = await request(createTestApp())
      .post("/api/auth/register")
      .send({ fullName: "Test User", email: "test@example.com", password: "123" });

    expect(response.status).to.equal(400);
    expect(response.body.ok).to.equal(false);
  });

  // Test 4: POST /api/cart-items should reject an invalid customer id.
  it("POST /api/cart-items rejects invalid customer id", async function () {
    const response = await request(createTestApp())
      .post("/api/cart-items")
      .send({ userId: "bad-id", beverageId: "b001", quantity: 1 });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Invalid customerId.");
  });

  // Test 5: POST /api/chat should handle an empty message safely.
  it("POST /api/chat replies to empty message", async function () {
    const response = await request(createTestApp())
      .post("/api/chat")
      .send({ message: "" });

    expect(response.status).to.equal(200);
    expect(response.body.reply).to.equal("Please send a message.");
  });
});
