const express = require("express");
const inventoryController = require("../controllers/inventory.controller");

const router = express.Router();

router.get("/inventory", inventoryController.getInventory);
router.get("/inventory/:id", inventoryController.getInventoryItem);
router.post("/inventory", inventoryController.createInventory);
router.patch("/inventory/:id", inventoryController.updateInventoryQuantity);
router.delete("/inventory/:id", inventoryController.deleteInventory);

module.exports = router;
