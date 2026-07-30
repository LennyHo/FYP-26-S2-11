// API Integration Testing
// These tests send HTTP requests into an Express app using the real route files.
// They test the route + controller (+ auth middleware) path together. Endpoints
// with a fast validation failure are tested DB-free (the real failure path runs
// before any database call). Endpoints with no such failure path (plain listings)
// have their model method stubbed with `chainableResolve` — a fake Mongoose query
// that supports chained calls like `.select().sort().lean()` — so the real route
// and controller still run, just against fake data instead of a live database.
const { expect } = require("chai");
const express = require("express");
const request = require("supertest");

const menuRoutes = require("../src/routes/menu.routes");
const authRoutes = require("../src/routes/auth.routes");
const cartRoutes = require("../src/routes/cart.routes");
const chatbotRoutes = require("../src/routes/chatbot.routes");
const checkoutRoutes = require("../src/routes/checkout.routes");
const inventoryRoutes = require("../src/routes/inventory.routes");
const feedbackRoutes = require("../src/routes/feedback.routes");
const storeRoutes = require("../src/routes/store.routes");
const userRoutes = require("../src/routes/user.routes");
const voucherRoutes = require("../src/routes/voucher.routes");
const purchaseHistoryRoutes = require("../src/routes/purchaseHistory.routes");
const transcribeRoutes = require("../src/routes/transcribe.routes");

const ChatbotSession = require("../src/models/chatbotSession.model");
const MenuItem = require("../src/models/menuItem.model");
const Voucher = require("../src/models/voucher.model");
const Store = require("../src/models/store.model");
const User = require("../src/models/user.model");
const RoleDescription = require("../src/models/roleDescription.model");
const CartItem = require("../src/models/cartItem.model");

// This helper builds a small test app without starting the real server.
function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use("/api", menuRoutes);
  app.use("/api", authRoutes);
  app.use("/api", cartRoutes);
  app.use("/api", chatbotRoutes);
  app.use("/api", checkoutRoutes);
  app.use("/api", inventoryRoutes);
  app.use("/api", feedbackRoutes);
  app.use("/api", storeRoutes);
  app.use("/api", userRoutes);
  app.use("/api", voucherRoutes);
  app.use("/api", purchaseHistoryRoutes);
  app.use("/api", transcribeRoutes);

  return app;
}

// A syntactically valid Mongo ObjectId that does not exist in any database —
// enough to pass id-format checks without needing a real record to look up.
const FAKE_ID = "507f191e810c19729de860ea";

// A fake Mongoose query: `.then()` resolves it like a real query, and every
// other property access (`.select`, `.sort`, `.lean`, ...) returns a function
// that re-returns the same chain, so `await Model.find(x).sort(y).lean()`
// resolves to `value` without ever touching a real database.
function chainableResolve(value) {
  const promise = Promise.resolve(value);
  const target = {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  // The closure must return the proxy itself (not the plain target) so a second
  // chained call — e.g. the .lean() after .find().sort() — is trapped too.
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return () => proxy;
    },
  });
  return proxy;
}

