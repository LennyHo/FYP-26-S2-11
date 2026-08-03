// User Story Architecture Trace — inventory.routes.js

const express = require("express");
const inventoryController = require("../controllers/inventory.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// Inventory is store_staff-only, scoped to the requester's own store.
const staffOnly = [requireAuth, requireRole("store_staff")];

router.get("/inventory", ...staffOnly, inventoryController.getInventory);
router.get("/inventory/:id", ...staffOnly, inventoryController.getInventoryItem);
router.post("/inventory", ...staffOnly, inventoryController.createInventory);
router.patch("/inventory/:id", ...staffOnly, inventoryController.updateInventoryQuantity);
router.delete("/inventory/:id", ...staffOnly, inventoryController.deleteInventory);

module.exports = router;
