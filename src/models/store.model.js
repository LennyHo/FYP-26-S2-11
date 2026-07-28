// User Story Architecture Trace — store.model.js
//
// #30  Check Store Location via Chatbot
//      View: ChatbotSidebar.tsx → Ctrl: chatbot.controller.js → Svc: chatbot.service.js  → Model: store.model.js (this file)
//
// #Pickup        Select Pickup Store at Checkout
//      View: checkout/page.tsx → Route: checkout.routes.js → Ctrl: order.controller.js → Model: store.model.js (this file)
//
// #Delivery      Calculate Delivery Route
//      View: order-status/[orderId]/page.tsx → Route: store.routes.js → Ctrl: store.controller.js → Model: store.model.js (this file)

const mongoose = require("mongoose");

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

module.exports = mongoose.model("Store", storeSchema);
