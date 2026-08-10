// User Story Architecture Trace — inventory.routes.js

const express = require("express");
const inventoryController = require("../controllers/inventory.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// Inventory is store_staff-only, scoped to the requester's own store.
const staffOnly = [requireAuth, requireRole("store_staff")];

// #310 - As a store staff, I want to create inventory items so that I can add new products.
// #311 - As a store staff, I want to view the inventory so that I can monitor stock levels.
// #312 - As a store staff, I want to update inventory so that I can keep stock information accurate.
// #313 - As a store staff, I want to delete inventory so that I can remove items.
router.get("/inventory", ...staffOnly, inventoryController.getInventory);
router.get("/inventory/:id", ...staffOnly, inventoryController.getInventoryItem);
router.post("/inventory", ...staffOnly, inventoryController.createInventory);
router.patch("/inventory/:id", ...staffOnly, inventoryController.updateInventoryQuantity);
router.delete("/inventory/:id", ...staffOnly, inventoryController.deleteInventory);

module.exports = router;
