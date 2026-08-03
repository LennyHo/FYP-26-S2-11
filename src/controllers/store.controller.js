// User Story Architecture Trace — store.controller.js

const Store = require("../models/store.model");
const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");

const ACTIVE_ORDER_STATUSES = ["pending", "paid", "preparing", "ready"];

function getCrowdLevel(orderCount) {
  if (orderCount <= 0) return "quiet";
  if (orderCount <= 3) return "steady";
  return "busy";
}

function publicStore(store) {
  return {
    storeCode: store.storeCode,
    name: store.name,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    phone: store.phone,
    openingHours: store.openingHours,
    status: store.status,
  };
}

// #24: As a customer, I want to view store locations so that I can find a DripTea near me.
// Calls Store.getActiveStores() -> queries stores collection filtered by status -> returns sorted list.
async function getStores(req, res) {
  try {
    const stores = await Store.getActiveStores();

    res.json({
      ok: true,
      data: stores.map(publicStore),
    });
  } catch (error) {
    console.error("[StoreController] getStores failed:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to load stores.",
    });
  }
}

// #301 - Customer crowdsource view: show live order/cup load per store.
async function getStoreCrowdStats(req, res) {
  try {
    const stores = await Store.getActiveStores();
    const storeIds = stores.map((store) => store._id);
    const orders = storeIds.length
      ? await Order.find({
          storeId: { $in: storeIds },
          status: { $in: ACTIVE_ORDER_STATUSES },
        }).lean()
      : [];

    const orderIds = orders.map((order) => order._id);
    const cupsByOrderId = new Map();

    if (orderIds.length) {
      const cupRows = await OrderItem.aggregate([
        { $match: { orderId: { $in: orderIds } } },
        { $group: { _id: "$orderId", cups: { $sum: "$quantity" } } },
      ]);

      cupRows.forEach((row) => {
        cupsByOrderId.set(String(row._id), Number(row.cups || 0));
      });
    }

    const summaryByStoreId = new Map();

    orders.forEach((order) => {
      const storeId = String(order.storeId);
      const current = summaryByStoreId.get(storeId) || {
        activeOrderCount: 0,
        activeCupCount: 0,
      };

      current.activeOrderCount += 1;
      current.activeCupCount += cupsByOrderId.get(String(order._id)) || 0;
      summaryByStoreId.set(storeId, current);
    });

    res.json({
      ok: true,
      data: stores.map((store) => {
        const summary = summaryByStoreId.get(String(store._id)) || {
          activeOrderCount: 0,
          activeCupCount: 0,
        };

        return {
          storeCode: store.storeCode,
          storeName: store.name,
          activeOrderCount: summary.activeOrderCount,
          activeCupCount: summary.activeCupCount,
          crowdLevel: getCrowdLevel(summary.activeOrderCount),
          updatedAt: new Date().toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error("[StoreController] getStoreCrowdStats failed:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to load store crowd stats.",
    });
  }
}

module.exports = {
  getStores,
  getStoreCrowdStats,
};
