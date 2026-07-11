// User Story Architecture Trace — store.model.js
//
// #StoreLocator  View Store Locations (Customer)
//      View: stores/page.tsx → Route: store.routes.js → Ctrl: store.controller.js → Model: store.model.js (this file)
//
// #Pickup        Select Pickup Store at Checkout
//      View: checkout/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js → Model: store.model.js (this file)
//
// #Delivery      Calculate Delivery Route
//      View: order-status/[orderId]/page.tsx → Route: store.routes.js → Ctrl: store.controller.js → Model: store.model.js (this file)

const mongoose = require("mongoose");

const SEED_STORES = [
  {
    storeCode: "DT-001",
    name: "DripTea Orchard",
    address: "313 Orchard Road, #B2-01, Singapore 238895",
    lat: 1.3006,
    lng: 103.8389,
    phone: "+65 6123 4567",
    openingHours: { weekday: "10:00 – 22:00", weekend: "09:00 – 23:00" },
    status: "active",
  },
  {
    storeCode: "DT-002",
    name: "DripTea Jurong East",
    address: "50 Jurong Gateway Road, #03-12 JEM, Singapore 608549",
    lat: 1.3336,
    lng: 103.7436,
    phone: "+65 6234 5678",
    openingHours: { weekday: "10:00 – 22:00", weekend: "09:00 – 23:00" },
    status: "active",
  },
];

const storeSchema = new mongoose.Schema(
  {
    storeCode: { type: String, required: true, unique: true, trim: true },
    name:      { type: String, required: true, trim: true },
    address:   { type: String, required: true, trim: true },
    lat:       { type: Number, required: true },
    lng:       { type: Number, required: true },
    phone:     { type: String, default: "" },
    openingHours: {
      weekday: { type: String, default: "10:00 – 22:00" },
      weekend: { type: String, default: "09:00 – 23:00" },
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, collection: "stores" }
);

// Returns all active stores sorted by name.
storeSchema.statics.getActiveStores = async function getActiveStores() {
  return this.find({ status: "active" }).sort({ name: 1 }).lean();
};

// Returns the nearest store to a given lat/lng using MongoDB's $geoNear alternative (simple distance calc).
storeSchema.statics.findNearest = async function findNearest(lat, lng) {
  const stores = await this.find({ status: "active" }).lean();
  if (!stores.length) return null;

  return stores.reduce((nearest, store) => {
    const dist = Math.hypot(store.lat - lat, store.lng - lng);
    const nearestDist = Math.hypot(nearest.lat - lat, nearest.lng - lng);
    return dist < nearestDist ? store : nearest;
  });
};

// Seeds the stores collection from SEED_STORES on server startup (skips stores that already exist).
storeSchema.statics.initializeSeedStores = async function initializeSeedStores() {
  try {
    for (const seed of SEED_STORES) {
      const existing = await this.findOne({ storeCode: seed.storeCode }).lean();
      if (!existing) {
        await this.create(seed);
      }
    }
  } catch (error) {
    console.error("[Store] Seed error:", error.message);
  }
};

module.exports = mongoose.model("Store", storeSchema);
