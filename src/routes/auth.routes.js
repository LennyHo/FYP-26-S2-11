// User Story Architecture Trace — auth.routes.js
//
// #11  Login (User Admin)
//      View: login/page.tsx → Route: auth.routes.js (this file) → Ctrl: auth.controller.js → Model: user.model.js
//
// #14  Reset Password
//      View: forgot-password/page.tsx → Route: auth.routes.js (this file) → Ctrl: user.controller.js → Model: user.model.js
//
// #22  Login (Customer)
//      View: login/page.tsx → Route: auth.routes.js (this file) → Ctrl: auth.controller.js → Model: user.model.js
//
// #37  Login (Store Staff)
//      View: login/page.tsx → Route: auth.routes.js (this file) → Ctrl: auth.controller.js → Model: user.model.js
//
// #191 Create User Account (Customer)
//      View: register/page.tsx → Route: auth.routes.js (this file) → Ctrl: user.controller.js → Model: user.model.js

const express = require("express");
const authController = require("../controllers/auth.controller");
const userController = require("../controllers/user.controller");

const router = express.Router();

// Debugging route to view all users (remove in production)
router.get("/auth/test", (req, res) => {
  res.json({ ok: true });
});

// #191 Register | #11/#22/#37 Login
router.post("/auth/register", userController.register);
router.post("/auth/login", authController.login);

// #14 Reset Password
router.post("/auth/reset-password", userController.resetPassword);
router.patch("/auth/change-password", userController.changePassword);

module.exports = router;
