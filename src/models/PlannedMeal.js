
const mongoose = require("mongoose");

const plannedMealSchema = new mongoose.Schema(
  {
    mealLegacyId: {
      type: Number,
      required: true
    },
    householdId: {
      type: String,
      required: true,
      default: "default-household"
    },
    plannedDate: {
      type: Date,
      required: true
    },
    servings: {
      type: Number,
      required: true,
      min: 1,
      default: 2
    }
  },
  { timestamps: true }
);

plannedMealSchema.index(
  { householdId: 1, mealLegacyId: 1, plannedDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("PlannedMeal", plannedMealSchema);
