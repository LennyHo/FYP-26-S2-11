const User = require("../models/user.model");

// #191 - As a customer, I want to create a user account so that I can access the platform.
// #06  - As a user admin, I want to create a user account so that a new user can access the platform.
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

// #11 - As a user admin, I want to log in my user account so I can log in to my account.
// #22 - As a customer, I want to log in to my user account so that I can place an order.
// #37 - As a store staff, I want to log in so that I can start my session.
// Calls User.login() → verifies password hash → checks account status → returns user + token.
async function login(req, res) {
    try {
        const result = await User.login(req.body);

    res.json({
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
    login,
    resetPassword,
    changePassword,
};
