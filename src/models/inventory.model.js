// User Story Architecture Trace — inventory.model.js
//
// #310 Create Inventory Item (Store Staff)
//      View: store-staff/page.tsx  -> Route: inventory.routes.js -> Ctrl: inventory.controller.js -> Model: inventory.model.js (this file)
//
// #311  View Inventory (Store Staff)
//      View: store-staff/page.tsx -> Route: inventory.routes.js -> Ctrl: inventory.controller.js -> Model: inventory.model.js (this file)
//
// #312  Update Inventory (Store Staff)
//      View: store-staff/page.tsx -> Route: inventory.routes.js -> Ctrl: inventory.controller.js -> Model: inventory.model.js (this file)
//
// #313  Delete Inventory Item (Store Staff)
//     View: store-staff/page.tsx -> Route: inventory.routes.js -> Ctrl: inventory.controller.js -> Model: inventory.model.js (this file)

const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, required: true, trim: true },
    lowStockThreshold: { type: Number, default: 5 },
    description: { type: String, default: "" },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  },
  { timestamps: true, collection: "inventory" }
);

inventorySchema.statics.getAll = async function getAll(storeId) {
  return this.find(storeId ? { storeId } : {}).sort({ name: 1 }).lean();
};

inventorySchema.statics.getById = async function getById(id) {
  return this.findById(id).lean();
};

module.exports = mongoose.model("Inventory", inventorySchema);
