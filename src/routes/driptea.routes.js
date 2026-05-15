// done by "HDC" - MongoDB-backed DripTea collections and customer flow routes.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { ObjectId } = require("mongodb");
const { connectMongo, getDb } = require("../config/mongo");

const router = express.Router();
let preparationPromise = null;

const COLLECTIONS = [
  "users",
  "menu_items",
  "orders",
  "order_items",
  "cart_items",
  "payments",
  "chatbot_sessions",
];

const seedUsers = [
  {
    fullName: "DripTea Admin",
    email: "admin@driptea.com",
    password: "Admin@123",
    role: "user_admin",
  },
  {
    fullName: "DripTea Store Staff",
    email: "staff@driptea.com",
    password: "Staff@123",
    role: "store_staff",
  },
  {
    fullName: "DripTea Customer",
    email: "customer@driptea.com",
    password: "Customer@123",
    role: "customer",
  },
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function toObjectId(value) {
  if (!ObjectId.isValid(String(value || ""))) {
    return null;
  }

  return new ObjectId(String(value));
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");

  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) {
    return false;
  }

  const attemptedHash = crypto
    .pbkdf2Sync(String(password), user.passwordSalt, 120000, 64, "sha512")
    .toString("hex");

  return crypto.timingSafeEqual(Buffer.from(attemptedHash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function publicUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function getNutriGrade(sugarPer100ml) {
  if (sugarPer100ml <= 1) return "A";
  if (sugarPer100ml <= 5) return "B";
  if (sugarPer100ml <= 10) return "C";
  return "D";
}

function loadSeedMenuItems() {
  const menuPath = path.resolve(process.cwd(), "data", "menu.json");
  const menuData = JSON.parse(fs.readFileSync(menuPath, "utf8"));
  const sugarLevels = Object.values(menuData.modifiers?.sugar_levels || {}).map((item) => item.name);
  const iceLevels = Object.values(menuData.modifiers?.ice_levels || {}).map((item) => item.name);
  const toppings = Object.values(menuData.modifiers?.toppings || {}).map((item) => ({
    name: item.name,
    price: item.price,
    addedSugarG: item.added_sugar_g,
    addedCalories: item.added_calories,
  }));

  return (menuData.beverages || []).map((item) => {
    const sugarPer100ml = (Number(item.base_sugar_g || 0) / Number(item.base_volume_ml || 500)) * 100;

    return {
      itemId: item.id,
      name: item.name,
      image: item.image?.startsWith("/") ? item.image : `/${item.image || ""}`,
      category: item.category,
      tags: item.tags || [],
      price: Number(item.price || 0),
      description: item.description,
      customizationOptions: [
        { name: "Sugar Level", type: "single", values: sugarLevels },
        { name: "Ice Level", type: "single", values: iceLevels },
        { name: "Toppings", type: "multiple", values: toppings },
      ],
      nutritionInfo: {
        baseVolumeMl: Number(item.base_volume_ml || 500),
        baseCalories: Number(item.base_calories || 0),
        baseSugarG: Number(item.base_sugar_g || 0),
        nutriGrade: getNutriGrade(sugarPer100ml),
      },
      status: "active",
      updatedAt: new Date(),
    };
  });
}

async function ensureDripTeaCollections(db) {
  const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(existingCollections.map((collection) => collection.name));

  for (const collectionName of COLLECTIONS) {
    if (!existingNames.has(collectionName)) {
      await db.createCollection(collectionName);
    }
  }

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ role: 1, status: 1 }),
    db.collection("menu_items").createIndex({ itemId: 1 }, { unique: true }),
    db.collection("menu_items").createIndex({ category: 1, status: 1 }),
    db.collection("orders").createIndex({ userId: 1, status: 1 }),
    db.collection("order_items").createIndex({ orderId: 1 }),
    db.collection("cart_items").createIndex({ userId: 1, createdAt: 1 }),
    db.collection("payments").createIndex({ orderId: 1 }),
    db.collection("chatbot_sessions").createIndex({ userId: 1, updatedAt: -1 }),
  ]);

  for (const seedUser of seedUsers) {
    const email = normalizeEmail(seedUser.email);
    const existingUser = await db.collection("users").findOne({ email });

    if (!existingUser) {
      await db.collection("users").insertOne({
        fullName: seedUser.fullName,
        email,
        role: seedUser.role,
        status: "active",
        ...createPasswordRecord(seedUser.password),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  const seedMenuItems = loadSeedMenuItems();
  for (const item of seedMenuItems) {
    await db.collection("menu_items").updateOne(
      { itemId: item.itemId },
      {
        $setOnInsert: {
          createdAt: new Date(),
        },
        $set: item,
      },
      { upsert: true }
    );
  }
}

async function getPreparedDb() {
  const db = getDb() || await connectMongo();

  if (!db) {
    const error = new Error("MongoDB is not configured. Set MONGODB_URI in .env and restart the backend.");
    error.statusCode = 503;
    throw error;
  }

  if (!preparationPromise) {
    preparationPromise = ensureDripTeaCollections(db);
  }

  await preparationPromise;
  return db;
}

function toPublicCartItem(item) {
  return {
    id: String(item._id),
    userId: String(item.userId),
    menuItemId: item.menuItemId ? String(item.menuItemId) : null,
    menuItemCode: item.menuItemCode,
    name: item.name,
    image: item.image,
    category: item.category,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    customization: item.customization || {},
    createdAt: item.createdAt,
  };
}

// done by "HDC" - public staff order shape for order queue display.
function toPublicOrder(order, user, items, payment) {
  return {
    id: String(order._id),
    orderNo: order.orderNo,
    userId: String(order.userId),
    customer: user?.fullName || user?.email || "Customer",
    status: order.status,
    orderType: order.orderType,
    totalAmount: Number(order.totalAmount || 0),
    currency: order.currency || "SGD",
    paymentStatus: payment?.status || "unpaid",
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal || 0),
      customization: item.customization || {},
    })),
  };
}
// end done by "HDC"

