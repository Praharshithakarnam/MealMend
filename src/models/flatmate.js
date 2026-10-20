const mongoose = require("mongoose");

const flatmateSchema = new mongoose.Schema({
  legacyId: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  householdId: {
    type: String,
    default: "default-household"
  }
});

module.exports = mongoose.model("Flatmate", flatmateSchema);
