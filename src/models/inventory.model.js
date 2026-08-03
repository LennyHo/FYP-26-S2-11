// User Story Architecture Trace — inventory.model.js

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
