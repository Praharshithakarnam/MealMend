
require("dotenv").config();

const connectDB = require("./db");
const Inventory = require("./models/inventory");
const {
  recoverCancelledDinner
} = require("../services/recovery");

async function testRecoveryPersistence() {
  let testItems = [];

  try {
    await connectDB();

    // Use a separate household so real inventory is untouched.
    const householdId = "temporary-recovery-test";

    testItems = await Inventory.insertMany([
      { name: "rice", quantity: 500, unit: "g", householdId },
      { name: "eggs", quantity: 6, unit: "pieces", householdId },
      { name: "tomatoes", quantity: 300, unit: "g", householdId },
      { name: "onions", quantity: 200, unit: "g", householdId }
    ]);

    const cancelledMeal = {
      name: "Test cancelled meal",
      servings: 2,
      ingredients: []
    };

    const alternatives = [
      {
        name: "Test fried rice",
        servings: 2,
        ingredients: [
          { name: "rice", quantity: 150, unit: "g" },
          { name: "eggs", quantity: 2, unit: "pieces" },
          { name: "tomatoes", quantity: 100, unit: "g" },
          { name: "onions", quantity: 50, unit: "g" }
        ]
      }
    ];

    const result = recoverCancelledDinner(
      cancelledMeal,
      alternatives,
      testItems,
      2,
      0
    );

    console.log("Recovery success:", result.success);
    console.log(
      "Calculated quantities:",
      testItems.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    );

    await Promise.all(testItems.map(item => item.save()));

    const saved = await Inventory.find({ householdId }).lean();

    console.log(
      "Persisted quantities:",
      saved.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    );
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    try {
      if (testItems.length > 0) {
        await Inventory.deleteMany({
          _id: { $in: testItems.map(item => item._id) },
          householdId: "temporary-recovery-test"
        });
        console.log("Temporary test records cleaned up.");
      }
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError.message);
    }

    await require("mongoose").disconnect();
  }
}

testRecoveryPersistence();
