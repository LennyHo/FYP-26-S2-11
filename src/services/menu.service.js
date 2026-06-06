const MenuItem = require("../models/menuItem.model");

async function getMenu(status = "active") {
  const selectedStatus = String(status || "active").toLowerCase();
  const query = selectedStatus === "all" ? {} : { status: selectedStatus };

  return MenuItem.find(query)
    .sort({ category: 1, name: 1 })
    .lean();
}

module.exports = {
  getMenu,
};
