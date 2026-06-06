const express = require("express");
const menuController = require("../controllers/menu.controller");

const router = express.Router();

router.get("/menu-items", menuController.getMenu);
router.get("/menu/search", menuController.searchBeverage);

module.exports = router;