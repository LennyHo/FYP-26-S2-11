const User = require("../models/user.model");

// Verifies the Authorization: Bearer <token> header against the session token
// persisted on the User document at login, and attaches req.user = { id, role, storeId }.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({ ok: false, message: "Authentication is required." });
    }

    const user = await User.findOne({ sessionToken: token })
      .select("+sessionToken +sessionTokenExpiresAt")
      .lean();

    if (!user || user.status === "suspended") {
      return res.status(401).json({ ok: false, message: "Invalid or expired session." });
    }

    if (!user.sessionTokenExpiresAt || new Date(user.sessionTokenExpiresAt) < new Date()) {
      return res.status(401).json({ ok: false, message: "Session has expired. Please log in again." });
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      storeId: user.storeId ? String(user.storeId) : null,
    };

    next();
  } catch (error) {
    console.error("[Auth] requireAuth failed:", error.message);
    res.status(500).json({ ok: false, message: "Unable to verify authentication." });
  }
}

// Must run after requireAuth. Rejects the request unless req.user.role is one of `roles`.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: "You do not have permission to perform this action." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
