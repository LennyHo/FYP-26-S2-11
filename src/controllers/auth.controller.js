const authService = require("../services/auth.service");

async function register(req, res) {
    try {
        const result = await authService.register(req.body);

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

async function login(req, res) {
    try {
        const result = await authService.login(req.body);

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

async function resetPassword(req, res) {
    try {
        await authService.resetPassword(req.body);

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

async function changePassword(req, res) {
    try {
        await authService.changePassword(req.body);

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
