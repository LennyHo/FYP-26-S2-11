// User Story Architecture Trace — user.controller.js

const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Store = require("../models/store.model");
const Profile = require("../models/profile.model");
const {
    ADMIN_EMAIL_DOMAINS,
    validateEmail,
    validatePassword,
} = require("../utils/validation.util");

// --- User profiles ---
function publicProfile(profile) {
    return {
        id: profile._id.toString(),
        value: profile.value,
        label: profile.label,
        description: profile.description || "",
        status: profile.status,
        isBuiltIn: Boolean(profile.isBuiltIn),
        updatedAt: profile.updatedAt,
    };
}

// #01: As a user admin, I want to create a user profile so that I can handle different types of users.
async function createProfile(req, res) {
    try {
        const label = String(req.body.label || "").trim();
        const description = String(req.body.description || "").trim();
        const status = req.body.status === "suspended" ? "suspended" : "active";

        if (!label) {
            return res.status(400).json({ ok: false, message: "Profile name is required." });
        }

        // Slug doubles as the role value.
        const value = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
        if (!value) {
            return res.status(400).json({ ok: false, message: "Profile name must contain letters or numbers." });
        }

        const existing = await Profile.findOne({ value });
        if (existing) {
            return res.status(409).json({ ok: false, message: "A profile with that name already exists." });
        }

        const created = await Profile.create({ value, label, description, status });
        res.status(201).json({ ok: true, data: publicProfile(created) });
    } catch (error) {
        console.error("[Profiles] Failed to create:", error);
        res.status(500).json({ ok: false, message: "Unable to create profile." });
    }
}

// #02: As a user admin, I want to view a user profile so that I can access user information.
async function listProfiles(req, res) {
    try {
        await Profile.seedBuiltInProfiles();
        const profiles = await Profile.find().sort({ createdAt: 1 });
        res.json({ ok: true, data: profiles.map(publicProfile) });
    } catch (error) {
        console.error("[Profiles] Failed to load:", error);
        res.status(500).json({ ok: false, message: "Unable to load profiles." });
    }
}

// #03: As a user admin, I want to update the user profile so that I can make changes to the user profile.
async function updateProfile(req, res) {
    try {
        const profile = await Profile.findOne({ value: req.params.value });
        if (!profile) {
            return res.status(404).json({ ok: false, message: "Profile not found." });
        }

        if (typeof req.body.description === "string") {
            profile.description = req.body.description.trim();
        }
        if (req.body.status === "active" || req.body.status === "suspended") {
            profile.status = req.body.status;
        }
        if (typeof req.body.label === "string" && req.body.label.trim() && !profile.isBuiltIn) {
            profile.label = req.body.label.trim();
        }

        await profile.save();
        res.json({ ok: true, data: publicProfile(profile) });
    } catch (error) {
        console.error("[Profiles] Failed to update:", error);
        res.status(500).json({ ok: false, message: "Unable to update profile." });
    }
}

// #04: As a user admin, I want to suspend user profiles so that I can maintain user access.
async function suspendProfile(req, res) {
    try {
        const profile = await Profile.findOne({ value: req.params.value });
        if (!profile) {
            return res.status(404).json({ ok: false, message: "Profile not found." });
        }
        if (profile.isBuiltIn) {
            return res.status(400).json({ ok: false, message: "Built-in profiles cannot be deleted." });
        }

        await profile.deleteOne();
        res.json({ ok: true });
    } catch (error) {
        console.error("[Profiles] Failed to delete:", error);
        res.status(500).json({ ok: false, message: "Unable to delete profile." });
    }
}

