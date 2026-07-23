// User Story Architecture Trace — store.routes.js
//
// #StoreLocator  View Store Locations (Customer)
//      View: global-stores/page.tsx, StoreMap.tsx, MeetTheCrew.tsx, DeliveryMap.jsx
//      → Route: store.routes.js (this file) → Ctrl: store.controller.js → Model: store.model.js

const express = require("express");
const storeController = require("../controllers/store.controller");

const router = express.Router();

// As a customer, I want to view store locations so that I can find a DripTea near me.
router.get("/stores", storeController.getStores);

// #301 - As a customer, I want to see live store crowd/order load before ordering.
router.get("/stores/crowd", storeController.getStoreCrowdStats);

module.exports = router;
