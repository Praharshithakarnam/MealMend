
require("dotenv").config();

const connectDB = require("./db");
const Inventory = require("./models/inventory");

async function saveAndVerifyInventory(inventory, householdId) {
  const expected = inventory.map((item) => ({
    id: item._id.toString(),
    name: item.name,
    quantity: item.quantity,
    unit: item.unit
  }));

  await Promise.all(inventory.map((item) => item.save()));

  const saved = await Inventory.find({
    _id: { $in: expected.map((item) => item.id) },
    householdId
  }).lean();

  for (const item of expected) {
    const persisted = saved.find(
      (record) => record._id.toString() === item.id
    );

    if (
      !persisted ||
      persisted.quantity !== item.quantity ||
      persisted.unit !== item.unit ||
      persisted.name !== item.name
    ) {
      throw new Error(`Verification failed for ${item.name}.`);
    }
  }

  return saved.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit
  }));
}

async function runTest() {
  const householdId = "temporary-verification-test";
  let testItems = [];

  try {
    await connectDB();

    testItems = await Inventory.insertMany([
      { name: "test-rice", quantity: 500, unit: "g", householdId },
      { name: "test-eggs", quantity: 6, unit: "pieces", householdId }
    ]);

    testItems[0].quantity = 350;
    testItems[1].quantity = 4;

    const verified = await saveAndVerifyInventory(
      testItems,
      householdId
    );

    console.log("Verification PASSED:", verified);
  } catch (error) {
    console.error("Verification FAILED:", error.message);
  } finally {
    try {
      if (testItems.length > 0) {
        await Inventory.deleteMany({
          _id: { $in: testItems.map((item) => item._id) },
          householdId
        });
        console.log("Temporary records cleaned up.");
      }
    } catch (error) {
      console.error("Cleanup failed:", error.message);
    }

    await require("mongoose").disconnect();
  }
}

runTest();
