const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, default: "customer" },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String },
  },
  { timestamps: true, collection: "users" }
);

userSchema.statics.saveUserAccount = async function saveUserAccount(userData) {
  const email = String(userData.email || "").toLowerCase();

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
    passwordHash: userData.passwordHash,
    passwordSalt: userData.passwordSalt,
  });
};

module.exports = mongoose.model("User", userSchema);