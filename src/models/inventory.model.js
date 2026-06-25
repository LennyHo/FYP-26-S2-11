const mongoose = require("mongoose");

const SEED_INVENTORY = [
  { name: "Oolong Tea",      quantity: 12, unit: "bags",  lowStockThreshold: 5 },
  { name: "Tapioca Pearls",  quantity: 4,  unit: "kg",   lowStockThreshold: 5 },
  { name: "Aloe Vera",       quantity: 8,  unit: "pcs",  lowStockThreshold: 5 },
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
  },
  { timestamps: true, collection: "inventory" }
);

inventorySchema.statics.getAll = async function getAll() {
  return this.find({}).sort({ name: 1 }).lean();
};

inventorySchema.statics.getById = async function getById(id) {
  return this.findById(id).lean();
};

inventorySchema.statics.initializeSeedInventory = async function initializeSeedInventory() {
  try {
    for (const seed of SEED_INVENTORY) {
      const existing = await this.findOne({ name: seed.name }).lean();
      if (!existing) {
        await this.create(seed);
      }
    }
  } catch (error) {
    console.error("[Inventory] Seed error:", error.message);
  }
};

module.exports = mongoose.model("Inventory", inventorySchema);
