// done by "HDC" - MongoDB-backed DripTea collections and customer flow routes.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Types } = require("mongoose");
const { connectMongo, getDb } = require("../config/mongo");
const { env } = require("../config/env");
const {
  COLLECTIONS,
  User,
  MenuItem,
  CartItem,
  Order,
  OrderItem,
  Payment,
  ChatbotSession,
  Voucher,
} = require("../models/driptea.models");

const router = express.Router();
let preparationPromise = null;
const DRIPTEA_MODELS = [User, MenuItem, Order, OrderItem, CartItem, Payment, ChatbotSession, Voucher];

function getMongoHostLabel() {
  if (!env.mongodbUri) return "(MONGODB_URI not set)";

  try {
    const parsed = new URL(env.mongodbUri);
    return parsed.host || "(MongoDB host not reported)";
  } catch {
    return "(MongoDB host not parseable)";
  }
}

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
  if (!Types.ObjectId.isValid(String(value || ""))) {
    return null;
  }

  return new Types.ObjectId(String(value));
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

async function ensureModelCollection(model) {
  try {
    await model.createCollection();
  } catch (error) {
    if (error.code !== 48 && error.codeName !== "NamespaceExists") {
      throw error;
    }
  }
}

async function ensureDripTeaCollections() {
  await Promise.all(DRIPTEA_MODELS.map((model) => ensureModelCollection(model)));
  await Promise.all(DRIPTEA_MODELS.map((model) => model.createIndexes()));

  for (const seedUser of seedUsers) {
    const email = normalizeEmail(seedUser.email);
    const existingUser = await User.findOne({ email }).lean();

    if (!existingUser) {
      await User.create({
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
    await MenuItem.updateOne(
      { itemId: item.itemId },
      {
        $set: item,
      },
      { upsert: true, runValidators: true }
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
    preparationPromise = ensureDripTeaCollections();
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

async function getActiveCustomerForCart(userId) {
  const user = await User.findById(userId).lean();

  if (!user) {
    const error = new Error("Cart user was not found. Please log in again.");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "customer" || user.status !== "active") {
    const error = new Error("Only active customer accounts can use the cart.");
    error.statusCode = 403;
    throw error;
  }

  return user;
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
    const counts = {};
    await getPreparedDb();

    counts.users = await User.countDocuments();
    counts.menu_items = await MenuItem.countDocuments();
    counts.orders = await Order.countDocuments();
    counts.order_items = await OrderItem.countDocuments();
    counts.cart_items = await CartItem.countDocuments();
    counts.payments = await Payment.countDocuments();
    counts.chatbot_sessions = await ChatbotSession.countDocuments();
    counts.vouchers = await Voucher.countDocuments();

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
    await getPreparedDb();
    const fullName = String(req.body?.fullName || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!fullName || !email || password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "Full name, valid email, and password of at least 6 characters are required.",
      });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      fullName,
      email,
      role: "customer",
      status: "active",
      ...createPasswordRecord(password),
    });

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
    console.log(`[Auth Login] Connected to MongoDB database "${db.databaseName}".`);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const user = await User.findOne({ email }).lean();

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

router.get(["/menu-items", "/menu"], async (req, res, next) => {
  try {
    await getPreparedDb();
    const status = String(req.query.status || "active");
    const query = status === "all" ? {} : { status };
    const items = await MenuItem.find(query).sort({ category: 1, itemId: 1 }).lean();

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
    await getPreparedDb();
    const userId = toObjectId(req.query.userId);

    if (!userId) {
      return res.status(400).json({ ok: false, message: "A valid userId is required." });
    }

    await getActiveCustomerForCart(userId);
    const items = await CartItem.find({ userId }).sort({ createdAt: 1 }).lean();

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
      ? await MenuItem.findOne({
          $or: [
            { itemId: menuItemId },
            ...(Types.ObjectId.isValid(menuItemId) ? [{ _id: new Types.ObjectId(menuItemId) }] : []),
          ],
          status: "active",
        }).lean()
      : null;

    if (!userId) {
      return res.status(400).json({ ok: false, message: "A valid userId is required." });
    }

    const cartUser = await getActiveCustomerForCart(userId);
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

    const result = await CartItem.create(cartItem);
    const storage = {
      type: "mongodb",
      database: db.databaseName,
      collection: "cart_items",
      mongoHost: getMongoHostLabel(),
    };
    const forwardedProto = req.get("x-forwarded-proto");
    const forwardedHost = req.get("x-forwarded-host");
    const backendHost = forwardedHost || req.get("host") || null;
    const backend = {
      host: backendHost,
      url: backendHost ? `${forwardedProto || req.protocol}://${backendHost}` : null,
      origin: req.get("origin") || null,
      renderService: process.env.RENDER_SERVICE_NAME || null,
      renderExternalUrl: process.env.RENDER_EXTERNAL_URL || null,
    };

    console.log(
      `[DripTea add to cart] SUCCESS backend=${backend.renderExternalUrl || backend.url || "(not reported)"} mongoHost=${storage.mongoHost} storage=${storage.type}:${storage.database}.${storage.collection} cartItemId=${String(result._id)} userId=${String(userId)} userEmail=${cartUser.email} item="${result.name}" quantity=${result.quantity}`
    );

    return res.status(201).json({
      ok: true,
      data: toPublicCartItem(result),
      storage,
      backend,
    });
  } catch (error) {
    next(error);
  }
});

// Vouchers: public read and admin create
router.get("/vouchers", async (req, res, next) => {
  try {
    await getPreparedDb();
    const onlyAvailable = String(req.query.onlyAvailable || "true").toLowerCase() !== "false";
    const now = new Date();
    const baseQuery = {};

    if (onlyAvailable) {
      baseQuery.active = true;
      baseQuery.$and = [
        { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
        { $or: [{ validTo: null }, { validTo: { $gte: now } }] },
      ];
    }

    const vouchers = await Voucher.find(baseQuery).sort({ validTo: 1 }).lean();

    return res.json({ ok: true, data: vouchers.map((v) => ({
      id: String(v._id),
      code: v.code,
      description: v.description,
      discountType: v.discountType,
      discountValue: v.discountValue,
      minOrderAmount: v.minOrderAmount,
      validFrom: v.validFrom,
      validTo: v.validTo,
      active: !!v.active,
    })) });
  } catch (error) {
    next(error);
  }
});

router.post("/vouchers", async (req, res, next) => {
  try {
    await getPreparedDb();
    const code = String(req.body?.code || "").trim().toUpperCase();
    const discountType = String(req.body?.discountType || "fixed");
    const discountValue = Number(req.body?.discountValue || 0);

    if (!code || !["fixed", "percent"].includes(discountType) || !Number.isFinite(discountValue)) {
      return res.status(400).json({ ok: false, message: "code, discountType and discountValue are required." });
    }

    const payload = {
      code,
      description: String(req.body?.description || ""),
      discountType,
      discountValue,
      minOrderAmount: Number(req.body?.minOrderAmount || 0),
      validFrom: req.body?.validFrom ? new Date(req.body.validFrom) : null,
      validTo: req.body?.validTo ? new Date(req.body.validTo) : null,
      usageLimit: req.body?.usageLimit ? Number(req.body.usageLimit) : null,
      perUserLimit: req.body?.perUserLimit ? Number(req.body.perUserLimit) : null,
      active: req.body?.active === undefined ? true : !!req.body.active,
    };

    const existing = await Voucher.findOne({ code }).lean();
    if (existing) {
      return res.status(409).json({ ok: false, message: "Voucher code already exists." });
    }

    const created = await Voucher.create(payload);

    return res.status(201).json({ ok: true, data: { id: String(created._id), code: created.code } });
  } catch (error) {
    next(error);
  }
});

router.delete("/cart-items/:id", async (req, res, next) => {
  try {
    await getPreparedDb();
    const cartItemId = toObjectId(req.params.id);

    if (!cartItemId) {
      return res.status(400).json({ ok: false, message: "A valid cart item id is required." });
    }

    await CartItem.deleteOne({ _id: cartItemId });

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
    await getPreparedDb();
    const status = String(req.query.status || "all").trim().toLowerCase();
    const query = status === "all" ? {} : { status };
    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(100).lean();
    const orderIds = orders.map((order) => order._id);
    const userIds = [...new Set(orders.map((order) => String(order.userId)))].map((id) => new Types.ObjectId(id));
    const [users, orderItems, payments] = await Promise.all([
      userIds.length > 0 ? User.find({ _id: { $in: userIds } }).lean() : [],
      orderIds.length > 0 ? OrderItem.find({ orderId: { $in: orderIds } }).lean() : [],
      orderIds.length > 0 ? Payment.find({ orderId: { $in: orderIds } }).lean() : [],
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
    await getPreparedDb();
    const orderId = toObjectId(req.params.id);
    const status = String(req.body?.status || "").trim().toLowerCase();
    const allowedStatuses = new Set(["pending", "preparing", "ready", "completed"]);

    if (!orderId || !allowedStatuses.has(status)) {
      return res.status(400).json({
        ok: false,
        message: "A valid order id and status are required.",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedOrder) {
      return res.status(404).json({
        ok: false,
        message: "Order not found.",
      });
    }

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
    await getPreparedDb();
    const userId = toObjectId(req.body?.userId);
    const paymentMethod = String(req.body?.paymentMethod || "fake_card").trim();
    const voucherCode = String(req.body?.voucherCode || "").trim().toUpperCase();

    if (!userId) {
      return res.status(400).json({ ok: false, message: "A valid userId is required." });
    }

    const cartItems = await CartItem.find({ userId }).sort({ createdAt: 1 }).lean();
    if (cartItems.length === 0) {
      return res.status(400).json({ ok: false, message: "Your cart is empty." });
    }

    let totalAmount = cartItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
    let appliedVoucher = null;

    if (voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode }).lean();
      if (!voucher || !voucher.active) {
        return res.status(400).json({ ok: false, message: 'Invalid or inactive voucher code.' });
      }

      const now = new Date();
      if ((voucher.validFrom && voucher.validFrom > now) || (voucher.validTo && voucher.validTo < now)) {
        return res.status(400).json({ ok: false, message: 'Voucher is not valid at this time.' });
      }

      if (voucher.usageLimit && Number(voucher.redeemedCount || 0) >= Number(voucher.usageLimit)) {
        return res.status(400).json({ ok: false, message: 'Voucher usage limit reached.' });
      }

      if (voucher.minOrderAmount && totalAmount < Number(voucher.minOrderAmount)) {
        return res.status(400).json({ ok: false, message: 'Cart does not meet voucher minimum order amount.' });
      }

      if (voucher.perUserLimit) {
        const usedCount = await Order.countDocuments({ userId, voucherCode: voucher.code });
        if (usedCount >= Number(voucher.perUserLimit)) {
          return res.status(400).json({ ok: false, message: 'You have already used this voucher the maximum number of times.' });
        }
      }

      // calculate discount
      let discountAmount = 0;
      if (voucher.discountType === 'percent') {
        discountAmount = Math.round((totalAmount * (Number(voucher.discountValue || 0) / 100)) * 100) / 100;
      } else {
        discountAmount = Number(voucher.discountValue || 0);
      }

      const newTotal = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);

      appliedVoucher = voucher;
      totalAmount = newTotal;
    }

    const order = await Order.create({
      userId,
      orderNo: `DT-${Date.now().toString(36).toUpperCase()}`,
      orderType: "manual",
      status: "pending",
      totalAmount,
      currency: "SGD",
      voucherCode: appliedVoucher ? appliedVoucher.code : null,
    });

    const orderItems = cartItems.map((item) => ({
      orderId: order._id,
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
    }));

    await OrderItem.insertMany(orderItems);

    const payment = await Payment.create({
      orderId: order._id,
      userId,
      method: paymentMethod,
      status: "paid",
      amount: totalAmount,
      currency: "SGD",
      transactionRef: `FAKE-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
    });

    if (appliedVoucher && appliedVoucher._id) {
      try {
        await Voucher.updateOne({ _id: appliedVoucher._id }, { $inc: { redeemedCount: 1 } });
      } catch (e) {
        // non-fatal: log and continue
        console.warn('Failed to increment voucher redeemedCount', e?.message || e);
      }
    }

    await CartItem.deleteMany({ userId });

    return res.status(201).json({
      ok: true,
      order: {
        id: String(order._id),
        status: "pending",
        totalAmount,
        orderType: "manual",
      },
      payment: {
        id: String(payment._id),
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
