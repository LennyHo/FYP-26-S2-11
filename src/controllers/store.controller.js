// User Story Architecture Trace — store.controller.js
//
// #StoreLocator  View Store Locations (Customer)
//      View: global-stores/page.tsx, StoreMap.tsx, MeetTheCrew.tsx, DeliveryMap.jsx
//      → Route: store.routes.js → Ctrl: store.controller.js (this file) → Model: store.model.js

const Store = require("../models/store.model");

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

// As a customer, I want to view store locations so that I can find a DripTea near me.
// Calls Store.getActiveStores() → queries stores collection filtered by status → returns sorted list.
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

module.exports = {
  getStores,
};
