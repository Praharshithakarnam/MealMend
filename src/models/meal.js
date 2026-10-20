const mongoose = require("mongoose");

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, lowercase: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true }
  },
  { _id: false }
);

const mealSchema = new mongoose.Schema({
  legacyId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  day: { type: String, required: true },
  servings: { type: Number, required: true, min: 1 },
  cookingTime: { type: Number, required: true, min: 0 },
  ingredients: { type: [ingredientSchema], default: [] },
  householdId: {
    type: String,
    default: "default-household"
  }
});

module.exports = mongoose.model("Meal", mealSchema);
