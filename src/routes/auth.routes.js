// User Story Architecture Trace — auth.routes.js

const express = require("express");
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.get("/auth/test", (req, res) => {
  res.json({ ok: true });
});

// #11 As a user admin, I want to log in my user account so I can log in to my account.
// #22 As a customer, I want to log in to my user account so that I can place an order.
// #37 As a store staff, I want to log in so that I can start my session.
// #191 As a customer, I want to create user account so that I can assess the platform
router.post("/auth/register", userController.register);
router.post("/auth/login", authController.login);

// #14 As a customer, I want to reset my password so that I can regain access to my account.
router.post("/auth/reset-password", userController.resetPassword);
router.patch("/auth/change-password", userController.changePassword);

module.exports = router;
