const menuService = require("../services/menu.service");
const MenuItem = require("../models/menuItem.model");

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

async function searchBeverage(req, res) {
  try {
    const keyword = req.query.q || req.query.keyword || "";

    const beverages = await MenuItem.searchBeverage(keyword);

    res.json({
      ok: true,
      data: beverages.map((item) => ({
        id: item.itemId || item._id.toString(),
        menuItemId: item._id.toString(),
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        image: item.image || `/img/bubble_teas/${item.itemId}.png`,
        status: item.status,
        tags: item.tags || [],
      })),
    });
  } catch (error) {
    console.error("[MenuController] searchBeverage failed:", error);

    res.status(500).json({
      ok: false,
      message: "Unable to search beverages.",
    });
  }
}


module.exports = {
  getMenu,
  searchBeverage
};