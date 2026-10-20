
const mongoose = require("mongoose");
const Meal = require("./models/meal");
const Recovery = require("./models/Recovery");

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/wasteless");

  try {
    // Find an unused numeric ID.
    const meals = await Meal.find({}, { legacyId: 1 }).lean();
    const recoveries = await Recovery.find(
      {},
      { cancelledMealLegacyId: 1 }
    ).lean();

    const usedIds = new Set([
      ...meals.map(m => m.legacyId),
      ...recoveries.map(r => r.cancelledMealLegacyId)
    ]);

    let legacyId = 900000;
    while (usedIds.has(legacyId)) legacyId++;

    const meal = await Meal.create({
      legacyId,
      name: "Temporary Proposal API Test",
      day: "Test Day",
      servings: 2,
      cookingTime: 10,
      householdId: "default-household",
      ingredients: [
        { name: "rice", quantity: 50, unit: "g" }
      ]
    });

    console.log(JSON.stringify({
      message: "Temporary meal created",
      legacyId: meal.legacyId,
      name: meal.name
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
