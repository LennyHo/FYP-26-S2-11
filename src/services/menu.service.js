const MenuItem = require("../models/menuItem.model");

async function getMenu() {
  return MenuItem.find({ status: "active" })
    .sort({ category: 1, name: 1 })
    .lean();
}

module.exports = {
  getMenu,
};