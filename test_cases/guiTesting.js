// GUI Testing
// These tests are simple source-code checks for important frontend UI items.
// They do not open a browser. They only check that the expected UI code exists.
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// This helper reads a frontend file as text so the test can check for labels or routes.
function readFrontendFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

describe("GUI testing", function () {
  // Test 1: The cart page should show the cart heading.
  it("shows the shopping cart heading in the cart component", function () {
    const source = readFrontendFile("view/app/components/pages/Cart.tsx");

    expect(source).to.include("Shopping Cart");
  });

  // Test 2: The cart page should have a checkout button that goes to /checkout.
  it("has a checkout button that navigates to checkout", function () {
    const source = readFrontendFile("view/app/components/pages/Cart.tsx");

    expect(source).to.include("Proceed to checkout");
    expect(source).to.include('router.push("/checkout")');
  });

  // Test 3: The header should have a cart button that goes to /cart.
  it("has a header cart button that navigates to cart", function () {
    const source = readFrontendFile("view/app/components/layout/Header.tsx");

    expect(source).to.include("Cart");
    expect(source).to.include("router.push('/cart')");
  });

  // Test 4: The login page should have email, password, and sign in UI.
  it("has login form fields and a sign in button", function () {
    const source = readFrontendFile("view/app/login/page.tsx");

    expect(source).to.include('name="email"');
    expect(source).to.include('name="password"');
    expect(source).to.include("Sign in");
  });

  // Test 5: The layout should have an accessible button to open Avy.
  it("has an accessible Avy chat open button", function () {
    const source = readFrontendFile("view/app/components/layout/GlobalLayout.tsx");

    expect(source).to.include('aria-label="Open Avy chat assistant"');
    expect(source).to.include("Open Avy");
  });
});
