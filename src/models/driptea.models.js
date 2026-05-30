const mongoose = require("mongoose");

const { Schema, model, models } = mongoose;

const COLLECTIONS = [
  "users",
  "menu_items",
  "orders",
  "order_items",
  "cart_items",
  "payments",
  "chatbot_sessions",
  "vouchers",
];

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    role: {
      type: String,
      required: true,
      enum: ["user_admin", "store_staff", "customer"],
      default: "customer",
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "suspended"],
      default: "active",
    },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
  },
  { collection: "users", timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

const customizationOptionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["single", "multiple"] },
    values: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const nutritionInfoSchema = new Schema(
  {
    baseVolumeMl: { type: Number, required: true, min: 0 },
    baseCalories: { type: Number, required: true, min: 0 },
    baseSugarG: { type: Number, required: true, min: 0 },
    nutriGrade: { type: String, required: true, enum: ["A", "B", "C", "D"] },
  },
  { _id: false }
);

const menuItemSchema = new Schema(
  {
    itemId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    category: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "" },
    customizationOptions: { type: [customizationOptionSchema], default: [] },
    nutritionInfo: { type: nutritionInfoSchema, required: true },
    status: { type: String, required: true, enum: ["active", "inactive"], default: "active" },
  },
  { collection: "menu_items", timestamps: true }
);

menuItemSchema.index({ category: 1, status: 1 });

const cartItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null },
    menuItemCode: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    category: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    customization: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, required: true, enum: ["active", "removed"], default: "active" },
  },
  { collection: "cart_items", timestamps: true }
);

cartItemSchema.index({ userId: 1, createdAt: 1 });

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderNo: { type: String, required: true, trim: true },
    orderType: { type: String, required: true, enum: ["manual"], default: "manual" },
    status: {
      type: String,
      required: true,
      enum: ["pending", "preparing", "ready", "completed"],
      default: "pending",
    },
    totalAmount: { type: Number, required: true, min: 0 },
    voucherCode: { type: String, default: null },
  },
  { collection: "orders", timestamps: true }
);

orderSchema.index({ userId: 1, status: 1 });

const orderItemSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null },
    menuItemCode: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    category: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    customization: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: "order_items", timestamps: { createdAt: true, updatedAt: false } }
);

orderItemSchema.index({ orderId: 1 });

const paymentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ["paid", "unpaid", "failed"], default: "paid" },
    amount: { type: Number, required: true, min: 0 },
    transactionRef: { type: String, required: true, trim: true },
  },
  { collection: "payments", timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index({ orderId: 1 });

const chatbotMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatbotSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    conversationId: { type: String, default: "" },
    messages: { type: [chatbotMessageSchema], default: [] },
  },
  { collection: "chatbot_sessions", timestamps: true }
);

chatbotSessionSchema.index({ userId: 1, updatedAt: -1 });

const User = models.User || model("User", userSchema);
const MenuItem = models.MenuItem || model("MenuItem", menuItemSchema);
const CartItem = models.CartItem || model("CartItem", cartItemSchema);
const Order = models.Order || model("Order", orderSchema);
const OrderItem = models.OrderItem || model("OrderItem", orderItemSchema);
const Payment = models.Payment || model("Payment", paymentSchema);
const ChatbotSession = models.ChatbotSession || model("ChatbotSession", chatbotSessionSchema);

const voucherSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, default: "" },
    discountType: { type: String, required: true, enum: ["percent", "fixed"], default: "fixed" },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    perUserLimit: { type: Number, default: null },
    redeemedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { collection: "vouchers", timestamps: true }
);

const Voucher = models.Voucher || model("Voucher", voucherSchema);

module.exports = {
  COLLECTIONS,
  User,
  MenuItem,
  CartItem,
  Order,
  OrderItem,
  Payment,
  Voucher,
  ChatbotSession,
};
