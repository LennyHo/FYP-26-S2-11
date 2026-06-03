const menuService = require("../services/menu.service");

async function getMenu(req, res, next) {
  try {
    const menuItems = await menuService.getMenu();

    return res.json({
      ok: true,
      data: menuItems,
    });
  } catch (error) {
    console.error("[MenuController] getMenu error:", error.message);

    return res.status(500).json({
      ok: false,
      message: "Failed to load menu.",
    });
  }
}

module.exports = {
  getMenu,
};