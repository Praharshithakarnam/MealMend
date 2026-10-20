
const mongoose = require("mongoose");

const recoverySchema = new mongoose.Schema({
  // Unique ID for one recovery attempt.
  recoveryRequestId: {
    type: String,
    unique: true,
    sparse: true
  },

  status: {
    type: String,
    enum: ["pending", "confirmed"],
    default: "pending",
    required: true
  },

  // A meal can now be recovered on multiple occasions.
  cancelledMealLegacyId: {
    type: Number,
    required: true
  },

  originalMeal: {
    type: String,
    required: true
  },

  replacementMeal: {
    type: String,
    required: true
  },

  householdId: {
    type: String,
    default: "default-household"
  },

  recoveredAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Recovery", recoverySchema);
