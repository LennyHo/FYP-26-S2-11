// User Story Architecture Trace — user.model.js
//
// #1–#10  User Profile & Account Management (User Admin)
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js → Model: user.model.js (this file)
//
// #11  Login (User Admin) | #22 Login (Customer) | #37 Login (Store Staff)
//      View: login/page.tsx → Route: auth.routes.js → Ctrl: auth.controller.js → Model: user.model.js (this file)
//
// #12  Logout (User Admin) | #20 Logout (Customer) | #38 Logout (Store Staff)
//      client-side: JWT cleared from localStorage — no model call
//
// #14  Reset Password
//      View: forgot-password/page.tsx → Route: auth.routes.js → Ctrl: user.controller.js → Model: user.model.js (this file)
//
// #191 Create User Account (Customer)
//      View: register/page.tsx → Route: auth.routes.js → Ctrl: user.controller.js → Model: user.model.js (this file)
//
// #246 Update Account (Customer)
//      View: profile/page.tsx → Route: user.routes.js → Model: user.model.js (this file)

const mongoose = require("mongoose");
const crypto = require("crypto");

const SEED_USERS = [
  {
    fullName: "Admin User",
    email: "yiyuanzhuan@driptea.com",
    password: "Admin@123",
    role: "user_admin",
  },
  {
    fullName: "Staff User",
    email: "williamsbilly@driptea.com",
    password: "Staff@123",
    role: "store_staff",
  },
  {
    fullName: "Customer User",
    email: "customer@gmail.com",
    password: "Customer@123",
    role: "customer",
  },
];

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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// #01/#06 - Create user profile/account → stores fullName, email, role, passwordHash, passwordSalt in users collection.
// #02/#07 - View user profile/account → reads from users collection (passwordHash excluded from response).
// #03/#08 - Update user profile/account → findByIdAndUpdate on users collection.
// #04/#09 - Suspend user profile/account → sets status: "suspended" in users collection via suspendUser().
// #05/#10 - Search user profiles/accounts → regex query across fullName, email, role, status in users collection.
// #11/#22/#37 - Login (admin/customer/staff) → finds user by email, verifies PBKDF2 hash via login().
// #12/#20/#38 - Logout → handled client-side; no database operation required.
// #14  - Reset password → finds user by email, updates passwordHash and passwordSalt via resetPassword().
// #191 - Register customer → inserts new document with role: "customer" via register().
// #246 - Update account → updates fullName, email, profilePic via PATCH /api/users/:id.
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
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String },
  },
  { timestamps: true, collection: "users" }
);

userSchema.statics.register = async function register({ fullName, email, password }) {
  fullName = String(fullName || "").trim();
  email = normalizeEmail(email);
  password = String(password || "");

  if (!fullName || !email || password.length < 6) {
    const error = new Error(
      "Full name, valid email, and password of at least 6 characters are required."
    );
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await this.findOne({ email }).lean();

  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const user = await this.create({
    fullName,
    email,
    role: "customer",
    status: "active",
    ...createPasswordRecord(password),
  });

  return {
    user: publicUser(user),
    token: crypto.randomBytes(24).toString("hex"),
  };
};

userSchema.statics.login = async function login({ email, password }) {
  email = normalizeEmail(email);
  password = String(password || "");

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

  return {
    user: publicUser(user),
    token: crypto.randomBytes(24).toString("hex"),
  };
};

userSchema.statics.resetPassword = async function resetPassword({
  email,
  newPassword,
}) {
  email = normalizeEmail(email);
  const password = String(newPassword || "");

  if (!email || password.length < 6) {
    const error = new Error(
      "Email and a new password of at least 6 characters are required."
    );
    error.statusCode = 400;
    throw error;
  }

  const updatedUser = await this.findOneAndUpdate(
    { email },
    { $set: createPasswordRecord(password) },
    { returnDocument: "after" }
  ).lean();

  if (!updatedUser) {
    const error = new Error("No account was found for that email address.");
    error.statusCode = 404;
    throw error;
  }

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

userSchema.statics.initializeSeedUsers = async function initializeSeedUsers() {
  try {
    for (const seedUser of SEED_USERS) {
      const email = normalizeEmail(seedUser.email);
      const existingUser = await this.findOne({ email }).lean();

      if (!existingUser) {
        await this.create({
          fullName: seedUser.fullName,
          email,
          role: seedUser.role,
          status: "active",
          ...createPasswordRecord(seedUser.password),
        });

        console.log(`[Auth] Seeded user: ${email}`);
      }
    }
  } catch (error) {
    console.error("[Auth] Failed to initialize seed users:", error.message);
  }
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

  let role = userData.role || "customer";

  if (email.includes("admin")) {
    role = "user_admin";
  } else if (email.includes("staff")) {
    role = "store_staff";
  }

  return this.create({
    fullName: userData.fullName,
    email,
    role,
    status: userData.status || "active",
    profilePic: userData.profilePic || "",
    ...createPasswordRecord(userData.password || "Password@123"),
  });
};

module.exports = mongoose.model("User", userSchema);