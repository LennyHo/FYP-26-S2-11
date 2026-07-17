// User Story Architecture Trace — menu.routes.js
//
// #13  View Menu (Customer)
//      View: buy-driptea/page.tsx → Route: menu.routes.js (this file) → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #21  Search Beverages (Customer)
//      View: buy-driptea/page.tsx → Route: menu.routes.js (this file) → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #27  Search Beverages via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js → Route: menu.routes.js (this file) → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #33  Create Menu Items (Store Staff)
//      View: store-staff/page.tsx → Route: menu.routes.js (this file) → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #34  View Menu Items (Store Staff)
//      View: store-staff/page.tsx → Route: menu.routes.js (this file) → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #35  Update Menu Items (Store Staff)
//      View: store-staff/page.tsx → Route: menu.routes.js (this file) → Ctrl: menu.controller.js → Model: menuItem.model.js
//
// #36  Search Menu Items (Store Staff)
//      View: store-staff/page.tsx → Route: menu.routes.js (this file) → Ctrl: menu.controller.js → Model: menuItem.model.js

const express = require("express");
const menuController = require("../controllers/menu.controller");

const router = express.Router();

// #13 View Menu | #34 View Menu Items (Store Staff)
router.get("/menu-items", menuController.getMenu);

// #21 - As a customer, I want to search for beverages by name so that I can locate specific drinks quickly.
// #27 - As a customer, I want to search for beverages using the AI chatbot so that I can find what I want quickly.
// #36 - As a store staff, I want to search menu items by name so that I can find the beverage.
router.get("/menu/search", menuController.searchBeverage);

// #33 - As a store staff, I want to create menu items so that new beverages can be added.
router.post("/menu-items", menuController.createMenuItem);

// #35 - As store staff, I want to update menu items so that prices, descriptions, and availability remain accurate.
router.patch("/menu-items/:id", menuController.updateMenuItem);

router.patch("/menu-items/:id/status", menuController.updateMenuItemStatus);

router.patch("/menu-items/:id/new-arrival", menuController.toggleNewArrival);

module.exports = router;
