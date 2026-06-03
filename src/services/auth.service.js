const crypto = require("crypto");
const User = require("../models/user.model");

// Seed users that match the test credentials in the login page
const SEED_USERS = [
    {
    fullName: "Admin User",
    email: "yiyuanzhuan@driptea.com",
    password: "Admin@123",
    role: "user_admin",
    },
    {
    fullName: "Staff User",
    email: "williamsbilly@driptea.com",
    password: "Staff@123",
    role: "store_staff",
    },
    {
    fullName: "Customer User",
    email: "customer@gmail.com",
    password: "Customer@123",
    role: "customer",
    },
];

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function createPasswordRecord(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const passwordHash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");

    return {
        passwordHash,
        passwordSalt: salt,
    };
}

function verifyPassword(password, user) {
    if (!user?.passwordHash || !user?.passwordSalt) {
        return false;
    }

    const attemptedHash = crypto
    .pbkdf2Sync(password, user.passwordSalt, 120000, 64, "sha512")
    .toString("hex");

    return attemptedHash === user.passwordHash;
}

function publicUser(user) {
    return {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
    };
}

async function register({ fullName, email, password }) {
    fullName = String(fullName || "").trim();
    email = normalizeEmail(email);
    password = String(password || "");

    if (!fullName || !email || password.length < 6) {
    throw new Error(
        "Full name, valid email, and password of at least 6 characters are required."
    );
    }

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
        throw new Error("An account with this email already exists.");
    }

    const user = await User.create({
        fullName,
        email,
        role: "customer",
        status: "active",
        ...createPasswordRecord(password),
    });

    return {
        user: publicUser(user),
        token: crypto.randomBytes(24).toString("hex"),
    };
}

async function login({ email, password }) {
    email = normalizeEmail(email);
    password = String(password || "");

    const user = await User.findOne({ email }).lean();

    if (!user || !verifyPassword(password, user)) {
    throw new Error("Invalid email or password.");
    }

    if (user.status === "suspended") {
    throw new Error("This account is suspended.");
    }

    return {
    user: publicUser(user),
    token: crypto.randomBytes(24).toString("hex"),
    };
}

async function initializeSeedUsers() {
    try {
    for (const seedUser of SEED_USERS) {
        const email = normalizeEmail(seedUser.email);
        const existingUser = await User.findOne({ email }).lean();

        if (!existingUser) {
        await User.create({
            fullName: seedUser.fullName,
            email,
            role: seedUser.role,
            status: "active",
            ...createPasswordRecord(seedUser.password),
        });
        console.log(`[Auth] Seeded user: ${email}`);
        }
    }
    } catch (error) {
    console.error("[Auth] Failed to initialize seed users:", error.message);
    }
}

module.exports = {
    register,
    login,
    initializeSeedUsers,
};