
const mongoose = require("mongoose");
require("dotenv").config();

const Meal = require("../src/models/meal");

async function main() {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/wasteless"
  );

  const result = await Meal.deleteOne({
    legacyId: 999,
    householdId: "default-household",
    name: "Temporary Recovery Test Meal",
  });

  console.log("Temporary meals removed:", result.deletedCount);
}

main()
  .catch(console.error)
  .finally(async () => {
    await mongoose.disconnect();
  });
