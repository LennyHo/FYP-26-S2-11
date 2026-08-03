// User Story Architecture Trace — user.model.js
//
// #1–#10  User Profile & Account Management (User Admin)
//      View: user-admin-dashboard/page.tsx -> Route: user.routes.js -> Model: user.model.js (this file)
//
// #11  Login (User Admin) | #22 Login (Customer) | #37 Login (Store Staff)
//      View: login/page.tsx -> Route: auth.routes.js -> Ctrl: auth.controller.js -> Model: user.model.js (this file)
//
// #12  Logout (User Admin) | #20 Logout (Customer) | #38 Logout (Store Staff)
//      client-side: JWT cleared from localStorage — no model call
//
// #14  Reset Password
//      View: forgot-password/page.tsx -> Route: auth.routes.js -> Ctrl: user.controller.js -> Model: user.model.js (this file)
//
// #191 Create User Account (Customer)
//      View: register/page.tsx -> Route: auth.routes.js -> Ctrl: user.controller.js -> Model: user.model.js (this file)
//
// #246 Update Account (Customer)
//      View: profile/page.tsx -> Route: user.routes.js -> Model: user.model.js (this file)

const mongoose = require("mongoose");
const crypto = require("crypto");
const {
  CUSTOMER_EMAIL_DOMAINS,
  LOGIN_EMAIL_DOMAINS,
  STAFF_RESET_BLOCKED_MESSAGE,
  validateEmail,
  validatePassword,
  validateResetEmail,
} = require("../utils/validation.util");

const SESSION_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const passwordHash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");

  return {
    passwordHash,
    passwordSalt: salt,
  };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) {
    return false;
  }

  const attemptedHash = crypto
    .pbkdf2Sync(password, user.passwordSalt, 120000, 64, "sha512")
    .toString("hex");

  return attemptedHash === user.passwordHash;
}

function publicUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    profilePic: user.profilePic || "",
    addresses: user.addresses || [],
    storeId: user.storeId ? String(user.storeId) : null,
    storeCode: user.storeCode || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// A user can save more than one delivery address (e.g. Home, Work); isDefault
// marks which one pre-fills at checkout.
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "", trim: true },
    address: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: true }
);


const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: { type: String, default: "customer" },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    profilePic: { type: String, default: "" },
    addresses: { type: [addressSchema], default: [] },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", default: null },
    storeCode: { type: String, default: null },
    sessionToken: { type: String, default: null, select: false },
    sessionTokenExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true, collection: "users" }
);

userSchema.statics.register = async function register({ fullName, email, password }) {
  fullName = String(fullName || "").trim();
  email = normalizeEmail(email);
  password = String(password || "");

  if (!fullName) {
    const error = new Error("Full name is required.");
    error.statusCode = 400;
    throw error;
  }

  // Customers can only register with gmail, outlook or hotmail.
  const emailError = validateEmail(email, CUSTOMER_EMAIL_DOMAINS);
  if (emailError) {
    const error = new Error(emailError);
    error.statusCode = 400;
    throw error;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    const error = new Error(passwordError);
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await this.findOne({ email }).lean();

  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const token = crypto.randomBytes(24).toString("hex");
  const sessionTokenExpiresAt = new Date(Date.now() + SESSION_TOKEN_TTL_MS);

  const user = await this.create({
    fullName,
    email,
    role: "customer",
    status: "active",
    sessionToken: token,
    sessionTokenExpiresAt,
    ...createPasswordRecord(password),
  });

  return {
    user: publicUser(user),
    token,
  };
};

userSchema.statics.login = async function login({ email, password }) {
  email = normalizeEmail(email);
  password = String(password || "");

  // Uses the same "Invalid email or password" message so the login page
  // does not reveal which emails exist.
  if (validateEmail(email, LOGIN_EMAIL_DOMAINS)) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  const user = await this.findOne({ email }).lean();

  if (!user || !verifyPassword(password, user)) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  if (user.status === "suspended") {
    const error = new Error("This account is suspended.");
    error.statusCode = 403;
    throw error;
  }

  const token = crypto.randomBytes(24).toString("hex");
  const sessionTokenExpiresAt = new Date(Date.now() + SESSION_TOKEN_TTL_MS);

  await this.updateOne(
    { _id: user._id },
    { $set: { sessionToken: token, sessionTokenExpiresAt } }
  );

  return {
    user: publicUser(user),
    token,
  };
};

userSchema.statics.resetPassword = async function resetPassword({
  email,
  newPassword,
}) {
  email = normalizeEmail(email);
  const password = String(newPassword || "");

  // Staff and admin accounts cannot reset their own password.
  const emailError = validateResetEmail(email);
  if (emailError) {
    const error = new Error(emailError);
    error.statusCode = 403;
    throw error;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    const error = new Error(passwordError);
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await this.findOne({ email }).lean();

  if (!existingUser) {
    const error = new Error("No account was found for that email address.");
    error.statusCode = 404;
    throw error;
  }

  // Also checks the role, in case a staff account was made on a gmail address.
  if (existingUser.role !== "customer") {
    const error = new Error(STAFF_RESET_BLOCKED_MESSAGE);
    error.statusCode = 403;
    throw error;
  }

  const updatedUser = await this.findOneAndUpdate(
    { email },
    {
      $set: {
        ...createPasswordRecord(password),
        // Logs out any session that is already open.
        sessionToken: null,
        sessionTokenExpiresAt: null,
      },
    },
    { returnDocument: "after" }
  ).lean();

  return publicUser(updatedUser);
};

userSchema.statics.changePassword = async function changePassword({
  userId,
  currentPassword,
  newPassword,
}) {
  const password = String(newPassword || "");

  if (!userId || !currentPassword || password.length < 6) {
    const error = new Error(
      "Current password and a new password of at least 6 characters are required."
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await this.findById(userId);

  if (!user) {
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!verifyPassword(currentPassword, user)) {
    const error = new Error("Current password is incorrect.");
    error.statusCode = 401;
    throw error;
  }

  const passwordRecord = createPasswordRecord(password);
  user.passwordHash = passwordRecord.passwordHash;
  user.passwordSalt = passwordRecord.passwordSalt;

  await user.save();

  return publicUser(user);
};

userSchema.statics.suspendUser = async function suspendUser(userId) {
  return this.findByIdAndUpdate(
    userId,
    { status: "suspended" },
    { returnDocument: "after", runValidators: true }
  );
};

userSchema.statics.createUserAccount = async function createUserAccount(userData) {
  const email = normalizeEmail(userData.email);
  const role = userData.role || "customer";

  const passwordRecord = userData.passwordHash && userData.passwordSalt
    ? { passwordHash: userData.passwordHash, passwordSalt: userData.passwordSalt }
    : createPasswordRecord(userData.password || "Password@123");

  return this.create({
    fullName: userData.fullName,
    email,
    role,
    status: userData.status || "active",
    profilePic: userData.profilePic || "",
    addresses: userData.addresses || [],
    storeId: role === "store_staff" ? userData.storeId || null : null,
    storeCode: role === "store_staff" ? userData.storeCode || null : null,
    ...passwordRecord,
  });
};

module.exports = mongoose.model("User", userSchema);