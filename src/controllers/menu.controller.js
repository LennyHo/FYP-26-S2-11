// User Story Architecture Trace — menu.controller.js
//
// #13  View Menu (Customer)
//      View: buy-driptea/page.tsx → Route: menu.routes.js → Ctrl: menu.controller.js (this file) → Model: menuItem.model.js
//
// #21  Search Beverages (Customer)
//      View: buy-driptea/page.tsx → Route: menu.routes.js → Ctrl: menu.controller.js (this file) → Model: menuItem.model.js
//
// #27  Search Beverages via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Ctrl: menu.controller.js (this file) → Model: menuItem.model.js
//
// #33  Create Menu Items (Store Staff)
//      View: store-staff/page.tsx → Route: menu.routes.js → Ctrl: menu.controller.js (this file) → Model: menuItem.model.js
//
// #34  View Menu Items (Store Staff)
//      View: store-staff/page.tsx → Route: menu.routes.js → Ctrl: menu.controller.js (this file) → Model: menuItem.model.js
//
// #35  Update Menu Items (Store Staff)
//      View: store-staff/page.tsx → Route: menu.routes.js → Ctrl: menu.controller.js (this file) → Model: menuItem.model.js
//
// #36  Search Menu Items (Store Staff)
//      View: store-staff/page.tsx → Route: menu.routes.js → Ctrl: menu.controller.js (this file) → Model: menuItem.model.js

const MenuItem = require("../models/menuItem.model");
const mongoose = require("mongoose");

