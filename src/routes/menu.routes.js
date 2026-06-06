const express = require("express");
const menuController = require("../controllers/menu.controller");

const router = express.Router();

router.get("/menu-items", menuController.getMenu);
router.get("/menu/search", menuController.searchBeverage);
// Student note: admin/staff screens use these to manage menu availability.
router.post("/menu-items", menuController.createMenuItem);
router.patch("/menu-items/:id/status", menuController.updateMenuItemStatus);

module.exports = router;
