// Chatbot Testing
// These tests check simple chatbot behaviour and chatbot wiring.
// They avoid real AI calls and do not connect to MongoDB.
const { expect } = require("chai");

const chatbotService = require("../src/services/chatbot.service");
const chatbotController = require("../src/controllers/chatbot.controller");
const chatbotRoutes = require("../src/routes/chatbot.routes");
const { buildIntentVocabulary, correctTypos, editDistance } = require("../src/services/textNormalizer");

// This helper creates a fake Express response object for chatbot controller tests.
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

describe("chatbot testing", function () {
  const originalHandleChatMessage = chatbotService.handleChatMessage;
  const originalConsoleError = console.error;

  // The chatbot controller logs expected test errors, so this keeps test output clean.
  before(function () {
    console.error = () => {};
  });

  // Restore the real chatbot service after each test that changes it.
  afterEach(function () {
    chatbotService.handleChatMessage = originalHandleChatMessage;
  });

  // Restore console.error after this chatbot test group finishes.
  after(function () {
    console.error = originalConsoleError;
  });

  // Test 1: Empty chatbot messages should get a simple warning reply.
  it("replies when the user sends an empty message", async function () {
    const result = await chatbotService.handleChatMessage({ message: "" });

    expect(result.reply).to.equal("Please send a message.");
    expect(result.system_action).to.deep.equal({ ui_navigation: "none" });
  });

  // Test 2: The chatbot controller should return the chatbot service result.
  it("returns chatbot service output from the controller", async function () {
    chatbotService.handleChatMessage = async () => ({
      reply: "Hello from test",
      system_action: { ui_navigation: "none" },
    });

    const req = { body: { message: "hello", conversationId: "test-1", userId: "user-1" } };
    const res = createMockResponse();

    await chatbotController.handleChat(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.reply).to.equal("Hello from test");
  });

  // Test 3: The chatbot controller should return a fallback message if the service fails.
  it("returns fallback message when chatbot service throws an error", async function () {
    chatbotService.handleChatMessage = async () => {
      throw new Error("test failure");
    };

    const req = { body: { message: "hello" } };
    const res = createMockResponse();

    await chatbotController.handleChat(req, res);

    expect(res.statusCode).to.equal(500);
    expect(res.body.reply).to.equal("Kitchen is busy, please try again.");
  });

  // Test 4: The chatbot route should use POST /chat.
  it("has a POST /chat route", function () {
    const routes = chatbotRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).to.deep.equal([{ path: "/chat", methods: ["post"] }]);
  });

  // Test 5: The chatbot source should contain the login prompt for add-to-cart.
  it("has a login prompt before chatbot cart actions", function () {
    const serviceText = chatbotService.handleChatMessage.toString();

    expect(serviceText).to.include("Please log in first before I add this to your cart.");
  });
});

// Typo tolerance for intent matching. These run on pure functions, so no AI calls
// and no MongoDB connection are needed.
describe("chatbot typo tolerance", function () {
  // Menu words are supplied here the same way the service passes live drink names.
  const vocabulary = buildIntentVocabulary([
    "osmanthus", "milk", "tea", "matcha", "latte", "oolong", "lychee", "green",
    "strawberry", "classic", "jasmine", "mango", "fruit",
  ]);

  const fix = (message) => correctTypos(message, vocabulary);

  // Test 6: Misspelled keywords should be repaired so intent matching still fires.
  it("repairs misspelled keywords", function () {
    const cases = [
      ["What voocher I have?", "What voucher I have?"],
      ["Ehat vouchers I haev", "What vouchers I have"],
      ["track my oder", "track my order"],
      ["show my purchse histroy", "show my purchase history"],
      ["I want a osmanthos milk tea", "I want a osmanthus milk tea"],
      ["make it lrage with peral", "make it large with pearl"],
    ];

    cases.forEach(([input, expected]) => {
      expect(fix(input)).to.equal(expected);
    });
  });

  // Test 7: Correctly spelled messages must pass through untouched.
  it("leaves correctly spelled messages alone", function () {
    const messages = [
      "What vouchers do I have?",
      "I want a large osmanthus milk tea with less sugar",
      "track my order",
    ];

    messages.forEach((message) => {
      expect(fix(message)).to.equal(message);
    });
  });

  // Test 8: Codes, order numbers and prices carry real data and must never be rewritten.
  it("never rewrites codes, numbers or prices", function () {
    const messages = [
      "Apply HALF50 to my order",
      "Where is order #0187",
      "BOGO2026 please",
      "I spent S$ 12.00 today",
    ];

    messages.forEach((message) => {
      expect(fix(message)).to.equal(message);
    });
  });

  // Test 9: Ordinary words that are not keywords should survive unchanged.
  it("leaves ordinary words that are not keywords", function () {
    const messages = [
      "that drink was delicious",
      "my friend liked it",
      "I spent S$ 12.00 today",
      "deliver to my house",
      "that was cool",
    ];

    messages.forEach((message) => {
      expect(fix(message)).to.equal(message);
    });
  });

  // Test 10: Transposed letters count as a single edit.
  it("treats a swapped pair of letters as one edit", function () {
    expect(editDistance("histroy", "history", 2)).to.equal(1);
    expect(editDistance("haev", "have", 2)).to.equal(1);
  });
});
