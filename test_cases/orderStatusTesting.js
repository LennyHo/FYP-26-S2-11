// Order Status Testing
// These tests check the pickup/delivery order-status tracking logic in the chatbot:
// whether a message is read as a live-status question, a purchase-history question,
// or a general delivery FAQ, plus the 4-step delivery status card. They call the
// real exported functions directly and do not connect to MongoDB or call the AI.
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

const chatbotService = require("../src/services/chatbot.service");

// This helper reads a source file as text so a test can check that specific code exists.
function readSourceFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

describe("order status testing", function () {
  // Test 1: Direct, natural, and delivery-flavoured phrasings should all be read as tracking requests.
  it("recognizes direct and natural order-status phrasings", function () {
    expect(chatbotService.isTrackOrderRequest("order status")).to.be.true;
    expect(chatbotService.isTrackOrderRequest("what is my order status")).to.be.true;
    expect(chatbotService.isTrackOrderRequest("where is my order")).to.be.true;
    expect(chatbotService.isTrackOrderRequest("where is my delivery")).to.be.true;
  });

  // Test 2: Colloquial "drink" phrasing should count as an order-tracking request too.
  it("recognizes colloquial 'drink' phrasing as an order-tracking request", function () {
    expect(chatbotService.isTrackOrderRequest("wheres my drink")).to.be.true;
    expect(chatbotService.isTrackOrderRequest("is my drink out for delivery yet")).to.be.true;
  });

  // Test 3: Common typos ("oder", "satus") should still resolve to a tracking request.
  it("tolerates common order/status typos", function () {
    expect(chatbotService.isTrackOrderRequest("wheres my oder")).to.be.true;
    expect(chatbotService.isTrackOrderRequest("delivery satus")).to.be.true;
  });

  // Test 4: A plain status question must not be misread as a purchase-history request.
  it("does not treat live status questions as purchase history", function () {
    expect(chatbotService.isPurchaseHistory("what is my order status")).to.be.false;
    expect(chatbotService.isPurchaseHistory("where is my order")).to.be.false;
    expect(chatbotService.isPurchaseHistory("how's my order going")).to.be.false;
  });

  // Test 5: Genuine purchase-history questions should still be recognized as such.
  it("still recognizes genuine purchase-history questions", function () {
    expect(chatbotService.isPurchaseHistory("what did I order last time")).to.be.true;
    expect(chatbotService.isPurchaseHistory("show me my past orders")).to.be.true;
  });

  // Test 6: Personal delivery-tracking questions must not be caught by the general delivery FAQ handler.
  it("does not let the delivery FAQ handler intercept personal tracking questions", function () {
    expect(chatbotService.isDeliveryOrPaymentQuestion("where is my delivery")).to.be.false;
    expect(chatbotService.isDeliveryOrPaymentQuestion("can you check my delivery status please")).to.be.false;
  });

  // Test 7: General delivery/payment FAQ questions should still be recognized.
  it("still recognizes general delivery and payment FAQ questions", function () {
    expect(chatbotService.isDeliveryOrPaymentQuestion("do you deliver to Tampines")).to.be.true;
    expect(chatbotService.isDeliveryOrPaymentQuestion("what payment methods do you accept")).to.be.true;
  });

  // Test 8: Known contractions and domain typos should be corrected before intent matching.
  it("normalizes common contractions and typos", function () {
    expect(chatbotService.normalizeForOrderIntent("wheres my oder")).to.equal("where is my order");
    expect(chatbotService.normalizeForOrderIntent("delivery satus")).to.equal("delivery status");
  });

  // Test 9: Delivery orders should define a 4th "Delivered" step, matching the tracking page.
  it("defines a 4th delivery step label", function () {
    const source = readSourceFile("src/services/chatbot.service.js");

    expect(source).to.include("orderStatusStepDelivery4");
    expect(source).to.include("t('orderStatusStepDelivery4')");
  });

  // Test 10: The status card component should render however many steps it's given, not a hardcoded 3.
  it("renders the order status card with a dynamic number of steps", function () {
    const source = readSourceFile("view/app/components/ui/OrderStatusCard.tsx");

    expect(source).to.include("stepLabels: string[]");
    expect(source).to.not.include("STEP_COLUMNS = [1, 3, 5]");
  });

  // Test 11: Gemini's system prompt must refuse to invent order details it wasn't given.
  it("instructs the AI to never fabricate order details", function () {
    const source = readSourceFile("src/services/prompt.service.js");

    expect(source).to.include("never fabricate order details");
  });
});
