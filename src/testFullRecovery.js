
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./db");
const Meal = require("./models/meal");
const Inventory = require("./models/inventory");
const Recovery = require("./models/Recovery");
const {
  recoverCancelledDinner
} = require("../services/recovery");

async function testFullRecovery() {
  const householdId = `recovery-test-${Date.now()}`;
  const testId = Date.now();

  let cancelledMealId;
  let replacementMealId;
  let inventoryIds = [];

  try {
    await connectDB();

    // Use fresh legacy IDs and verify they aren't already in use.
    const existingMeals = await Meal.find({
      legacyId: { $in: [testId, testId + 1] }
    }).lean();

    const existingRecovery = await Recovery.findOne({
      cancelledMealLegacyId: testId
    }).lean();

    if (existingMeals.length || existingRecovery) {
      throw new Error("Test IDs already exist. Run the test again.");
    }

    const cancelledMeal = await Meal.create({
      legacyId: testId,
      name: "Test Cancelled Dinner",
      day: "Test",
      servings: 2,
      cookingTime: 15,
      ingredients: [],
      householdId
    });

    cancelledMealId = cancelledMeal._id;

    const replacementMeal = await Meal.create({
      legacyId: testId + 1,
      name: "Test Rice Dinner",
      day: "Test",
      servings: 2,
      cookingTime: 20,
      ingredients: [
        { name: "rice", quantity: 100, unit: "g" },
        { name: "tomatoes", quantity: 50, unit: "g" }
      ],
      householdId
    });

    replacementMealId = replacementMeal._id;

    const inventory = await Inventory.create([
      {
        name: "rice",
        quantity: 300,
        unit: "g",
        householdId
      },
      {
        name: "tomatoes",
        quantity: 200,
        unit: "g",
        householdId
      }
    ]);

    inventoryIds = inventory.map(item => item._id);

    // Run the same recovery logic used by the backend.
    const result = recoverCancelledDinner(
      cancelledMeal.toObject(),
      [replacementMeal.toObject()],
      inventory,
      2,
      0
    );

    if (!result.success) {
      throw new Error(
        `Recovery logic failed: ${result.reason}`
      );
    }

    // Persist the changed inventory and read it back.
    await Promise.all(inventory.map(item => item.save()));

    const savedInventory = await Inventory.find({
      _id: { $in: inventoryIds },
      householdId
    }).lean();

    const quantities = Object.fromEntries(
      savedInventory.map(item => [item.name, item.quantity])
    );

    if (
      quantities.rice !== 200 ||
      quantities.tomatoes !== 150
    ) {
      throw new Error(
        `Wrong saved quantities: ${JSON.stringify(quantities)}`
      );
    }

    // Record the successful recovery.
    const recovery = await Recovery.create({
      cancelledMealLegacyId: testId,
      originalMeal: result.originalMeal,
      replacementMeal: result.replacementMeal,
      householdId
    });

    const savedRecovery = await Recovery.findById(
      recovery._id
    ).lean();

    if (!savedRecovery) {
      throw new Error("Recovery record was not persisted.");
    }

    console.log("FULL RECOVERY TEST: PASS");
    console.log({
      originalMeal: result.originalMeal,
      replacementMeal: result.replacementMeal,
      servings: result.servings,
      savedInventory: quantities,
      recoveryRecordSaved: true
    });
  } catch (error) {
    console.error("FULL RECOVERY TEST: FAIL");
    console.error(error.message);
  } finally {
    // Clean up only this test's records.
    await Promise.all([
      Meal.deleteMany({ householdId }),
      Inventory.deleteMany({ householdId }),
      Recovery.deleteMany({ householdId })
    ]);

    console.log("Temporary test records cleaned up.");
    await mongoose.disconnect();
  }
}

testFullRecovery();

