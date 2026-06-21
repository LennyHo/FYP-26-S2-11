// Functional Testing
// These tests check simple backend rules, such as rejecting bad price or bad status.
// They do not connect to MongoDB.
const { expect } = require("chai");
const mongoose = require("mongoose");

const menuController = require("../src/controllers/menu.controller");
const User = require("../src/models/user.model");
const CartItem = require("../src/models/cartItem.model");
const Order = require("../src/models/order.model");

// This helper creates a fake Express response object for controller tests.
function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// This helper checks that a service function rejects with the expected error.
async function expectRejectsWith(action, expectedMessage, expectedStatusCode) {
  let caughtError = null;

  try {
    await action();
  } catch (error) {
    caughtError = error;
  }

  expect(caughtError).to.be.instanceOf(Error);
  expect(caughtError.message).to.equal(expectedMessage);

  if (expectedStatusCode) {
    expect(caughtError.statusCode).to.equal(expectedStatusCode);
  }
}

describe("functional testing", function () {
  // Test 1: Admin/staff should not be able to create a drink with negative price.
  it("rejects a menu item when price is below 0", async function () {
    const req = {
      body: {
        name: "Test Milk Tea",
        category: "Milk Tea",
        price: -1,
      },
    };
    const res = createMockResponse();

    await menuController.createMenuItem(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.message).to.equal("Name, category, and valid price are required.");
  });

  // Test 2: Menu status should only be active or inactive.
  it("rejects a menu status that is not active or inactive", async function () {
    const req = {
      params: { id: "b001" },
      body: { status: "deleted" },
    };
    const res = createMockResponse();

    await menuController.updateMenuItemStatus(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.message).to.equal("Status must be active or inactive.");
  });

  // Test 3: Register should reject a password shorter than 6 characters.
  it("rejects register when password is shorter than 6 characters", async function () {
    await expectRejectsWith(
      () =>
        User.register({
          fullName: "Test User",
          email: "test@example.com",
          password: "123",
        }),
      "Full name, valid email, and password of at least 6 characters are required.",
      400
    );
  });

  // Test 4: Cart functions should reject an invalid customer id.
  it("rejects add to cart when customer id is invalid", async function () {
    await expectRejectsWith(
      () => CartItem.addToCart("not-an-id", "b001"),
      "Invalid customerId."
    );
  });

  // Test 5: Order status should only allow the statuses defined in the model.
  it("rejects invalid order status", function () {
    const order = new Order({
      userId: new mongoose.Types.ObjectId(),
      orderNo: "9999",
      totalAmount: 4.5,
      status: "unknown",
    });

    const error = order.validateSync();

    expect(error.errors.status).to.exist;
  });
});
