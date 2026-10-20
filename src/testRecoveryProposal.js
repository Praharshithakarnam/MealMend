
const connectDB = require("./db");
const mongoose = require("mongoose");

const Meal = require("../src/models/meal");
const Inventory = require("../src/models/inventory");
const Recovery = require("../src/models/Recovery");

const {
  previewCancelledDinner
} = require("../services/recovery");

async function main() {
  let testMeal;

  try {
    await connectDB();

    const householdId = "default-household";

    // Use a unique legacy ID without changing existing meals.
    const legacyId = Date.now();

    testMeal = await Meal.create({
      legacyId,
      name: "Temporary Proposal Test Dinner",
      day: "Test",
      servings: 2,
      cookingTime: 15,
      householdId,
      ingredients: [
        { name: "rice", quantity: 100, unit: "g" }
      ]
    });

    // A test replacement that uses ingredients we know exist.
    const replacement = {
      legacyId: legacyId + 1,
      name: "Temporary Rice Test Meal",
      day: "Test",
      servings: 2,
      cookingTime: 10,
      householdId,
      ingredients: [
        { name: "rice", quantity: 100, unit: "g" }
      ]
    };

    const inventory = await Inventory.find({ householdId });

    const before = inventory.map(item => ({
      name: item.name,
      quantity: item.quantity
    }));

    const result = previewCancelledDinner(
      testMeal,
      [replacement],
      inventory,
      3,
      1
    );

    const after = inventory.map(item => ({
      name: item.name,
      quantity: item.quantity
    }));

    console.log("\nPROPOSAL RESULT:");
    console.dir(result, { depth: null });

    console.log("\nInventory unchanged:", 
      JSON.stringify(before) === JSON.stringify(after)
    );

    if (!result.success) {
      throw new Error("The preview did not find a feasible replacement.");
    }

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error("Inventory was unexpectedly modified.");
    }

    console.log("\nRECOVERY PROPOSAL TEST: PASS");
  } catch (error) {
    console.error("RECOVERY PROPOSAL TEST: FAIL", error.message);
    process.exitCode = 1;
  } finally {
    // Delete only the temporary cancelled meal.
    if (testMeal?._id) {
      await Meal.deleteOne({ _id: testMeal._id });
      console.log("Temporary meal cleaned up.");
    }

    await mongoose.disconnect();
  }
}

main();
