const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectMongo } = require("./src/config/mongo");
const User = require("./src/models/user.model");
const Inventory = require("./src/models/inventory.model");
const Voucher = require("./src/models/voucher.model");
const Store = require("./src/models/store.model");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "35mb" }));

// Backend Test
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "DripTea backend",
  });
});

// Chatbot routes
const chatbotRoutes = require("./src/routes/chatbot.routes");
app.use("/api", chatbotRoutes);

// Voice transcription (ElevenLabs Scribe)
const transcribeRoutes = require("./src/routes/transcribe.routes");
app.use("/api", transcribeRoutes);

// View Menu
const menuRoutes = require("./src/routes/menu.routes");
app.use("/api", menuRoutes);

// Add Cart Item
const cartRoutes = require("./src/routes/cart.routes");
app.use("/api", cartRoutes);

// Checkout Cart
const checkoutRoutes = require("./src/routes/checkout.routes");
app.use("/api", checkoutRoutes);

// View Purchase History
const purchaseHistoryRoutes = require("./src/routes/purchaseHistory.routes");
app.use("/api", purchaseHistoryRoutes);

// Feedback
const feedbackRoutes = require("./src/routes/feedback.routes");
app.use("/api", feedbackRoutes);

// Store Locator
const storeRoutes = require("./src/routes/store.routes");
app.use("/api", storeRoutes);

// DripTea routes (authentication, users, etc.)
const authRoutes = require("./src/routes/auth.routes");
app.use("/api", authRoutes);

// User Admin Management Routes
const userRoutes = require("./src/routes/user.routes");
app.use("/api", userRoutes);

// Store Staff Inventory Management
const inventoryRoutes = require("./src/routes/inventory.routes");
app.use("/api", inventoryRoutes);

// Store Staff Voucher Management
const voucherRoutes = require("./src/routes/voucher.routes");
app.use("/api", voucherRoutes);

// Test
app.post("/api/chat-test", (req, res) => {
  res.json({ ok: true, body: req.body });
});

async function startServer() {
  try {
    await connectMongo();
    await Store.initializeSeedStores();
    await User.initializeSeedUsers();
    await Inventory.initializeSeedInventory();
    await Voucher.initializeSeedVouchers();

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