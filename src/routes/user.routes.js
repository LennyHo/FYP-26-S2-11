const express = require("express");
const User = require("../models/user.model");

const router = express.Router();

router.get("/users", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ fullName: 1 });

    res.json({
      ok: true,
      data: users.map(user => ({
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[Users] Failed to load users:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to load users.",
    });
  }
});

module.exports = router;