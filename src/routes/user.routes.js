// User Story Architecture Trace — user.routes.js
//
// #1   Create User Profile
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #2   View User Profile
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #3   Update User Profile
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #4   Suspend User Profile
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #5   Search User Profile
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #6   Create User Account
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #7   View User Account
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #8   Update User Account
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #9   Suspend User Account
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #10  Search User Account
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js (this file) → Model: user.model.js
//
// #246 Update Account (Customer)
//      View: profile/page.tsx → Route: user.routes.js (this file) → Model: user.model.js

const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/user.model");

const router = express.Router();

function makePasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto
    .pbkdf2Sync(String(password), salt, 120000, 64, "sha512")
    .toString("hex");

  return { passwordHash, passwordSalt: salt };
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    profilePic: user.profilePic || "",
    addresses: user.addresses || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Strips an incoming addresses payload down to the fields the schema allows,
// so callers can't inject arbitrary keys into address subdocuments.
function sanitizeAddresses(rawAddresses) {
  if (!Array.isArray(rawAddresses)) return [];

  return rawAddresses
    .map((entry) => ({
      label: String(entry?.label || "").trim(),
      address: String(entry?.address || "").trim(),
      isDefault: Boolean(entry?.isDefault),
    }))
    .filter((entry) => entry.address.length > 0);
}

// #02 - As a user admin, I want to view a user profile so that I can access user information.
// #05 - As a user admin, I want to search for user profiles so that I can retrieve specific user profile information.
// #07 - As a user admin, I want to view a user account so that I can view the user's details.
// #10 - As a user admin, I want to search for a user by username so that I can get the user's information quickly.
router.get("/users", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const query = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query)
      .select("-passwordHash -passwordSalt")
      .sort({ fullName: 1 });

    res.json({
      ok: true,
      data: users.map(publicUser),
    });
  } catch (error) {
    console.error("[Users] Failed to load users:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to load users.",
    });
  }
});

// #01 - As a user admin, I want to create a user profile so that I can handle different types of users.
// #06 - As a user admin, I want to create a user account so that a new user can access the platform.
router.post("/users", async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "customer");
    const status = String(req.body.status || "active");
    const allowedRoles = ["customer", "store_staff", "user_admin"];
    const allowedStatuses = ["active", "suspended", "inactive"];

    if (!fullName || !email || password.length < 6 || !allowedRoles.includes(role) || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: "Name, email, password, role and status are required.",
      });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.createUserAccount({
      fullName,
      email,
      role,
      status,
      addresses: sanitizeAddresses(req.body.addresses),
      ...makePasswordHash(password),
    });

    res.status(201).json({
      ok: true,
      data: publicUser(user),
    });
  } catch (error) {
    console.error("[Users] Failed to create user:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to create user.",
    });
  }
});

// #03  - As a user admin, I want to update the user profile so that I can make changes to the user profile.
// #04  - As a user admin, I want to suspend user profiles so that I can maintain user access.
// #08  - As a user admin, I want to update a user account so that I can keep user records up to date.
// #09  - As a user admin, I want to suspend a user account so that I can prevent unauthorized access.
// #246 - As a customer, I want to update my account so that I can make sure the information is the latest.
router.patch("/users/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, message: "A valid user id is required." });
    }

    const update = {};
    const allowedRoles = ["customer", "store_staff", "user_admin"];
    const allowedStatuses = ["active", "suspended", "inactive"];

    if (req.body.fullName !== undefined) {
      update.fullName = String(req.body.fullName || "").trim();
      if (!update.fullName) return res.status(400).json({ ok: false, message: "Full name is required." });
    }

    if (req.body.email !== undefined) {
      update.email = String(req.body.email || "").trim().toLowerCase();
      if (!update.email) return res.status(400).json({ ok: false, message: "Email is required." });

      const duplicate = await User.findOne({ email: update.email, _id: { $ne: req.params.id } }).lean();
      if (duplicate) return res.status(409).json({ ok: false, message: "An account with this email already exists." });
    }

    if (req.body.role !== undefined) {
      update.role = String(req.body.role);
      if (!allowedRoles.includes(update.role)) return res.status(400).json({ ok: false, message: "Role is invalid." });
    }

    if (req.body.status !== undefined) {
      update.status = String(req.body.status);
      if (!allowedStatuses.includes(update.status)) return res.status(400).json({ ok: false, message: "Status is invalid." });
    }

    if (req.body.profilePic !== undefined) {
      update.profilePic = String(req.body.profilePic || "");
    }

    if (req.body.addresses !== undefined) {
      update.addresses = sanitizeAddresses(req.body.addresses);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ ok: false, message: "No changes were submitted." });
    }

    const isSuspendOnly = Object.keys(update).length === 1 && update.status === 'suspended';
    const user = isSuspendOnly
      ? await User.suspendUser(req.params.id)
      : await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    res.json({
      ok: true,
      data: publicUser(user),
    });
  } catch (error) {
    console.error("[Users] Failed to update user:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to update user.",
    });
  }
});

module.exports = router;
