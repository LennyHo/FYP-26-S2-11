// User Story Architecture Trace — inventory.routes.js
//
// #310 Create Inventory Item (Store Staff)
//      View: store-staff/page.tsx  -> Route: inventory.routes.js (this file) -> Ctrl: inventory.controller.js -> Model: inventory.model.js
//
// #311  View Inventory (Store Staff)
//      View: store-staff/page.tsx -> Route: inventory.routes.js (this file) -> Ctrl: inventory.controller.js -> Model: inventory.model.js
//
// #312  Update Inventory (Store Staff)
//      View: store-staff/page.tsx -> Route: inventory.routes.js (this file) -> Ctrl: inventory.controller.js -> Model: inventory.model.js
//
// #313  Delete Inventory Item (Store Staff)
//     View: store-staff/page.tsx -> Route: inventory.routes.js (this file) -> Ctrl: inventory.controller.js -> Model: inventory.model.js 

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
