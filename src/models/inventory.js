const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  householdId: {
    type: String,
    default: "default-household"
  },
  expiryDate: {
  type: Date,
  default: null
  },
});

module.exports = mongoose.model("Inventory", inventorySchema);