function normalizeImagePath(image, itemId) {
  if (image) {
    // base64 data URLs and http(s) URLs are always valid — use as-is
    if (image.startsWith("data:") || image.startsWith("http")) return image;
    // Fix folder name with space: "/img/bubble teas/..." → "/img/bubble_teas/..."
    const fixed = image.replace(/\/img\/bubble\s+teas?\//i, "/img/bubble_teas/");
    // If the path resolves to a known bXXX pattern it's good; otherwise fall back
    if (/\/img\/bubble_teas\/b\d+\.(jpg|png|webp)$/i.test(fixed)) return fixed;
  }
  // Only guess an itemId-based file for the seeded catalog (bNNN) — custom staff-added
  // items (itemId like "custom_<timestamp>") have no matching file and would 404.
  if (/^b\d+$/i.test(itemId)) return `/img/bubble_teas/${itemId}.jpg`;
  return "/img/bubble_teas/b001.jpg";
}

// Returns a field-specific error message for a drink payload, or "" when valid.
// Mirrors the per-field checks the store-staff form shows, so a direct API call
// gets the same rules the browser enforces.
function validateDrinkFields({ name, category, price, calories, sugar }) {
  if (!name) return "Drink name is required.";
  if (!category) return "Category is required.";
  if (!Number.isFinite(price)) return "Price must be a number.";
  if (price <= 0) return "Price must be greater than 0.";
  if (Math.round(price * 100) !== price * 100) return "Price can have at most 2 decimal places.";
  if (calories < 0) return "Calories must be 0 or more.";
  if (sugar < 0) return "Sugar must be 0 or more.";
  return "";
}

function publicMenuItem(item) {
  const nutrition = item.nutritionInfo || {};
  return {
    id: item.itemId || item._id.toString(),
    mongoId: item._id.toString(),
    menuItemId: item._id.toString(),
    name: item.name,
    category: item.category,
    price: item.price,
    description: item.description,
    image: normalizeImagePath(item.image, item.itemId),
    status: item.status,
    tags: item.tags || [],
    base_calories: nutrition.baseCalories ?? 0,
    base_sugar_g: nutrition.baseSugarG ?? 0,
    nutri_grade: nutrition.nutriGrade || 'B',
    customizationOptions: item.customizationOptions || [],
    nutritionInfo: nutrition,
    drinkInfo: item.drinkInfo || { ingredients: [], diabeticAdvice: '', insulinImpact: '' },
    rating: item.rating || 0,
    isNewArrival: item.isNewArrival || false,
  };
}

// #13 - As a customer, I want to view the menu so that I know which beverages are available.
// #34 - As a store staff, I want to view menu items so that I can review the available beverages.
// Calls MenuItem.getMenu() → queries menu_items collection filtered by status → returns sorted list.
async function getMenu(req, res, next) {
  try {
    const menuItems = await MenuItem.getMenu(req.query.status);

    return res.json({
      ok: true,
      data: menuItems.map(publicMenuItem),
    });
  } catch (error) {
    console.error("[MenuController] getMenu error:", error.message);

    return res.status(500).json({
      ok: false,
      message: "Failed to load menu.",
    });
  }
}

// #21 - As a customer, I want to search for beverages by name so that I can locate specific drinks quickly.
// #27 - As a customer, I want to search for beverages using the AI chatbot so that I can find what I want quickly.
// #36 - As a store staff, I want to search menu items by name so that I can find the beverage.
// Calls MenuItem.searchBeverage() → regex search across name, category, description, tags in menu_items.
async function searchBeverage(req, res) {
  try {
    const keyword = req.query.q || req.query.keyword || "";

    const beverages = await MenuItem.searchBeverage(keyword);

    res.json({
      ok: true,
      data: beverages.map(publicMenuItem),
    });
  } catch (error) {
    console.error("[MenuController] searchBeverage failed:", error);

    res.status(500).json({
      ok: false,
      message: "Unable to search beverages.",
    });
  }
}

// #33 - As a store staff, I want to create menu items so that new beverages can be added.
// Validates required fields → inserts new document into menu_items collection with auto-generated itemId.
async function createMenuItem(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const category = String(req.body.category || "").trim();
    const price = Number(req.body.price);
    const description = String(req.body.description || "").trim();
    const status = String(req.body.status || "active").trim().toLowerCase();
    const tags = Array.isArray(req.body.tags) ? req.body.tags.map(String) : [];
    const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients.map(String) : [];
    const calories = Number.isFinite(Number(req.body.calories)) ? Number(req.body.calories) : 0;
    const sugar = Number.isFinite(Number(req.body.sugar)) ? Number(req.body.sugar) : 0;
    const allowedGrades = ["A", "B", "C", "D"];
    const nutriGrade = allowedGrades.includes(String(req.body.nutriGrade || "").toUpperCase())
      ? String(req.body.nutriGrade).toUpperCase()
      : "B";

    const validationError = validateDrinkFields({ name, category, price, calories, sugar });
    if (validationError) {
      return res.status(400).json({ ok: false, message: validationError });
    }

    const existingItem = await MenuItem.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();
    if (existingItem) {
      return res.status(409).json({
        ok: false,
        message: `A drink named "${name}" already exists.`,
      });
    }

    // Student note: custom menu item IDs keep new drinks separate from seeded b001 drinks.
    const image = typeof req.body.image === "string" ? req.body.image : "";

    const item = await MenuItem.create({
      itemId: `custom_${Date.now()}`,
      name,
      category,
      price,
      description,
      tags,
      status: status === "inactive" ? "inactive" : "active",
      image,
      customizationOptions: [],
      drinkInfo: {
        ingredients,
        diabeticAdvice: "",
        insulinImpact: "",
      },
      nutritionInfo: {
        baseCalories: calories,
        baseSugarG: sugar,
        baseVolumeMl: 500,
        nutriGrade,
      },
    });

    res.status(201).json({
      ok: true,
      data: publicMenuItem(item),
    });
  } catch (error) {
    console.error("[MenuController] createMenuItem failed:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to create menu item.",
    });
  }
}

