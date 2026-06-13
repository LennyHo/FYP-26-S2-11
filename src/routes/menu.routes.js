const express = require("express");
const menuController = require("../controllers/menu.controller");

const router = express.Router();

// #13 - As a customer, I want to view the menu so that I know which beverages are available.
// #34 - As a store staff, I want to view menu items so that I can review the available beverages.
router.get("/menu-items", menuController.getMenu);

// #21 - As a customer, I want to search for beverages by name so that I can locate specific drinks quickly.
// #27 - As a customer, I want to search for beverages using the AI chatbot so that I can find what I want quickly.
// #36 - As a store staff, I want to search menu items by name so that I can find the beverage.
router.get("/menu/search", menuController.searchBeverage);

// #33 - As a store staff, I want to create menu items so that new beverages can be added.
router.post("/menu-items", menuController.createMenuItem);

// #35 - As store staff, I want to update menu items so that prices, descriptions, and availability remain accurate.
router.patch("/menu-items/:id/status", menuController.updateMenuItemStatus);

module.exports = router;
