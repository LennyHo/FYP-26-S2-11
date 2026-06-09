// Database Testing
// These are simple Mongoose schema tests.
// They do not connect to a real database; they only validate model rules.
const { expect } = require("chai");
const mongoose = require("mongoose");

const User = require("../src/models/user.model");
const MenuItem = require("../src/models/menuItem.model");
const CartItem = require("../src/models/cartItem.model");
const Payment = require("../src/models/payment.model");

// This helper returns a field validation error from a Mongoose document.
function getValidationError(document, fieldName) {
  return document.validateSync()?.errors?.[fieldName] || null;
}

describe("database testing", function () {
  // Test 1: The user model should use the users collection.
  it("uses users collection for User model", function () {
    expect(User.collection.name).to.equal("users");
  });

  // Test 2: User email should be trimmed and converted to lowercase.
  it("trims and lowercases user email", function () {
    const user = new User({
      fullName: "Test User",
      email: "  TEST@EXAMPLE.COM  ",
      passwordHash: "hash",
    });

    expect(user.email).to.equal("test@example.com");
  });

  // Test 3: Menu item should require a price.
  it("requires price for menu item", function () {
    const item = new MenuItem({
      itemId: "test001",
      name: "Test Drink",
      category: "Milk Tea",
    });

    expect(getValidationError(item, "price")).to.exist;
  });

  // Test 4: Cart item should require a user id.
  it("requires user id for cart item", function () {
    const item = new CartItem({
      menuItemId: new mongoose.Types.ObjectId(),
      name: "Test Drink",
      unitPrice: 4.5,
      lineTotal: 4.5,
    });

    expect(getValidationError(item, "userId")).to.exist;
  });

  // Test 5: Payment status should only accept allowed values.
  it("rejects invalid payment status", function () {
    const payment = new Payment({
      orderId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      status: "unknown",
    });

    expect(getValidationError(payment, "status")).to.exist;
  });
});
