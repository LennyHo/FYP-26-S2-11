const menuService = require("../services/menu.service");
const MenuItem = require("../models/menuItem.model");
const mongoose = require("mongoose");

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
    image: item.image || `/img/bubble_teas/${item.itemId}.jpg`,
    status: item.status,
    tags: item.tags || [],
    base_calories: nutrition.baseCalories ?? 0,
    base_sugar_g: nutrition.baseSugarG ?? 0,
    nutri_grade: nutrition.nutriGrade || 'B',
    customizationOptions: item.customizationOptions || [],
    nutritionInfo: nutrition,
  };
}

async function getMenu(req, res, next) {
  try {
    const menuItems = await menuService.getMenu(req.query.status);

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

async function createMenuItem(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const category = String(req.body.category || "").trim();
    const price = Number(req.body.price);
    const description = String(req.body.description || "").trim();
    const status = String(req.body.status || "active").trim().toLowerCase();
    const tags = Array.isArray(req.body.tags) ? req.body.tags.map(String) : [];

    if (!name || !category || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        ok: false,
        message: "Name, category, and valid price are required.",
      });
    }

    // Student note: custom menu item IDs keep new drinks separate from seeded b001 drinks.
    const item = await MenuItem.create({
      itemId: `custom_${Date.now()}`,
      name,
      category,
      price,
      description,
      tags,
      status: status === "inactive" ? "inactive" : "active",
      image: "",
      customizationOptions: [],
      nutritionInfo: {
        baseCalories: 0,
        baseSugarG: 0,
        baseVolumeMl: 500,
        nutriGrade: "B",
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
    const item = await MenuItem.findOneAndUpdate(
      query,
      { $set: { status } },
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


module.exports = {
  getMenu,
  searchBeverage,
  createMenuItem,
  updateMenuItemStatus,
};
