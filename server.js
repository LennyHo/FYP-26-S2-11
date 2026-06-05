const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectMongo } = require("./src/config/mongo");
const { initializeSeedUsers } = require("./src/services/auth.service");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// User Story 13: View Menu
const menuRoutes = require("./src/routes/menu.routes");
app.use("/api", menuRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "DripTea backend",
  });
});


// User Story 14: Add Cart Item
const cartRoutes = require("./src/routes/cart.routes");
app.use("/api", cartRoutes);

// User Story 23: Checkout Cart
const checkoutRoutes = require("./src/routes/checkout.routes");
app.use("/api", checkoutRoutes);

// Chatbot routes
const chatbotRoutes = require("./src/routes/chatbot.routes");
app.use("/api", chatbotRoutes);

// DripTea routes (authentication, users, etc.)
const authRoutes = require("./src/routes/auth.routes");
app.use("/api", authRoutes);
console.log("[ROUTES] Auth routes mounted");

const userRoutes = require("./src/routes/user.routes");
app.use("/api", userRoutes);
console.log("[ROUTES] User routes mounted");

// Test
app.post("/api/chat-test", (req, res) => {
  res.json({ ok: true, body: req.body });
});

async function startServer() {
  try {
    await connectMongo();
    await initializeSeedUsers();

    app.get("/", (req, res) => {
      res.send("DripTea backend is running");
    });

    app.listen(PORT, () => {
      console.log(`DripTea backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("[Startup] Failed to start backend:", error);
    process.exit(1);
  }
}

startServer();