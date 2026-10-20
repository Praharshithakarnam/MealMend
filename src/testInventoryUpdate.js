
require("dotenv").config();

const connectDB = require("./db");
const Inventory = require("./models/inventory");

async function testInventoryUpdate() {
  let testItem;

  try {
    await connectDB();

    // Create a uniquely named temporary record.
    testItem = await Inventory.create({
      name: "wasteless-save-test",
      quantity: 100,
      unit: "g",
      householdId: "temporary-test-household"
    });

    console.log("Initial quantity:", testItem.quantity);

    // Change and save the temporary record.
    testItem.quantity = 65;
    await testItem.save();

    // Read it back from MongoDB.
    const savedItem = await Inventory.findById(testItem._id);

    console.log("Quantity after saving:", savedItem.quantity);
    console.log(
      "Persistence test:",
      savedItem.quantity === 65 ? "PASSED" : "FAILED"
    );
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    // Clean up only the temporary record created by this test.
    if (testItem?._id) {
      try {
        await Inventory.deleteOne({
          _id: testItem._id,
          householdId: "temporary-test-household",
          name: "wasteless-save-test"
        });
        console.log("Temporary test record cleaned up.");
      } catch (cleanupError) {
        console.error("Cleanup failed:", cleanupError.message);
      }
    }

    await require("mongoose").disconnect();
  }
}

testInventoryUpdate();
