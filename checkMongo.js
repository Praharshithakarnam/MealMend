
require("dotenv").config();
const mongoose = require("mongoose");

async function inspectRecoveries() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/wasteless"
    );

    const db = mongoose.connection.db;

    const recoveries = await db
      .collection("recoveries")
      .find(
        { householdId: "default-household" },
        {
          projection: {
            _id: 1,
            cancelledMealLegacyId: 1,
            originalMeal: 1,
            replacementMeal: 1,
            householdId: 1,
            recoveredAt: 1
          }
        }
      )
      .toArray();

    console.log("Recovery records:", JSON.stringify(recoveries, null, 2));
  } catch (error) {
    console.error("Inspection failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

inspectRecoveries();
