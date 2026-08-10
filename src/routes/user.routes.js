// User Story Architecture Trace — user.routes.js
// View: user-admin-dashboard/page.tsx -> Route: user.routes.js -> Ctrl: user.controller.js -> Model: user.model.js / profile.model.js

const express = require("express");
const userController = require("../controllers/user.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// #02 - As a user admin, I want to view a user profile so that I can access user information.
// #05 - As a user admin, I want to search for user profiles so that I can retrieve specific user profile information.
// #07 - As a user admin, I want to view a user account so that I can view the user's details.
// #10 - As a user admin, I want to search for a user by username so that I can get the user's information quickly.
router.get("/users", userController.listUsers);

// #01 - As a user admin, I want to create a user profile so that I can handle different types of users.
// #06 - As a user admin, I want to create a user account so that a new user can access the platform.
router.post("/users", requireAuth, requireRole("user_admin"), userController.createUser);

// #03  - As a user admin, I want to update the user profile so that I can make changes to the user profile.
// #08  - As a user admin, I want to update a user account so that I can keep user records up to date.
// #246 - As a customer, I want to update my account so that I can make sure the information is the latest.
router.patch("/users/:id", userController.updateUser);

// #04  - As a user admin, I want to suspend user profiles so that I can maintain user access.
// #09  - As a user admin, I want to suspend a user account so that I can prevent unauthorized access.
router.patch("/users/:id/suspend", userController.suspendUser);

// --- User profiles ---

router.get("/profiles", userController.listProfiles);
router.post("/profiles", requireAuth, requireRole("user_admin"), userController.createProfile);
router.patch("/profiles/:value", requireAuth, requireRole("user_admin"), userController.updateProfile);
router.delete("/profiles/:value", requireAuth, requireRole("user_admin"), userController.suspendProfile);

module.exports = router;
