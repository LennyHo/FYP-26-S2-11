// User Story Architecture Trace — auth.controller.js

const User = require("../models/user.model");

// #11 - As a user admin, I want to log in my user account so I can log in to my account.
// #22 - As a customer, I want to log in to my user account so that I can place an order.
// #37 - As a store staff, I want to log in so that I can start my session.
// Calls User.login() -> verifies password hash -> checks account status -> returns user + token.
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


module.exports = {
    login,
};
