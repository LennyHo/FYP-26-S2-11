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

module.exports = mongoose.model("User", userSchema);