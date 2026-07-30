// Success Path & Role-Boundary Testing
// Unlike apiIntegrationTesting.js (which only checks failure paths), these tests
// run the real success path against a real in-memory MongoDB (started once for
// the whole suite by dbSetup.js): register -> login -> add to cart -> checkout
// -> track order status via chatbot. They also check the role-permission
// boundaries a staff/customer auth token is supposed to enforce.
const { expect } = require("chai");
const express = require("express");
const request = require("supertest");

const authRoutes = require("../src/routes/auth.routes");
const cartRoutes = require("../src/routes/cart.routes");
const checkoutRoutes = require("../src/routes/checkout.routes");
const chatbotRoutes = require("../src/routes/chatbot.routes");
const inventoryRoutes = require("../src/routes/inventory.routes");

const User = require("../src/models/user.model");
const Store = require("../src/models/store.model");
const MenuItem = require("../src/models/menuItem.model");
const Inventory = require("../src/models/inventory.model");
const Order = require("../src/models/order.model");

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", authRoutes);
  app.use("/api", cartRoutes);
  app.use("/api", checkoutRoutes);
  app.use("/api", chatbotRoutes);
  app.use("/api", inventoryRoutes);
  return app;
}

// Creates a store-staff account with a real, working session token, the same
// way a real login would leave the database — without going through the
// register endpoint, which only ever creates "customer" accounts.
async function createStaffWithToken(store) {
  const token = `test-token-${Math.random().toString(36).slice(2)}`;
  await User.createUserAccount({
    fullName: "Staff Member",
    email: `staff_${Date.now()}_${Math.random().toString(36).slice(2)}@driptea.com`,
    role: "store_staff",
    storeId: store._id,
    storeCode: store.storeCode,
    password: "StaffPass1@",
  });
  // Session tokens are normally minted at login; setting one directly here is
  // equivalent to "already logged in" without re-deriving the login flow.
  const user = await User.findOneAndUpdate(
    { storeCode: store.storeCode, role: "store_staff" },
    { sessionToken: token, sessionTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    { sort: { createdAt: -1 }, new: true }
  );
  return { user, token };
}

describe("success path & role-boundary testing", function () {
  this.timeout(20000);
  const originalConsoleError = console.error;

  before(function () {
    console.error = () => {};
  });

  after(function () {
    console.error = originalConsoleError;
  });

  // Test 1: A customer can register, then log in with the same credentials.
  it("registers and then logs in with the same credentials", async function () {
    const app = createTestApp();
    const email = `success_${Date.now()}@gmail.com`;

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Success Test", email, password: "GoodPass1@" });

    expect(registerResponse.status).to.equal(201);
    expect(registerResponse.body.ok).to.equal(true);
    expect(registerResponse.body.user.email).to.equal(email);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "GoodPass1@" });

    expect(loginResponse.status).to.equal(200);
    expect(loginResponse.body.ok).to.equal(true);
    expect(loginResponse.body.token).to.be.a("string").that.is.not.empty;
  });

  // Test 2: A real menu item can be added to a real cart and then read back.
  it("adds a real menu item to the cart and reads it back", async function () {
    const app = createTestApp();
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Cart Test", email: `cart_${Date.now()}@gmail.com`, password: "GoodPass1@" });
    const userId = registerResponse.body.user.id;

    const menuItem = await MenuItem.create({
      itemId: `test_${Date.now()}`,
      name: "Test Jasmine Tea",
      category: "Milk Tea",
      price: 4.5,
      status: "active",
    });

    const addResponse = await request(app)
      .post("/api/cart-items")
      .send({ userId, menuItemId: String(menuItem._id), quantity: 2 });

    expect(addResponse.status).to.equal(201);
    expect(addResponse.body.data.name).to.equal("Test Jasmine Tea");
    expect(addResponse.body.data.quantity).to.equal(2);

    const cartResponse = await request(app).get(`/api/cart-items?customerId=${userId}`);

    expect(cartResponse.status).to.equal(200);
    expect(cartResponse.body.itemCount).to.equal(1);
    expect(cartResponse.body.data[0].lineTotal).to.equal(9);
  });

  // Test 3: A full pickup checkout creates a real order that can then be fetched back.
  it("completes a pickup checkout and reads the order back", async function () {
    const app = createTestApp();
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Checkout Test", email: `checkout_${Date.now()}@gmail.com`, password: "GoodPass1@" });
    const userId = registerResponse.body.user.id;

    const store = await Store.create({
      storeCode: `TEST-${Date.now()}`,
      name: "Test Outlet",
      address: "1 Test Street",
      lat: 1.3,
      lng: 103.8,
    });

    const menuItem = await MenuItem.create({
      itemId: `test_${Date.now()}_2`,
      name: "Test Peach Tea",
      category: "Fruit Tea",
      price: 5,
      status: "active",
    });

    await request(app)
      .post("/api/cart-items")
      .send({ userId, menuItemId: String(menuItem._id), quantity: 1 });

    const checkoutResponse = await request(app)
      .post("/api/checkout")
      .send({ userId, paymentMethod: "fake_card", orderType: "pickup", storeCode: store.storeCode });

    expect(checkoutResponse.status).to.equal(200);
    expect(checkoutResponse.body.ok).to.equal(true);
    expect(checkoutResponse.body.order.status).to.equal("pending");
    expect(checkoutResponse.body.order.orderType).to.equal("pickup");

    const orderId = checkoutResponse.body.order.id;
    const orderResponse = await request(app).get(`/api/orders/${orderId}`);

    expect(orderResponse.status).to.equal(200);
    expect(orderResponse.body.data.items).to.have.lengthOf(1);
    expect(orderResponse.body.data.items[0].name).to.equal("Test Peach Tea");
  });

  // Test 4: The chatbot's live order-status card reflects a real just-placed order.
  it("tracks a real order's status through the chatbot", async function () {
    const app = createTestApp();
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Track Test", email: `track_${Date.now()}@gmail.com`, password: "GoodPass1@" });
    const userId = registerResponse.body.user.id;

    const store = await Store.create({
      storeCode: `TEST-${Date.now()}-2`,
      name: "Test Outlet 2",
      address: "2 Test Street",
      lat: 1.3,
      lng: 103.8,
    });
    const menuItem = await MenuItem.create({
      itemId: `test_${Date.now()}_3`,
      name: "Test Mango Tea",
      category: "Fruit Tea",
      price: 5,
      status: "active",
    });
    await request(app).post("/api/cart-items").send({ userId, menuItemId: String(menuItem._id), quantity: 1 });
    await request(app)
      .post("/api/checkout")
      .send({ userId, paymentMethod: "fake_card", orderType: "pickup", storeCode: store.storeCode });

    const chatResponse = await request(app)
      .post("/api/chat")
      .send({ userId, message: "track order status" });

    expect(chatResponse.status).to.equal(200);
    expect(chatResponse.body.orderStatusCard).to.exist;
    expect(chatResponse.body.orderStatusCard.orderType).to.equal("pickup");
    expect(chatResponse.body.orderStatusCard.phase).to.equal(1);
  });

  // Test 4b: The chatbot must show real progress even if the customer never
  // opened the tracking page — that page is the only thing that normally
  // advances an order's status, via a client-side timer. This backdates a real
  // order the same amount that timer would have waited, then confirms the
  // chatbot derives (and persists) the correct advanced status on its own.
  it("advances a real order's status through the chatbot without the tracking page ever being open", async function () {
    const app = createTestApp();
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Live Status Test", email: `livestatus_${Date.now()}@gmail.com`, password: "GoodPass1@" });
    const userId = registerResponse.body.user.id;

    const store = await Store.create({
      storeCode: `TEST-${Date.now()}-3`, name: "Test Outlet 3", address: "3 Test Street", lat: 1.3, lng: 103.8,
    });
    const menuItem = await MenuItem.create({
      itemId: `test_${Date.now()}_4`, name: "Test Lychee Tea", category: "Fruit Tea", price: 5, status: "active",
    });
    await request(app).post("/api/cart-items").send({ userId, menuItemId: String(menuItem._id), quantity: 1 });
    const checkoutResponse = await request(app)
      .post("/api/checkout")
      .send({ userId, paymentMethod: "fake_card", orderType: "delivery", deliveryDetails: { storeCode: store.storeCode, deliveryFee: 3 } });
    const orderId = checkoutResponse.body.order.id;

    // Simulate 12 real seconds having passed since checkout, with the tracking
    // page never opened — long enough (per the 5s/5s/10s demo timers) that a
    // delivery order should have finished preparing and gone out for delivery,
    // but not yet long enough to have arrived (stays "active", so the chatbot
    // answers deterministically instead of falling back to a real AI call).
    // { timestamps: false } stops Mongoose's own timestamps plugin from
    // immediately overwriting this explicit updatedAt back to "now".
    await Order.updateOne(
      { _id: orderId },
      { $set: { updatedAt: new Date(Date.now() - 12_000) } },
      { timestamps: false }
    );

    const chatResponse = await request(app).post("/api/chat").send({ userId, message: "track order status" });

    // Phase 3 ("Out for Delivery") proves the chatbot picked up the real
    // elapsed time rather than just echoing the still-"pending" value from
    // checkout — and the persisted DB status now agrees too.
    expect(chatResponse.status).to.equal(200);
    expect(chatResponse.body.orderStatusCard).to.exist;
    expect(chatResponse.body.orderStatusCard.phase).to.equal(3);

    const persistedOrder = await Order.findById(orderId).lean();
    expect(persistedOrder.status).to.equal("ready");
  });

  // Test 4c: The chatbot's order-status card is a self-refreshing widget, not a
  // frozen snapshot — GET /orders/:id/status-card is what it polls in the
  // background. This proves the endpoint itself advances with real elapsed
  // time, is scoped to the requesting customer, and goes quiet once the order
  // is no longer active (the widget's cue to stop polling).
  describe("GET /api/orders/:id/status-card (the widget's live-refresh endpoint)", function () {
    let userId, otherUserId, orderId;

    before(async function () {
      const app = createTestApp();
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({ fullName: "Widget Endpoint Test", email: `widgetendpoint_${Date.now()}@gmail.com`, password: "GoodPass1@" });
      userId = registerResponse.body.user.id;

      const otherRegisterResponse = await request(app)
        .post("/api/auth/register")
        .send({ fullName: "Other Customer", email: `widgetendpoint_other_${Date.now()}@gmail.com`, password: "GoodPass1@" });
      otherUserId = otherRegisterResponse.body.user.id;

      const store = await Store.create({
        storeCode: `TEST-WIDGET-${Date.now()}`, name: "Widget Test Outlet", address: "4 Test Street", lat: 1.3, lng: 103.8,
      });
      const menuItem = await MenuItem.create({
        itemId: `test_widget_${Date.now()}`, name: "Test Watermelon Tea", category: "Fruit Tea", price: 5, status: "active",
      });
      await request(app).post("/api/cart-items").send({ userId, menuItemId: String(menuItem._id), quantity: 1 });
      const checkoutResponse = await request(app)
        .post("/api/checkout")
        .send({ userId, paymentMethod: "fake_card", orderType: "pickup", storeCode: store.storeCode });
      orderId = checkoutResponse.body.order.id;
    });

    it("returns the current card for the order's own customer", async function () {
      const response = await request(createTestApp()).get(`/api/orders/${orderId}/status-card?userId=${userId}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.orderId).to.equal(orderId);
      expect(response.body.data.phase).to.equal(1);
    });

    it("advances the phase as real time passes, without any new chat message", async function () {
      await Order.updateOne(
        { _id: orderId },
        { $set: { updatedAt: new Date(Date.now() - 6_000) } },
        { timestamps: false }
      );

      const response = await request(createTestApp()).get(`/api/orders/${orderId}/status-card?userId=${userId}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.phase).to.equal(2);
    });

    it("hides the card from a different customer even with a correct order id", async function () {
      const response = await request(createTestApp()).get(`/api/orders/${orderId}/status-card?userId=${otherUserId}`);

      expect(response.status).to.equal(404);
    });

    it("returns null once the order is no longer active, so the widget knows to stop polling", async function () {
      await Order.updateOne({ _id: orderId }, { $set: { status: "completed" } });

      const response = await request(createTestApp()).get(`/api/orders/${orderId}/status-card?userId=${userId}`);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.equal(null);
    });
  });

  // Test 5 & 6: Inventory is scoped to the requesting staff member's own store.
  describe("inventory is scoped to the requester's own store", function () {
    let storeA, storeB, itemInStoreA, staffA, staffB;

    before(async function () {
      storeA = await Store.create({
        storeCode: `TEST-A-${Date.now()}`, name: "Store A", address: "A Street", lat: 1.3, lng: 103.8,
      });
      storeB = await Store.create({
        storeCode: `TEST-B-${Date.now()}`, name: "Store B", address: "B Street", lat: 1.3, lng: 103.8,
      });
      itemInStoreA = await Inventory.create({
        name: "Tapioca Pearls", quantity: 10, unit: "kg", storeId: storeA._id,
      });
      staffA = await createStaffWithToken(storeA);
      staffB = await createStaffWithToken(storeB);
    });

    it("lets a store's own staff read its inventory item", async function () {
      const response = await request(createTestApp())
        .get(`/api/inventory/${itemInStoreA._id}`)
        .set("Authorization", `Bearer ${staffA.token}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.name).to.equal("Tapioca Pearls");
    });

    it("hides another store's inventory item from staff who don't belong to it", async function () {
      const response = await request(createTestApp())
        .get(`/api/inventory/${itemInStoreA._id}`)
        .set("Authorization", `Bearer ${staffB.token}`);

      expect(response.status).to.equal(404);
      expect(response.body.message).to.equal("Inventory item not found.");
    });
  });

  // Test 7: A customer's own valid token still can't reach a staff-only endpoint.
  it("rejects a valid customer token from a staff-only endpoint", async function () {
    const app = createTestApp();
    const email = `roleboundary_${Date.now()}@gmail.com`;
    await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Role Boundary", email, password: "GoodPass1@" });
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "GoodPass1@" });
    const customerToken = loginResponse.body.token;

    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).to.equal(403);
    expect(response.body.message).to.equal("You do not have permission to perform this action.");
  });
});
