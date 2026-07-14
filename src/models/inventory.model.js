const mongoose = require("mongoose");

const SEED_INVENTORY = [
  { name: "Oolong Tea",      quantity: 12, unit: "bags",  lowStockThreshold: 5 },
  { name: "Tapioca Pearls",  quantity: 4,  unit: "kg",   lowStockThreshold: 5 },
  { name: "Brown Sugar Syrup", quantity: 8, unit: "btl",  lowStockThreshold: 5 },
  { name: "Cheese Foam Mix", quantity: 3,  unit: "packs", lowStockThreshold: 5 },
  { name: "Honey Syrup",     quantity: 7,  unit: "btl",  lowStockThreshold: 5 },
];

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

inventorySchema.statics.initializeSeedInventory = async function initializeSeedInventory() {
  const Store = require("./store.model");

  try {
    const stores = await Store.find({}).lean();

    for (const store of stores) {
      for (const seed of SEED_INVENTORY) {
        const existing = await this.findOne({ name: seed.name, storeId: store._id }).lean();
        if (!existing) {
          await this.create({ ...seed, storeId: store._id });
        }
      }
    }
  } catch (error) {
    console.error("[Inventory] Seed error:", error.message);
  }
};

module.exports = mongoose.model("Inventory", inventorySchema);
