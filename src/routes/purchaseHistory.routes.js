const express = require("express");
const purchaseHistoryController = require("../controllers/purchaseHistory.controller");

const router = express.Router();

router.get("/purchase-history", purchaseHistoryController.getPurchaseHistory);

module.exports = router;