router.get("/health/mongo", async (_req, res, next) => {
  try {
    const db = await getPreparedDb();
    await db.command({ ping: 1 });

    res.json({
      ok: true,
      connected: true,
      collections: COLLECTIONS,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/mongo/setup", async (_req, res, next) => {
  try {
    const db = await getPreparedDb();
    const counts = {};

    for (const collectionName of COLLECTIONS) {
      counts[collectionName] = await db.collection(collectionName).countDocuments();
    }

    res.status(201).json({
      ok: true,
      message: "MongoDB collections are ready for DripTea.",
      collections: counts,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const fullName = String(req.body?.fullName || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!fullName || !email || password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "Full name, valid email, and password of at least 6 characters are required.",
      });
    }

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "An account with this email already exists.",
      });
    }

    const result = await db.collection("users").insertOne({
      fullName,
      email,
      role: "customer",
      status: "active",
      ...createPasswordRecord(password),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await db.collection("users").findOne({ _id: result.insertedId });

    return res.status(201).json({
      ok: true,
      user: publicUser(user),
      token: crypto.randomBytes(24).toString("hex"),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const user = await db.collection("users").findOne({ email });

    if (!user || !verifyPassword(password, user)) {
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        ok: false,
        message: "This account is suspended.",
      });
    }

    return res.json({
      ok: true,
      user: publicUser(user),
      token: crypto.randomBytes(24).toString("hex"),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/menu-items", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const status = String(req.query.status || "active");
    const query = status === "all" ? {} : { status };
    const items = await db.collection("menu_items").find(query).sort({ category: 1, itemId: 1 }).toArray();

    res.json({
      ok: true,
      data: items.map((item) => ({
        id: item.itemId,
        mongoId: String(item._id),
        name: item.name,
        image: item.image,
        category: item.category,
        tags: item.tags,
        price: item.price,
        description: item.description,
        customizationOptions: item.customizationOptions,
        nutritionInfo: item.nutritionInfo,
        status: item.status,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/cart-items", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const userId = toObjectId(req.query.userId);

    if (!userId) {
      return res.status(400).json({ ok: false, message: "A valid userId is required." });
    }

    const items = await db.collection("cart_items").find({ userId }).sort({ createdAt: 1 }).toArray();

    return res.json({
      ok: true,
      data: items.map(toPublicCartItem),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/cart-items", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const userId = toObjectId(req.body?.userId);
    const quantity = Math.max(1, Number(req.body?.quantity || 1));
    const menuItemId = String(req.body?.menuItemId || "").trim();
    const menuItem = menuItemId
      ? await db.collection("menu_items").findOne({
          $or: [
            { itemId: menuItemId },
            ...(ObjectId.isValid(menuItemId) ? [{ _id: new ObjectId(menuItemId) }] : []),
          ],
          status: "active",
        })
      : null;

    if (!userId) {
      return res.status(400).json({ ok: false, message: "A valid userId is required." });
    }

    const unitPrice = Number(req.body?.unitPrice || menuItem?.price || 0);
    const lineTotal = Number(req.body?.lineTotal || unitPrice * quantity);
    const cartItem = {
      userId,
      menuItemId: menuItem?._id || null,
      menuItemCode: menuItem?.itemId || menuItemId || null,
      name: String(req.body?.name || menuItem?.name || "Custom Drink").trim(),
      image: String(req.body?.image || menuItem?.image || "").trim(),
      category: String(req.body?.category || menuItem?.category || "").trim(),
      quantity,
      unitPrice,
      lineTotal,
      customization: req.body?.customization && typeof req.body.customization === "object"
        ? req.body.customization
        : {},
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("cart_items").insertOne(cartItem);

    return res.status(201).json({
      ok: true,
      data: toPublicCartItem({ ...cartItem, _id: result.insertedId }),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/cart-items/:id", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const cartItemId = toObjectId(req.params.id);

    if (!cartItemId) {
      return res.status(400).json({ ok: false, message: "A valid cart item id is required." });
    }

    await db.collection("cart_items").deleteOne({ _id: cartItemId });

    return res.json({
      ok: true,
      deletedId: String(cartItemId),
    });
  } catch (error) {
    next(error);
  }
});

// done by "HDC" - staff dashboard order queue reads real orders from MongoDB.
router.get("/orders", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const status = String(req.query.status || "all").trim().toLowerCase();
    const query = status === "all" ? {} : { status };
    const orders = await db.collection("orders").find(query).sort({ createdAt: -1 }).limit(100).toArray();
    const orderIds = orders.map((order) => order._id);
    const userIds = [...new Set(orders.map((order) => String(order.userId)))].map((id) => new ObjectId(id));
    const [users, orderItems, payments] = await Promise.all([
      userIds.length > 0 ? db.collection("users").find({ _id: { $in: userIds } }).toArray() : [],
      orderIds.length > 0 ? db.collection("order_items").find({ orderId: { $in: orderIds } }).toArray() : [],
      orderIds.length > 0 ? db.collection("payments").find({ orderId: { $in: orderIds } }).toArray() : [],
    ]);
    const usersById = new Map(users.map((user) => [String(user._id), user]));
    const paymentsByOrderId = new Map(payments.map((payment) => [String(payment.orderId), payment]));
    const itemsByOrderId = new Map();

    for (const item of orderItems) {
      const key = String(item.orderId);
      const existing = itemsByOrderId.get(key) || [];
      existing.push(item);
      itemsByOrderId.set(key, existing);
    }

    return res.json({
      ok: true,
      data: orders.map((order) => toPublicOrder(
        order,
        usersById.get(String(order.userId)),
        itemsByOrderId.get(String(order._id)) || [],
        paymentsByOrderId.get(String(order._id))
      )),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const orderId = toObjectId(req.params.id);
    const status = String(req.body?.status || "").trim().toLowerCase();
    const allowedStatuses = new Set(["pending", "preparing", "ready", "completed"]);

    if (!orderId || !allowedStatuses.has(status)) {
      return res.status(400).json({
        ok: false,
        message: "A valid order id and status are required.",
      });
    }

    await db.collection("orders").updateOne(
      { _id: orderId },
      { $set: { status, updatedAt: new Date() } }
    );

    const updatedOrder = await db.collection("orders").findOne({ _id: orderId });

    return res.json({
      ok: true,
      data: {
        id: String(updatedOrder._id),
        status: updatedOrder.status,
      },
    });
  } catch (error) {
    next(error);
  }
});
// end done by "HDC"

router.post("/checkout", async (req, res, next) => {
  try {
    const db = await getPreparedDb();
    const userId = toObjectId(req.body?.userId);
    const paymentMethod = String(req.body?.paymentMethod || "fake_card").trim();

    if (!userId) {
      return res.status(400).json({ ok: false, message: "A valid userId is required." });
    }

    const cartItems = await db.collection("cart_items").find({ userId }).sort({ createdAt: 1 }).toArray();
    if (cartItems.length === 0) {
      return res.status(400).json({ ok: false, message: "Your cart is empty." });
    }

    const now = new Date();
    const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    const orderResult = await db.collection("orders").insertOne({
      userId,
      orderNo: `DT-${Date.now().toString(36).toUpperCase()}`,
      orderType: "manual",
      status: "pending",
      totalAmount,
      currency: "SGD",
      createdAt: now,
      updatedAt: now,
    });

    const orderItems = cartItems.map((item) => ({
      orderId: orderResult.insertedId,
      userId,
      menuItemId: item.menuItemId || null,
      menuItemCode: item.menuItemCode || null,
      name: item.name,
      image: item.image,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      customization: item.customization || {},
      createdAt: now,
    }));

    await db.collection("order_items").insertMany(orderItems);

    const paymentResult = await db.collection("payments").insertOne({
      orderId: orderResult.insertedId,
      userId,
      method: paymentMethod,
      status: "paid",
      amount: totalAmount,
      currency: "SGD",
      transactionRef: `FAKE-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
      createdAt: now,
    });

    await db.collection("cart_items").deleteMany({ userId });

    return res.status(201).json({
      ok: true,
      order: {
        id: String(orderResult.insertedId),
        status: "pending",
        totalAmount,
        orderType: "manual",
      },
      payment: {
        id: String(paymentResult.insertedId),
        status: "paid",
        method: paymentMethod,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.use((err, _req, res, _next) => {
  console.error("[HDC API]", err);
  res.status(err.statusCode || 500).json({
    ok: false,
    message: err.message || "DripTea API error.",
  });
});

module.exports = router;
// end done by "HDC"
