// User Story Architecture Trace — store.routes.js

const express = require("express");
const storeController = require("../controllers/store.controller");

const router = express.Router();

// #24: As a customer, I want to view store locations so that I can find nearby outlets
router.get("/stores", storeController.getStores);

// #31 - As a customer, I want to see the number of orders for a store location so that I can gauge how busy a location is, before placing an order.
router.get("/stores/crowd", storeController.getStoreCrowdStats);

module.exports = router;
