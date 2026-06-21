// User Story Architecture Trace — user.controller.js
//
// #6   Create User Account (User Admin)
//      View: user-admin-dashboard/page.tsx → Route: user.routes.js → Ctrl: auth.controller.js (this file) → Model: user.model.js
//
// #14  Reset Password
//      View: forgot-password/page.tsx → Route: auth.routes.js → Ctrl: auth.controller.js (this file) → Model: user.model.js
//
// #191 Create User Account (Customer)
//      View: register/page.tsx → Route: auth.routes.js → Ctrl: auth.controller.js (this file) → Model: user.model.js
//
// #246 Update Account (Customer)
//      View: profile/page.tsx → Route: user.routes.js → Ctrl: auth.controller.js (this file) → Model: user.model.js

const User = require("../models/user.model");

// #191 Register (Customer) | #6 Create User Account (Admin)
// Calls User.register() → hashes password → inserts into users collection → returns user + token.
async function register(req, res) {
    try {
        const result = await User.register(req.body);

        res.status(201).json({
            ok: true,
            user: result.user,
            token: result.token,
    });
    } catch (error) {
    res.status(error.statusCode || 500).json({
        ok: false,
        message: error.message,
    });
    }
}

// #14 - As a customer, I want to reset my password so that I can regain access to my account.
// Calls User.resetPassword() → finds user by email → rehashes new password → updates users collection.
async function resetPassword(req, res) {
    try {
        await User.resetPassword(req.body);

        res.json({
            ok: true,
            message: "Password has been reset.",
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            ok: false,
            message: error.message,
        });
    }
}

// #14 - As a customer, I want to reset my password so that I can regain access to my account.
// Calls User.changePassword() → verifies current password → rehashes new password → updates users collection.
async function changePassword(req, res) {
    try {
        await User.changePassword(req.body);

        res.json({
            ok: true,
            message: "Password changed successfully.",
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            ok: false,
            message: error.message,
        });
    }
}

module.exports = {
    register,
    resetPassword,
    changePassword,
};
