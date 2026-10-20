const connectDB = require("./db");
const { flatmates, inventory, meals } = require("../data/flatData");

const Flatmate = require("../src/models/flatmate");
const Inventory = require("../src/models/inventory");
const Meal = require("../src/models/meal");

async function seedDatabase() {
  try {
    await connectDB();

    for (const person of flatmates) {
      await Flatmate.findOneAndUpdate(
        { legacyId: person.id },
        {
          $set: {
            legacyId: person.id,
            name: person.name,
            householdId: "default-household"
          }
        },
        { upsert: true, runValidators: true }
      );
    }

    
    for (const item of inventory) {
      await Inventory.findOneAndUpdate(
        {
          name: item.name.toLowerCase(),
          householdId: "default-household"
        },
        {
          $set: {
            name: item.name.toLowerCase(),
            quantity: item.quantity,
            unit: item.unit,
            expiryDate: item.expiryDate ?? null,
            householdId: "default-household"
          }
        },
        { upsert: true, runValidators: true }
      );
    }

    for (const meal of meals) {
      await Meal.findOneAndUpdate(
        { legacyId: meal.id },
        {
          $set: {
            legacyId: meal.id,
            name: meal.name,
            day: meal.day,
            servings: meal.servings,
            cookingTime: meal.cookingTime,
            ingredients: meal.ingredients,
            householdId: "default-household"
          }
        },
        { upsert: true, runValidators: true }
      );
    }

    console.log(
      "Inventory expiry dates:",
      await Inventory.find(
        {},
        "name expiryDate -_id"
      ).lean()
    );

    console.log("WasteLess data seeded successfully!");
    console.log("Flatmates:", await Flatmate.countDocuments());
    console.log("Inventory items:", await Inventory.countDocuments());
    console.log("Meals:", await Meal.countDocuments());
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
  }
}

seedDatabase();
