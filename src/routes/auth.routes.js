const express = require("express");
const authController = require("../controllers/auth.controller");

const router = express.Router();

// Debugging route to view all users (remove in production)
router.get("/auth/test", (req, res) => {
  res.json({ ok: true });
});

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
// Student note: these two routes connect the forgot/change password buttons to MongoDB.
router.post("/auth/reset-password", authController.resetPassword);
router.patch("/auth/change-password", authController.changePassword);

module.exports = router;