// #05: As a user admin, I want to search for user profiles so that I can retrieve specific user profile information.
async function searchProfile(req, res) {
    try {
        const search = String(req.query.search || "").trim();
        const query = search
            ? {
                $or: [
                    { label: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                    { value: { $regex: search, $options: "i" } },
                ],
            }
            : {};

        await Profile.seedBuiltInProfiles();
        const profiles = await Profile.find(query).sort({ createdAt: 1 });
        res.json({ ok: true, data: profiles.map(publicProfile) });
    } catch (error) {
        console.error("[Profiles] Failed to search:", error);
        res.status(500).json({ ok: false, message: "Unable to search profiles." });
    }
}

// Helper functions for user account management
function makePasswordHash(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto
        .pbkdf2Sync(String(password), salt, 120000, 64, "sha512")
        .toString("hex");

    return { passwordHash, passwordSalt: salt };
}

function sanitizeAddresses(rawAddresses) {
    if (!Array.isArray(rawAddresses)) return [];

    return rawAddresses
        .map((entry) => {
            const lat = Number(entry?.lat);
            const lng = Number(entry?.lng);

            return {
                label: String(entry?.label || "").trim(),
                address: String(entry?.address || "").trim(),
                isDefault: Boolean(entry?.isDefault),
                ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
            };
        })
        .filter((entry) => entry.address.length > 0);
}

// --- User accounts ---
function publicUser(user) {
    return {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePic: user.profilePic || "",
        addresses: user.addresses || [],
        storeId: user.storeId ? String(user.storeId) : null,
        storeCode: user.storeCode || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

// #06 - As a user admin, I want to create a user account so that a new user can access the platform.
async function createUser(req, res) {
    try {
        const fullName = String(req.body.fullName || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const role = String(req.body.role || "customer");
        const status = String(req.body.status || "active");
        const allowedStatuses = ["active", "suspended", "inactive"];

        if (!fullName || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                ok: false,
                message: "Name, email, password, role and status are required.",
            });
        }

        // Role must be an active profile, so admin-created profiles are assignable.
        await Profile.seedBuiltInProfiles();
        const roleProfile = await Profile.findOne({ value: role, status: "active" }).lean();
        if (!roleProfile) {
            return res.status(400).json({ ok: false, message: "Role is invalid." });
        }

        // Allows @driptea.com as well, so the admin can create staff accounts.
        const emailError = validateEmail(email, ADMIN_EMAIL_DOMAINS);
        if (emailError) {
            return res.status(400).json({ ok: false, message: emailError });
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ ok: false, message: passwordError });
        }

        let store = null;
        if (role === "store_staff") {
            const storeCode = String(req.body.storeCode || "").trim();
            if (!storeCode) {
                return res.status(400).json({ ok: false, message: "A store is required for store staff accounts." });
            }
            store = await Store.findOne({ storeCode }).lean();
            if (!store) {
                return res.status(400).json({ ok: false, message: "The selected store could not be found." });
            }
        }

        const existingUser = await User.findOne({ email }).lean();
        if (existingUser) {
            return res.status(409).json({
                ok: false,
                message: "An account with this email already exists.",
            });
        }

        const user = await User.createUserAccount({
            fullName,
            email,
            role,
            status,
            addresses: sanitizeAddresses(req.body.addresses),
            storeId: store ? store._id : null,
            storeCode: store ? store.storeCode : null,
            ...makePasswordHash(password),
        });

        res.status(201).json({
            ok: true,
            data: publicUser(user),
        });
    } catch (error) {
        console.error("[Users] Failed to create user:", error);
        res.status(500).json({
            ok: false,
            message: "Unable to create user.",
        });
    }
}