// Swaps a model's static method for a stub, and restores the original afterwards —
// the same technique chatbotTesting.js already uses on the service layer.
function stubMethod(obj, methodName, implementation) {
  const original = obj[methodName];
  before(function () {
    obj[methodName] = implementation;
  });
  after(function () {
    obj[methodName] = original;
  });
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

  // ---- menu.routes.js ----

  it("POST /api/menu-items rejects negative price", async function () {
    const response = await request(createTestApp())
      .post("/api/menu-items")
      .send({ name: "Test Drink", category: "Milk Tea", price: -1 });

    expect(response.status).to.equal(400);
    expect(response.body.ok).to.equal(false);
  });

  it("PATCH /api/menu-items/:id/status rejects invalid status", async function () {
    const response = await request(createTestApp())
      .patch("/api/menu-items/b001/status")
      .send({ status: "deleted" });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Status must be active or inactive.");
  });

  it("PATCH /api/menu-items/:id rejects a missing drink name", async function () {
    const response = await request(createTestApp())
      .patch("/api/menu-items/b001")
      .send({ category: "Milk Tea", price: 5 });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Drink name is required.");
  });

  describe("menu listing endpoints (stubbed)", function () {
    stubMethod(MenuItem, "getMenu", async () => []);
    stubMethod(MenuItem, "searchBeverage", async () => []);
    stubMethod(MenuItem, "findOne", () => chainableResolve(null));

    it("GET /api/menu-items returns the menu list", async function () {
      const response = await request(createTestApp()).get("/api/menu-items");

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ ok: true, data: [] });
    });

    it("GET /api/menu/search returns search results", async function () {
      const response = await request(createTestApp()).get("/api/menu/search?q=tea");

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ ok: true, data: [] });
    });

    it("PATCH /api/menu-items/:id/new-arrival rejects an unknown item", async function () {
      const response = await request(createTestApp()).patch(`/api/menu-items/${FAKE_ID}/new-arrival`);

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Menu item not found.");
    });
  });

  // ---- auth.routes.js ----

  it("GET /api/auth/test responds ok", async function () {
    const response = await request(createTestApp()).get("/api/auth/test");

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ ok: true });
  });

  it("POST /api/auth/register rejects short password", async function () {
    const response = await request(createTestApp())
      .post("/api/auth/register")
      .send({ fullName: "Test User", email: "test@example.com", password: "123" });

    expect(response.status).to.equal(400);
    expect(response.body.ok).to.equal(false);
  });

  it("POST /api/auth/login rejects a disallowed email domain", async function () {
    const response = await request(createTestApp())
      .post("/api/auth/login")
      .send({ email: "test@notallowed.xyz", password: "whatever" });

    expect(response.status).to.equal(401);
    expect(response.body.message).to.equal("Invalid email or password.");
  });

  it("POST /api/auth/reset-password rejects a weak new password", async function () {
    const response = await request(createTestApp())
      .post("/api/auth/reset-password")
      .send({ email: "test@gmail.com", newPassword: "123" });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Password must contain at least 4 letters.");
  });

  it("PATCH /api/auth/change-password rejects a missing current password", async function () {
    const response = await request(createTestApp())
      .patch("/api/auth/change-password")
      .send({ userId: FAKE_ID, newPassword: "NewPass1@" });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal(
      "Current password and a new password of at least 6 characters are required."
    );
  });

  // ---- cart.routes.js ----

  it("POST /api/cart-items rejects invalid customer id", async function () {
    const response = await request(createTestApp())
      .post("/api/cart-items")
      .send({ userId: "bad-id", beverageId: "b001", quantity: 1 });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Invalid customerId.");
  });

  it("GET /api/cart-items rejects invalid customer id", async function () {
    const response = await request(createTestApp()).get("/api/cart-items?customerId=bad-id");

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Invalid customerId.");
  });

  it("PATCH /api/cart-items/:id rejects an invalid cart item id", async function () {
    const response = await request(createTestApp())
      .patch("/api/cart-items/not-an-id")
      .send({ quantity: 2 });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Invalid cart item id.");
  });

  it("DELETE /api/cart-items/:id rejects an invalid cart item id", async function () {
    const response = await request(createTestApp()).delete("/api/cart-items/not-an-id");

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Invalid cart item id.");
  });

  it("POST /api/cart/apply-voucher rejects a missing voucher code", async function () {
    const response = await request(createTestApp())
      .post("/api/cart/apply-voucher")
      .send({ userId: FAKE_ID });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Voucher code is required.");
  });

  it("GET /api/vouchers/used rejects a missing userId", async function () {
    const response = await request(createTestApp()).get("/api/vouchers/used");

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("User ID is required.");
  });

  describe("GET /api/cart-items/:id (stubbed)", function () {
    stubMethod(CartItem, "findById", () => chainableResolve(null));

    it("returns 404 for a cart item that doesn't exist", async function () {
      const response = await request(createTestApp()).get(`/api/cart-items/${FAKE_ID}`);

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Cart item not found.");
    });
  });

  describe("GET /api/vouchers (stubbed)", function () {
    stubMethod(Voucher, "find", () => chainableResolve([]));

    it("returns the active voucher list", async function () {
      const response = await request(createTestApp()).get("/api/vouchers");

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ ok: true, data: [] });
    });
  });

  // ---- chatbot.routes.js ----

  it("POST /api/chat replies to empty message", async function () {
    const response = await request(createTestApp())
      .post("/api/chat")
      .send({ message: "" });

    expect(response.status).to.equal(200);
    expect(response.body.reply).to.equal("Please send a message.");
  });

  describe("POST /api/chat order-status routing", function () {
    // ChatbotSession is stubbed here purely so this test doesn't need a live
    // MongoDB connection — the request still travels through the real route
    // and controller, and this exercises the order-status intent routing.
    stubMethod(ChatbotSession, "getConversationHistory", async () => []);
    stubMethod(ChatbotSession, "appendToConversation", async () => {});

    it("asks a guest to log in before tracking an order", async function () {
      const response = await request(createTestApp())
        .post("/api/chat")
        .send({ message: "order status" });

      expect(response.status).to.equal(200);
      expect(response.body.reply).to.equal("Please log in to track your order status.");
    });
  });

  // ---- checkout.routes.js ----

  it("POST /api/checkout rejects a missing userId", async function () {
    const response = await request(createTestApp())
      .post("/api/checkout")
      .send({ paymentMethod: "fake_card" });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("User ID is required.");
  });

  it("POST /api/checkout rejects a pickup order with no store selected", async function () {
    const response = await request(createTestApp())
      .post("/api/checkout")
      .send({ userId: FAKE_ID, orderType: "pickup" });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("A store must be selected to place an order.");
  });

  it("GET /api/orders/:id rejects an invalid order id", async function () {
    const response = await request(createTestApp()).get("/api/orders/not-an-id");

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("A valid order id is required.");
  });

  it("GET /api/orders/:id/queue rejects an invalid order id", async function () {
    const response = await request(createTestApp()).get("/api/orders/not-an-id/queue");

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("A valid order id is required.");
  });

  it("PATCH /api/orders/:id/status rejects an invalid status", async function () {
    const response = await request(createTestApp())
      .patch(`/api/orders/${FAKE_ID}/status`)
      .send({ status: "banana" });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("A valid order id and status are required.");
  });

  it("GET /api/orders rejects an unauthenticated request", async function () {
    const response = await request(createTestApp()).get("/api/orders");

    expect(response.status).to.equal(401);
    expect(response.body.message).to.equal("Authentication is required.");
  });

  describe("POST /api/orders/test-queue (stubbed)", function () {
    // The controller runs Store/User/MenuItem lookups in a single Promise.all,
    // so all three need stubbing even though only the Store result matters here —
    // otherwise the other two hang waiting for a real database connection.
    stubMethod(Store, "findOne", () => chainableResolve(null));
    stubMethod(User, "findOne", () => chainableResolve(null));
    stubMethod(MenuItem, "findOne", () => chainableResolve(null));

    it("rejects an unknown store code", async function () {
      const response = await request(createTestApp())
        .post("/api/orders/test-queue")
        .send({ storeCode: "NOT-A-STORE" });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal("Store not found.");
    });
  });

  // ---- inventory.routes.js (all store-staff-only) ----

  it("GET /api/inventory rejects an unauthenticated request", async function () {
    const response = await request(createTestApp()).get("/api/inventory");
    expect(response.status).to.equal(401);
  });

  it("GET /api/inventory/:id rejects an unauthenticated request", async function () {
    const response = await request(createTestApp()).get(`/api/inventory/${FAKE_ID}`);
    expect(response.status).to.equal(401);
  });

  it("POST /api/inventory rejects an unauthenticated request", async function () {
    const response = await request(createTestApp()).post("/api/inventory").send({ name: "Milk" });
    expect(response.status).to.equal(401);
  });

  it("PATCH /api/inventory/:id rejects an unauthenticated request", async function () {
    const response = await request(createTestApp())
      .patch(`/api/inventory/${FAKE_ID}`)
      .send({ quantity: 5 });
    expect(response.status).to.equal(401);
  });

  it("DELETE /api/inventory/:id rejects an unauthenticated request", async function () {
    const response = await request(createTestApp()).delete(`/api/inventory/${FAKE_ID}`);
    expect(response.status).to.equal(401);
  });

  // ---- feedback.routes.js ----

  it("POST /api/feedback rejects a missing order or menu item", async function () {
    const response = await request(createTestApp()).post("/api/feedback").send({ userId: FAKE_ID, rating: 5 });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("User, order, and menu item are required.");
  });

  it("GET /api/feedback/orders returns an empty group with no ids", async function () {
    const response = await request(createTestApp()).get("/api/feedback/orders");

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal({ ok: true, data: {} });
  });

  it("GET /api/feedback/rating/:menuItemId rejects a badly formatted id", async function () {
    const response = await request(createTestApp()).get("/api/feedback/rating/not-an-id");

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Failed to load rating.");
  });

  // ---- store.routes.js ----

  describe("store listing endpoints (stubbed)", function () {
    stubMethod(Store, "getActiveStores", async () => []);

    it("GET /api/stores returns the store list", async function () {
      const response = await request(createTestApp()).get("/api/stores");

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ ok: true, data: [] });
    });

    it("GET /api/stores/crowd returns crowd stats", async function () {
      const response = await request(createTestApp()).get("/api/stores/crowd");

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ ok: true, data: [] });
    });
  });

  // ---- user.routes.js ----

  it("POST /api/users rejects an unauthenticated request", async function () {
    const response = await request(createTestApp()).post("/api/users").send({ fullName: "Staff" });
    expect(response.status).to.equal(401);
  });

  it("PATCH /api/users/:id rejects a badly formatted id", async function () {
    const response = await request(createTestApp())
      .patch("/api/users/not-an-id")
      .send({ fullName: "New Name" });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("A valid user id is required.");
  });

  it("PATCH /api/role-descriptions/:role rejects an unauthenticated request", async function () {
    const response = await request(createTestApp())
      .patch("/api/role-descriptions/customer")
      .send({ description: "Buys drinks." });
    expect(response.status).to.equal(401);
  });

  describe("user listing endpoints (stubbed)", function () {
    stubMethod(User, "find", () => chainableResolve([]));
    stubMethod(RoleDescription, "find", () => chainableResolve([]));

    it("GET /api/users returns the user list", async function () {
      const response = await request(createTestApp()).get("/api/users");

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ ok: true, data: [] });
    });

    it("GET /api/role-descriptions returns role descriptions", async function () {
      const response = await request(createTestApp()).get("/api/role-descriptions");

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ ok: true, data: {} });
    });
  });

  // ---- voucher.routes.js ----

  it("POST /api/staff/vouchers rejects a missing code and title", async function () {
    const response = await request(createTestApp()).post("/api/staff/vouchers").send({});

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Code and title are required.");
  });

  it("DELETE /api/staff/vouchers/:id rejects an invalid voucher id", async function () {
    const response = await request(createTestApp()).delete("/api/staff/vouchers/not-an-id");

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("Invalid voucher ID.");
  });

  describe("GET /api/staff/vouchers (stubbed)", function () {
    stubMethod(Voucher, "find", () => chainableResolve([]));

    it("returns the full voucher list", async function () {
      const response = await request(createTestApp()).get("/api/staff/vouchers");

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ ok: true, data: [] });
    });
  });

  // ---- purchaseHistory.routes.js ----

  it("GET /api/purchase-history rejects a missing userId", async function () {
    const response = await request(createTestApp()).get("/api/purchase-history");

    expect(response.status).to.equal(400);
    expect(response.body.message).to.equal("User ID is required.");
  });

  // ---- transcribe.routes.js ----

  it("POST /api/transcribe rejects a request with no audio file", async function () {
    const response = await request(createTestApp()).post("/api/transcribe");

    expect(response.status).to.equal(400);
    expect(response.body.error).to.equal("No audio file provided");
  });
});
