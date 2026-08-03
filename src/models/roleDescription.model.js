// User Story Architecture Trace — roleDescription.model.js

const mongoose = require("mongoose");

const roleDescriptionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["customer", "store_staff", "user_admin"],
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoleDescription", roleDescriptionSchema);