// #35 - As store staff, I want to update menu items so that prices, descriptions, and availability remain accurate.
// Finds menu item by id or itemId → updates the editable fields (name, category, price, description,
// ingredients, nutrition, tags, image) in the menu_items collection.
async function updateMenuItem(req, res) {
  try {
    const id = String(req.params.id || "");
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { itemId: id }] }
      : { itemId: id };

    const name = String(req.body.name || "").trim();
    const category = String(req.body.category || "").trim();
    const price = Number(req.body.price);
    const description = String(req.body.description || "").trim();
    const tags = Array.isArray(req.body.tags) ? req.body.tags.map(String) : [];
    const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients.map(String) : [];
    const calories = Number.isFinite(Number(req.body.calories)) ? Number(req.body.calories) : 0;
    const sugar = Number.isFinite(Number(req.body.sugar)) ? Number(req.body.sugar) : 0;
    const allowedGrades = ["A", "B", "C", "D"];
    const nutriGrade = allowedGrades.includes(String(req.body.nutriGrade || "").toUpperCase())
      ? String(req.body.nutriGrade).toUpperCase()
      : "B";

    const validationError = validateDrinkFields({ name, category, price, calories, sugar });
    if (validationError) {
      return res.status(400).json({ ok: false, message: validationError });
    }

    const current = await MenuItem.findOne(query).lean();
    if (!current) {
      return res.status(404).json({
        ok: false,
        message: "Menu item not found.",
      });
    }

    const duplicate = await MenuItem.findOne({
      _id: { $ne: current._id },
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();
    if (duplicate) {
      return res.status(409).json({
        ok: false,
        message: `A drink named "${name}" already exists.`,
      });
    }

    const updateFields = {
      name,
      category,
      price,
      description,
      tags,
      "drinkInfo.ingredients": ingredients,
      "nutritionInfo.baseCalories": calories,
      "nutritionInfo.baseSugarG": sugar,
      "nutritionInfo.nutriGrade": nutriGrade,
    };

    if (typeof req.body.image === "string" && req.body.image) {
      updateFields.image = req.body.image;
    }

    const item = await MenuItem.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        ok: false,
        message: "Menu item not found.",
      });
    }

    res.json({
      ok: true,
      data: publicMenuItem(item),
    });
  } catch (error) {
    console.error("[MenuController] updateMenuItem failed:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to update menu item.",
    });
  }
}

// #35 - As store staff, I want to update menu items so that prices, descriptions, and availability remain accurate.
// Finds menu item by id or itemId → updates status field to active or inactive in menu_items collection.
async function updateMenuItemStatus(req, res) {
  try {
    const status = String(req.body.status || "").trim().toLowerCase();

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        ok: false,
        message: "Status must be active or inactive.",
      });
    }

    const id = String(req.params.id || "");
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { itemId: id }] }
      : { itemId: id };

    // This lets the dashboard hide/show drinks without deleting menu data.
    // When deactivating, also clear isNewArrival so the DB stays consistent.
    const updateFields = status === "inactive"
      ? { status, isNewArrival: false }
      : { status };

    const item = await MenuItem.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        ok: false,
        message: "Menu item not found.",
      });
    }

    res.json({
      ok: true,
      data: publicMenuItem(item),
    });
  } catch (error) {
    console.error("[MenuController] updateMenuItemStatus failed:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to update menu item.",
    });
  }
}


async function toggleNewArrival(req, res) {
  try {
    const id = String(req.params.id || "");
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { itemId: id }] }
      : { itemId: id };

    const current = await MenuItem.findOne(query).lean();
    if (!current) {
      return res.status(404).json({ ok: false, message: "Menu item not found." });
    }

    const item = await MenuItem.findOneAndUpdate(
      query,
      { $set: { isNewArrival: !current.isNewArrival } },
      { new: true, runValidators: true }
    );

    res.json({ ok: true, data: publicMenuItem(item) });
  } catch (error) {
    console.error("[MenuController] toggleNewArrival failed:", error);
    res.status(500).json({ ok: false, message: "Unable to update new arrival flag." });
  }
}

module.exports = {
  getMenu,
  searchBeverage,
  createMenuItem,
  updateMenuItem,
  updateMenuItemStatus,
  toggleNewArrival,
};