// #07 - As a user admin, I want to view a user account so that I can view the user's details.
async function listUsers(req, res) {
    try {
        const search = String(req.query.search || "").trim();
        const query = search
            ? {
                $or: [
                    { fullName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { role: { $regex: search, $options: "i" } },
                    { status: { $regex: search, $options: "i" } },
                ],
            }
            : {};

        const users = await User.find(query)
            .select("-passwordHash -passwordSalt")
            .sort({ fullName: 1 });

        res.json({
            ok: true,
            data: users.map(publicUser),
        });
    } catch (error) {
        console.error("[Users] Failed to load users:", error);
        res.status(500).json({
            ok: false,
            message: "Unable to load users.",
        });
    }
}

// #08  - As a user admin, I want to update a user account so that I can keep user records up to date.
// #246 - As a customer, I want to update my account so that I can make sure the information is the latest.
// #302 - As a customer, I want to update my delivery address so that I can select my preferred location to pick up my order.
async function updateUser(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ ok: false, message: "A valid user id is required." });
        }

        const update = {};
        const allowedStatuses = ["active", "suspended", "inactive"];

        if (req.body.fullName !== undefined) {
            update.fullName = String(req.body.fullName || "").trim();
            if (!update.fullName) return res.status(400).json({ ok: false, message: "Full name is required." });
        }

        if (req.body.email !== undefined) {
            update.email = String(req.body.email || "").trim().toLowerCase();

            // Edit form uses the same email rule as the create form.
            const emailError = validateEmail(update.email, ADMIN_EMAIL_DOMAINS);
            if (emailError) return res.status(400).json({ ok: false, message: emailError });

            const duplicate = await User.findOne({ email: update.email, _id: { $ne: req.params.id } }).lean();
            if (duplicate) return res.status(409).json({ ok: false, message: "An account with this email already exists." });
        }

        if (req.body.role !== undefined) {
            update.role = String(req.body.role);
            const roleProfile = await Profile.findOne({ value: update.role, status: "active" }).lean();
            if (!roleProfile) return res.status(400).json({ ok: false, message: "Role is invalid." });
        }

        if (req.body.status !== undefined) {
            update.status = String(req.body.status);
            if (!allowedStatuses.includes(update.status)) return res.status(400).json({ ok: false, message: "Status is invalid." });
        }

        if (req.body.profilePic !== undefined) {
            update.profilePic = String(req.body.profilePic || "");
        }

        if (req.body.storeCode !== undefined) {
            if (!req.body.storeCode) {
                update.storeId = null;
                update.storeCode = null;
            } else {
                const store = await Store.findOne({ storeCode: String(req.body.storeCode).trim() }).lean();
                if (!store) return res.status(400).json({ ok: false, message: "The selected store could not be found." });
                update.storeId = store._id;
                update.storeCode = store.storeCode;
            }
        }

        if (req.body.addresses !== undefined) {
            update.addresses = sanitizeAddresses(req.body.addresses);
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ ok: false, message: "No changes were submitted." });
        }

        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

        if (!user) {
            return res.status(404).json({ ok: false, message: "User not found." });
        }

        res.json({
            ok: true,
            data: publicUser(user),
        });
    } catch (error) {
        console.error("[Users] Failed to update user:", error);
        res.status(500).json({
            ok: false,
            message: "Unable to update user.",
        });
    }
}

// #09  - As a user admin, I want to suspend a user account so that I can prevent unauthorized access.
async function suspendUser(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ ok: false, message: "A valid user id is required." });
        }

        const user = await User.suspendUser(req.params.id);
        if (!user) {
            return res.status(404).json({ ok: false, message: "User not found." });
        }

        res.json({
            ok: true,
            data: publicUser(user),
        });
    } catch (error) {
        console.error("[Users] Failed to suspend user:", error);
        res.status(500).json({
            ok: false,
            message: "Unable to suspend user.",
        });
    }
}

// #10 - As a user admin, I want to search for a user by username so that I can get the user's information quickly.
async function searchUsers(req, res) {
    try {
        const search = String(req.query.search || "").trim();
        const query = search
            ? {
                $or: [
                    { fullName: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { role: { $regex: search, $options: "i" } },
                    { status: { $regex: search, $options: "i" } },
                ],
            }
            : {};

        const users = await User.find(query)
            .select("-passwordHash -passwordSalt")
            .sort({ fullName: 1 });

        res.json({
            ok: true,
            data: users.map(publicUser),
        });
    } catch (error) {
        console.error("[Users] Failed to search users:", error);
        res.status(500).json({
            ok: false,
            message: "Unable to search users.",
        });
    }
}

// #191 Register (Customer) | #6 Create User Account (Admin)
// Calls User.register() -> hashes password -> inserts into users collection -> returns user + token.
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
// Calls User.resetPassword() -> finds user by email -> rehashes new password -> updates users collection.
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
// Calls User.changePassword() -> verifies current password -> rehashes new password -> updates users collection.
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
    listUsers,
    searchUsers,
    createUser,
    updateUser,
    suspendUser,
    listProfiles,
    searchProfile,
    createProfile,
    updateProfile,
    suspendProfile,
};
