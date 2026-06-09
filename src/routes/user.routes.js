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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

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
