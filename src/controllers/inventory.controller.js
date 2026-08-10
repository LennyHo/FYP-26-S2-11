// User Story Architecture Trace — inventory.controller.js

const Inventory = require("../models/inventory.model");
const mongoose = require("mongoose");

async function getInventory(req, res) {
  try {
    const items = await Inventory.getAll(req.user.storeId);
    res.json({ ok: true, data: items });
  } catch (error) {
    console.error("[InventoryController] getInventory error:", error.message);
    res.status(500).json({ ok: false, message: "Failed to load inventory." });
  }
}

// #311 - As a store staff, I want to view the inventory so that I can monitor stock levels.
async function getInventoryItem(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid inventory item ID." });
    }
    const item = await Inventory.getById(id);
    if (!item || String(item.storeId) !== req.user.storeId) {
      return res.status(404).json({ ok: false, message: "Inventory item not found." });
    }
    res.json({ ok: true, data: item });
  } catch (error) {
    console.error("[InventoryController] getInventoryItem error:", error.message);
    res.status(500).json({ ok: false, message: "Failed to load inventory item." });
  }
}

// #310 - As a store staff, I want to create inventory items so that I can add new products.
async function createInventory(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const unit = String(req.body.unit || "").trim();
    const quantity = Number(req.body.quantity ?? 0);
    const lowStockThreshold = Number.isFinite(Number(req.body.lowStockThreshold))
      ? Number(req.body.lowStockThreshold)
      : 5;
    const description = String(req.body.description || "").trim();

    if (!name || !unit) {
      return res.status(400).json({ ok: false, message: "Name and unit are required." });
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ ok: false, message: "Quantity must be a non-negative number." });
    }

    // storeId always comes from the authenticated staff session, never the client,
    // so a staff account can't write into another store's inventory.
    const item = await Inventory.create({
      name,
      quantity,
      unit,
      lowStockThreshold,
      description,
      storeId: req.user.storeId,
    });
    res.status(201).json({ ok: true, data: item });
  } catch (error) {
    console.error("[InventoryController] createInventory error:", error.message);
    res.status(500).json({ ok: false, message: "Failed to create inventory item." });
  }
}

// #312 - As a store staff, I want to update inventory so that I can keep stock information accurate.
async function updateInventoryQuantity(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid inventory item ID." });
    }
    const quantity = Number(req.body.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ ok: false, message: "Quantity must be a non-negative number." });
    }

    const existing = await Inventory.getById(id);
    if (!existing || String(existing.storeId) !== req.user.storeId) {
      return res.status(404).json({ ok: false, message: "Inventory item not found." });
    }

    const item = await Inventory.findByIdAndUpdate(
      id,
      { $set: { quantity } },
      { new: true, runValidators: true }
    ).lean();

    res.json({ ok: true, data: item });
  } catch (error) {
    console.error("[InventoryController] updateInventoryQuantity error:", error.message);
    res.status(500).json({ ok: false, message: "Failed to update inventory quantity." });
  }
}

// #313 - As a store staff, I want to delete inventory so that I can remove items.
async function deleteInventory(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid inventory item ID." });
    }

    const existing = await Inventory.getById(id);
    if (!existing || String(existing.storeId) !== req.user.storeId) {
      return res.status(404).json({ ok: false, message: "Inventory item not found." });
    }

    await Inventory.findByIdAndDelete(id).lean();
    res.json({ ok: true, data: { id } });
  } catch (error) {
    console.error("[InventoryController] deleteInventory error:", error.message);
    res.status(500).json({ ok: false, message: "Failed to delete inventory item." });
  }
}

module.exports = {
  getInventory,
  getInventoryItem,
  createInventory,
  updateInventoryQuantity,
  deleteInventory,
};
