
require("dotenv").config();

const connectDB = require("./db");
const Inventory = require("./models/inventory");

async function testInventorySave() {
  let item;
  let originalQuantity;

  try {
    await connectDB();

    item = await Inventory.findOne({
      householdId: "default-household",
      name: "rice"
    });

    if (!item) {
      throw new Error("Rice inventory item not found.");
    }

    originalQuantity = item.quantity;

    // Change the quantity temporarily.
    item.quantity = originalQuantity + 1;
    await item.save();

    const savedItem = await Inventory.findById(item._id);

    console.log({
      originalQuantity,
      expectedQuantity: originalQuantity + 1,
      savedQuantity: savedItem.quantity,
      passed: savedItem.quantity === originalQuantity + 1
    });
  } catch (error) {
    console.error("Inventory save test failed:", error.message);
  } finally {
    // Restore the original quantity even if the test fails.
    if (item && originalQuantity !== undefined) {
      try {
        item.quantity = originalQuantity;
        await item.save();
        console.log("Original rice quantity restored.");
      } catch (restoreError) {
        console.error(
          "IMPORTANT: Could not restore rice quantity:",
          restoreError.message
        );
      }
    }

    process.exit();
  }
}

testInventorySave();
