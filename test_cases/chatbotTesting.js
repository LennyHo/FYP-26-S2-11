// Chatbot Testing
// These tests check simple chatbot behaviour and chatbot wiring.
// They avoid real AI calls and do not connect to MongoDB.
const { expect } = require("chai");

const chatbotService = require("../src/services/chatbot.service");
const chatbotController = require("../src/controllers/chatbot.controller");
const chatbotRoutes = require("../src/routes/chatbot.routes");

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
