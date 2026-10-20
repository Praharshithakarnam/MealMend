const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const { randomUUID } = require("crypto");
const connectDB = require("./db");
const Flatmate = require("../src/models/flatmate");
const Inventory = require("../src/models/inventory");
const Meal = require("../src/models/meal");
const Recovery = require("../src/models/Recovery");
const { understandMessage , extractMealIntent , suggestMeal} = require("../services/ai");

const {
  recoverCancelledDinner,
  getMissingIngredients,
  checkMealFeasibility,
  previewCancelledDinner
} = require("../services/recovery");
const PlannedMeal = require("./models/PlannedMeal");

const app = express();
const PORT = process.env.PORT || 3000;
const HOUSEHOLD_ID = "default-household";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to WasteLess API!",
    status: "running"
  });
});


async function saveAndVerifyInventory(inventory) {
  // Capture the quantities calculated by the recovery logic.
  const expected = inventory.map((item) => ({
    id: item._id.toString(),
    name: item.name,
    quantity: item.quantity,
    unit: item.unit
  }));

  // Save all changed inventory documents.
  await Promise.all(inventory.map((item) => item.save()));

  // Read the persisted values back from MongoDB.
  const saved = await Inventory.find({
    _id: { $in: expected.map((item) => item.id) },
    householdId: HOUSEHOLD_ID
  }).lean();

  // Verify every expected record exists and has the expected quantity.
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
      throw new Error(
        `Inventory verification failed for ${item.name}.`
      );
    }
  }

  return saved.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit
  }));
}



app.patch("/api/inventory/:id/expiry", async (req, res) => {
  try {
    const { expiryDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: "Please provide a valid inventory item ID."
      });
    }

    if (!expiryDate || Number.isNaN(Date.parse(expiryDate))) {
      return res.status(400).json({
        error: "Please provide a valid expiryDate."
      });
    }

    const item = await Inventory.findOne({
      _id: req.params.id,
      householdId: HOUSEHOLD_ID
    });

    if (!item) {
      return res.status(404).json({
        error: "Inventory item not found."
      });
    }

    item.expiryDate = new Date(expiryDate);
    await item.save();

    return res.json({
      success: true,
      item: {
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate
      }
    });
  } catch (error) {
    console.error("Expiry update failed:", error.message);
    return res.status(500).json({
      error: "Could not update expiry date."
    });
  }
});


app.get("/api/household", async (req, res) => {
  try {
    const [flatmates, inventory, meals] = await Promise.all([
      Flatmate.find({ householdId: HOUSEHOLD_ID }).lean(),
      Inventory.find({ householdId: HOUSEHOLD_ID }).lean(),
      Meal.find({ householdId: HOUSEHOLD_ID }).lean()
    ]);

    return res.json({
      flatmates: flatmates.map(person => ({
        id: person.legacyId,
        name: person.name
      })),
      inventory,
      meals: meals.map(meal => ({
        id: meal.legacyId,
        name: meal.name,
        day: meal.day,
        servings: meal.servings,
        cookingTime: meal.cookingTime,
        ingredients: meal.ingredients
      }))
    });
  } catch (error) {
    console.error("Household fetch failed:", error);
    return res.status(500).json({ error: "Could not load household data." });
  }
});

app.get("/api/grocery-list/:mealId", async (req, res) => {
  const mealId = Number(req.params.mealId);

  if (!Number.isInteger(mealId) || mealId <= 0) {
    return res.status(400).json({ error: "A valid meal ID is required." });
  }

  try {
    const meal = await Meal.findOne({
      legacyId: mealId,
      householdId: HOUSEHOLD_ID
    }).lean();

    if (!meal) {
      return res.status(404).json({ error: "Meal not found" });
    }

    const inventory = await Inventory.find({
      householdId: HOUSEHOLD_ID
    }).lean();

    const groceryList = getMissingIngredients(meal, inventory);

    return res.json({
      meal: meal.name,
      groceryList
    });
  } catch (error) {
    console.error("Grocery list failed:", error);
    return res.status(500).json({ error: "Could not calculate grocery list." });
  }
});

app.post("/api/recover", async (req, res) => {
  const cancelledMealId = Number(req.body?.cancelledMealId);

  if (!Number.isInteger(cancelledMealId) || cancelledMealId <= 0) {
    return res.status(400).json({
      error: "A valid cancelledMealId is required."
    });
  }

  try {
    const previousRecovery = await Recovery.findOne({
      cancelledMealLegacyId: cancelledMealId,
      householdId: HOUSEHOLD_ID
    }).lean();

    if (previousRecovery) {
      return res.status(409).json({
        error: "This meal has already been recovered.",
        recovery: previousRecovery
      });
    }

    const cancelledMeal = await Meal.findOne({
      legacyId: cancelledMealId,
      householdId: HOUSEHOLD_ID
    }).lean();

    if (!cancelledMeal) {
      return res.status(404).json({
        error: "Cancelled meal not found."
      });
    }

    const alternativeMeals = await Meal.find({
      legacyId: { $ne: cancelledMealId },
      householdId: HOUSEHOLD_ID
    }).lean();

    const inventory = await Inventory.find({
      householdId: HOUSEHOLD_ID
    });

    const recoveryResult = recoverCancelledDinner(
      cancelledMeal,
      alternativeMeals,
      inventory
    );

    if (!recoveryResult.success) {
      return res.json({
        ...recoveryResult,
        groceryList: getMissingIngredients(cancelledMeal, inventory),
        inventory: inventory.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        }))
      });
    }

    // Save inventory and verify the persisted quantities.
      const updatedInventory = await saveAndVerifyInventory(inventory);

    // Save recovery history so a server restart won't erase it.
    try {
      await Recovery.create({
        cancelledMealLegacyId: cancelledMealId,
        originalMeal: recoveryResult.originalMeal,
        replacementMeal: recoveryResult.replacementMeal,
        householdId: HOUSEHOLD_ID
      });
    } catch (error) {
      // The unique database index also protects against duplicate records.
      if (error.code === 11000) {
        return res.status(409).json({
          error: "This meal has already been recovered."
        });
      }
      throw error;
    }

    return res.json({
      ...recoveryResult,
      groceryList: [],
      inventory: updatedInventory
    });
  } catch (error) {
    console.error("Meal recovery failed:", error);
    return res.status(500).json({
      error: "Could not recover the meal. Please try again."
    });
  }
});



app.post("/api/ai/recovery-confirm", async (req, res) => {
  const recoveryRequestId = req.body?.recoveryRequestId;
  const cancelledMealId = Number(req.body?.cancelledMealId);
  const replacementMealName = req.body?.replacementMeal;
  const peopleCancelled = req.body?.peopleCancelled;
  const totalFlatmates = 3;

  if (
    typeof recoveryRequestId !== "string" ||
    !recoveryRequestId.trim() ||
    !Number.isInteger(cancelledMealId) ||
    cancelledMealId <= 0 ||
    typeof replacementMealName !== "string" ||
    !replacementMealName.trim() ||
    !Number.isInteger(peopleCancelled) ||
    peopleCancelled < 0 ||
    peopleCancelled > totalFlatmates
  ) {
    return res.status(400).json({
      success: false,
      error: "Provide a valid recovery request ID, meal, replacement, and flatmate count."
    });
  }

  let reservation;
  let inventorySaveStarted = false;

  try {
    // A previously confirmed request must never consume inventory again.
    const existing = await Recovery.findOne({
      recoveryRequestId,
      householdId: HOUSEHOLD_ID
    }).lean();

    if (existing) {
      if (existing.status === "confirmed") {
        return res.json({
          success: true,
          alreadyConfirmed: true,
          message: "This recovery was already confirmed.",
          originalMeal: existing.originalMeal,
          replacementMeal: existing.replacementMeal,
          recoveryId: existing._id
        });
      }

      return res.status(409).json({
        success: false,
        error: "This recovery request is already being processed. Check its status before retrying."
      });
    }

    // Reserve this request ID before touching inventory.
    // A unique request ID prevents duplicate requests from reserving it twice.
    reservation = await Recovery.create({
      recoveryRequestId,
      cancelledMealLegacyId: cancelledMealId,
      originalMeal: "Pending",
      replacementMeal: replacementMealName.trim(),
      householdId: HOUSEHOLD_ID,
      status: "pending"
    });

    const cancelledMeal = await Meal.findOne({
      legacyId: cancelledMealId,
      householdId: HOUSEHOLD_ID
    }).lean();

    if (!cancelledMeal) {
      await Recovery.deleteOne({ _id: reservation._id });
      return res.status(404).json({
        success: false,
        error: "Cancelled meal not found."
      });
    }

    const replacementMeal = await Meal.findOne({
      name: replacementMealName.trim(),
      legacyId: { $ne: cancelledMealId },
      householdId: HOUSEHOLD_ID
    }).lean();

    if (!replacementMeal) {
      await Recovery.deleteOne({ _id: reservation._id });
      return res.status(404).json({
        success: false,
        error: "The proposed replacement meal could not be found."
      });
    }

    const inventory = await Inventory.find({
      householdId: HOUSEHOLD_ID
    });

    const result = recoverCancelledDinner(
      cancelledMeal,
      [replacementMeal],
      inventory,
      totalFlatmates,
      peopleCancelled
    );

    if (!result.success) {
      await Recovery.deleteOne({ _id: reservation._id });

      return res.status(409).json({
        success: false,
        error:
          result.reason === "no_diners_remaining"
            ? "No diners remain, so a replacement meal is unnecessary."
            : "The replacement is no longer feasible with current inventory.",
        reason: result.reason,
        inventory: inventory.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        }))
      });
    }

    // From this point, a failure may leave some inventory documents saved.
    // Keep the pending reservation if saving fails; do not blindly retry.
    inventorySaveStarted = true;
    const updatedInventory = await saveAndVerifyInventory(inventory);

    reservation.originalMeal = cancelledMeal.name;
    reservation.replacementMeal = result.replacementMeal;
    reservation.status = "confirmed";
    await reservation.save();

    return res.json({
      success: true,
      message: "Recovery confirmed and inventory updated.",
      originalMeal: cancelledMeal.name,
      replacementMeal: result.replacementMeal,
      recoveryId: reservation._id,
      servings: result.servings,
      ingredientsUsed: result.ingredientsUsed,
      inventory: updatedInventory
    });
  } catch (error) {
    console.error("Recovery confirmation failed:", error);

    // Only release the reservation if inventory saving never began.
    // Once saving starts, retain it to prevent an unsafe duplicate retry.
    if (reservation && !inventorySaveStarted) {
      await Recovery.deleteOne({ _id: reservation._id }).catch(
        (cleanupError) => {
          console.error("Could not release recovery reservation:", cleanupError);
        }
      );
    }

    if (error.code === 11000) {
      const existing = await Recovery.findOne({
        recoveryRequestId,
        householdId: HOUSEHOLD_ID
      }).lean();

      if (existing?.status === "confirmed") {
        return res.json({
          success: true,
          alreadyConfirmed: true,
          message: "This recovery was already confirmed.",
          originalMeal: existing.originalMeal,
          replacementMeal: existing.replacementMeal,
          recoveryId: existing._id
        });
      }

      return res.status(409).json({
        success: false,
        error: "This recovery request already exists or is being processed."
      });
    }

    return res.status(500).json({
      success: false,
      error: inventorySaveStarted
        ? "Recovery status is uncertain because inventory saving began. Do not retry this request until inventory and recovery status have been checked."
        : "Could not confirm the recovery."
    });
  }
});


app.post("/api/ai/test", async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "A message is required."
    });
  }

  try {
    const reply = await understandMessage(message.trim());
    return res.json({ reply });
  } catch (error) {
    console.error("AI request failed:", error.message);

    return res.status(502).json({
      error: "The AI service could not process the request."
    });
  }
});



app.post("/api/ai/intent", async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "A message is required."
    });
  }

  try {
    const now = new Date();
    const dateValues = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now).reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

    const today =
      `${dateValues.year}-${dateValues.month}-${dateValues.day}`;

    const intent = await extractMealIntent(message.trim(), today);
    return res.json({ intent });
  } catch (error) {
    console.error("Intent extraction failed:", error.message);

    return res.status(502).json({
      error: "Could not understand the request."
    });
  }
});


app.post("/api/ai/recovery-proposal", async (req, res) => {
  const message = req.body.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "A message is required."
    });
  }

  try {
    const parsed = await extractMealIntent(message.trim());

    const selectedMealId = Number(req.body.cancelledMealId);
    const selectedMealName =
      typeof req.body.cancelledMealName === "string"
        ? req.body.cancelledMealName.trim()
        : "";

    const peopleCancelled = Number(req.body.peopleCancelled);

    if (
      parsed.intent !== "recover_cancelled_meal" &&
      !/\b(cancel|cancelled|canceled|change|changed|replacement|recover)\b/i.test(message)
    ) {
      return res.status(400).json({
        error: "Please describe a cancelled meal or changed dinner plan.",
        understoodIntent: parsed.intent
      });
    }

    // Find the cancelled meal by its ID or name.
    // Find the meal selected in the frontend.
    let meal = null;

    if (Number.isInteger(selectedMealId) && selectedMealId > 0) {
      meal = await Meal.findOne({
        legacyId: selectedMealId,
        householdId: HOUSEHOLD_ID
      });
    }

    if (!meal && selectedMealName) {
      meal = await Meal.findOne({
        name: { $regex: `^${selectedMealName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        householdId: HOUSEHOLD_ID
      });
    }

    if (!meal && parsed.cancelledMealName) {
      meal = await Meal.findOne({
        name: { $regex: `^${parsed.cancelledMealName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        householdId: HOUSEHOLD_ID
      });
    }

    if (!meal) {
      return res.status(400).json({
        error: "I couldn't find the selected meal. Please choose it again from your meal plan."
      });
    }

    if (!meal) {
      return res.status(404).json({
        error: "I couldn't find that meal in your household plan."
      });
    }

    const totalFlatmates = 3;

    if (peopleCancelled === null || peopleCancelled === undefined) {
      return res.status(400).json({
        error: "How many flatmates cancelled dinner?",
        intent: parsed
      });
    }

    if (
      !Number.isInteger(peopleCancelled) ||
      peopleCancelled < 0 ||
      peopleCancelled > totalFlatmates
    ) {
      return res.status(400).json({
        error: "Invalid number of cancelled flatmates."
      });
    }

    const alternatives = await Meal.find({
      legacyId: { $ne: meal.legacyId },
      householdId: HOUSEHOLD_ID
    }).sort({ cookingTime: 1 });

    const inventory = await Inventory.find({
      householdId: HOUSEHOLD_ID
    });

    // This function calculates a preview without consuming inventory.
    const result = previewCancelledDinner(
      meal,
      alternatives,
      inventory,
      totalFlatmates,
      peopleCancelled
    );

    if (!result.success) {
      return res.status(200).json({
        success: false,
        reason: result.reason,
        message:
          result.reason === "no_diners_remaining"
            ? "All flatmates cancelled dinner. No replacement meal is needed."
            : "No replacement meal is feasible with the available ingredients.",
        originalMeal: meal.name,
        servings: result.servings ?? 0
      });
    }

    const recoveryRequestId = randomUUID();

    return res.json({
      success: true,
      proposalOnly: true,
      recoveryRequestId,
      cancelledMealId: meal.legacyId,
      understoodIntent: parsed,
      originalMeal: meal.name,
      replacementMeal: result.replacementMeal,
      cookingTime: result.cookingTime,
      servings: result.servings,
      ingredientsUsed: result.ingredientsUsed,
      currentInventory: inventory.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      })),
      projectedInventory: result.projectedInventory,
      peopleCancelled,
      totalFlatmates,
    });
  } catch (error) {
    console.error("AI recovery proposal failed:", error);
    return res.status(502).json({
      error: "Could not generate the recovery proposal."
    });
  }
});




app.post("/api/ai/recover", async (req, res) => {
  const message = req.body.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "A message is required."
    });
  }

  try {
    const parsed = await extractMealIntent(message.trim());

    if (parsed.intent !== "recover_cancelled_meal") {
      return res.status(400).json({
        error: "Please describe a cancelled meal or changed dinner plan.",
        understoodIntent: parsed.intent
      });
    }

    // Require an explicit meal name for now.
    
const requestedMealId = Number(req.body.cancelledMealId);

let meal = null;

if (
  Number.isInteger(requestedMealId) &&
  requestedMealId > 0
) {
  meal = await Meal.findOne({
    legacyId: requestedMealId,
    householdId: HOUSEHOLD_ID
  });
} else if (parsed.cancelledMealName) {
  const escapedName = parsed.cancelledMealName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

    meal = await Meal.findOne({
      name: new RegExp("^" + escapedName + "$", "i"),
      householdId: HOUSEHOLD_ID
    });
  } else {
    return res.status(400).json({
      message: "Which planned meal was cancelled? Please select it from your meal plan.",
      intent: parsed
    });
  }

if (!meal) {
  return res.status(404).json({
    error: "I couldn't find that meal in your household plan."
  });
}

    // Reuse the existing, validated recovery endpoint's logic
    // through the same recovery function and database models.
    const existingRecovery = await Recovery.findOne({
      cancelledMealLegacyId: meal.legacyId,
      householdId: HOUSEHOLD_ID
    });

    if (existingRecovery) {
      return res.status(409).json({
        error: "This meal has already been recovered.",
        recovery: existingRecovery
      });
    }

    const alternatives = await Meal.find({
      legacyId: { $ne: meal.legacyId },
      householdId: HOUSEHOLD_ID
    }).sort({ cookingTime: 1 });

    const inventory = await Inventory.find({
      householdId: HOUSEHOLD_ID
    });

    
    const totalFlatmates = 3;
    if (parsed.peopleCancelled === null) {
    return res.status(400).json({
      error: "How many flatmates cancelled dinner?",
      intent: parsed
    });
}

const peopleCancelled = parsed.peopleCancelled;

    if (
      !Number.isInteger(peopleCancelled) ||
      peopleCancelled < 0 ||
      peopleCancelled > totalFlatmates
    ) {
      return res.status(400).json({
        error: "Invalid number of cancelled flatmates."
      });
    }

    const result = recoverCancelledDinner(
      meal,
      alternatives,
      inventory,
      totalFlatmates,
      peopleCancelled
    );

    
  if (!result.success) {
    const message =
      result.reason === "no_diners_remaining"
        ? "All flatmates cancelled dinner. No replacement meal is needed."
        : "No replacement meal is currently feasible with available ingredients.";

    return res.status(200).json({
      success: false,
      reason: result.reason,
      message,
      originalMeal: meal.name,
      servings: result.servings ?? 0,
      inventory: inventory.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      }))
    });
  }

    console.log(
      "Inventory immediately before saving:",
      inventory.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    );


    const updatedInventory = await saveAndVerifyInventory(inventory);

    const recovery = await Recovery.create({
      cancelledMealLegacyId: meal.legacyId,
      originalMeal: meal.name,
      replacementMeal: result.replacementMeal,
      householdId: HOUSEHOLD_ID
    });


    return res.json({
      success: true,
      understoodIntent: parsed,
      originalMeal: meal.name,
      replacementMeal: result.replacementMeal,
      recoveryId: recovery._id,
      inventory: updatedInventory,   
      servings: result.servings,
      ingredientsUsed: result.ingredientsUsed,
      peopleCancelled,
      totalFlatmates
    });
  } catch (error) {
    console.error("AI recovery failed:", error.message);

    return res.status(502).json({
      error: "Could not complete the AI-assisted recovery."
    });
  }
});

 

app.get("/api/inventory/expiring-soon", async (req, res) => {
  try {
    const days = Math.min(
      Math.max(Number.parseInt(req.query.days, 10) || 3, 1),
      30
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);
    cutoff.setHours(23, 59, 59, 999);

    const items = await Inventory.find({
      householdId: HOUSEHOLD_ID,
      expiryDate: {
        $ne: null,
        $gte: now,
        $lte: cutoff
      }
    }).sort({ expiryDate: 1 });

    return res.json({
      success: true,
      windowDays: days,
      count: items.length,
      items: items.map(item => ({
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate
      }))
    });
  } catch (error) {
    console.error("Expiry check failed:", error.message);
    return res.status(500).json({
      error: "Could not check expiring inventory."
    });
  }
});


app.get("/api/meals/expiry-suggestions", async (req, res) => {
  try {
    const days = Math.min(
      Math.max(Number.parseInt(req.query.days, 10) || 3, 1),
      30
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);
    cutoff.setHours(23, 59, 59, 999);

    const [expiringItems, meals, inventory] = await Promise.all([
      Inventory.find({
        householdId: HOUSEHOLD_ID,
        expiryDate: { $ne: null, $gte: now, $lte: cutoff }
      }),
      Meal.find({ householdId: HOUSEHOLD_ID }),
      Inventory.find({ householdId: HOUSEHOLD_ID })
    ]);

    const expiringNames = new Set(
      expiringItems.map(item => item.name.toLowerCase())
    );

    const suggestions = meals
      .map(meal => {
        const recipe = meal.toObject();
        const ingredients = recipe.ingredients || [];

        const matchingExpiringIngredients = ingredients
          .filter(item => expiringNames.has(item.name.toLowerCase()))
          .map(item => item.name);

        const feasibility = checkMealFeasibility(recipe, inventory);

        return {
          mealId: recipe.legacyId,
          name: recipe.name,
          servings: recipe.servings,
          cookingTime: recipe.cookingTime,
          usesExpiringIngredients: matchingExpiringIngredients.length > 0,
          matchingExpiringIngredients,
          feasible: feasibility.feasible,
          missingIngredients: feasibility.missingIngredients
        };
      })
      .filter(meal => meal.usesExpiringIngredients)
      .sort((a, b) => {
        if (a.feasible !== b.feasible) {
          return Number(b.feasible) - Number(a.feasible);
        }
        return b.matchingExpiringIngredients.length -
          a.matchingExpiringIngredients.length;
      });

    return res.json({
      success: true,
      windowDays: days,
      expiringIngredients: expiringItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate
      })),
      count: suggestions.length,
      suggestions
    });
  } catch (error) {
    console.error("Expiry meal suggestions failed:", error);
    return res.status(500).json({
      error: "Could not generate expiry-aware meal suggestions."
    });
  }
});


app.post("/api/planned-meals", async (req, res) => {
  const { mealId, plannedDate, servings } = req.body;

  if (
    !Number.isInteger(Number(mealId)) ||
    Number(mealId) <= 0 ||
    typeof plannedDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) ||
    !Number.isInteger(Number(servings)) ||
    Number(servings) < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid mealId, plannedDate (YYYY-MM-DD), and servings."
    });
  }

  const date = new Date(`${plannedDate}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== plannedDate
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid planned date."
    });
  }

  try {
    const meal = await Meal.findOne({
      legacyId: Number(mealId),
      householdId: HOUSEHOLD_ID
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found."
      });
    }

    const plannedMeal = await PlannedMeal.findOneAndUpdate(
      {
        householdId: HOUSEHOLD_ID,
        mealLegacyId: Number(mealId),
        plannedDate: date
      },
      {
        $set: {
          servings: Number(servings)
        },
        $setOnInsert: {
          householdId: HOUSEHOLD_ID,
          mealLegacyId: Number(mealId),
          plannedDate: date
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    return res.status(201).json({
      success: true,
      message: "Meal added to the household plan.",
      plannedMeal: {
        id: plannedMeal._id,
        mealId: plannedMeal.mealLegacyId,
        mealName: meal.name,
        plannedDate: plannedDate,
        servings: plannedMeal.servings
      }
    });
  } catch (error) {
    console.error("Planning meal failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not plan this meal."
    });
  }
});



app.get("/api/grocery-recommendations", async (req, res) => {
  const { date } = req.query;

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a date in YYYY-MM-DD format."
    });
  }

  const plannedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(plannedDate.getTime()) ||
    plannedDate.toISOString().slice(0, 10) !== date
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid date."
    });
  }

  try {
    const plannedMeals = await PlannedMeal.find({
      householdId: HOUSEHOLD_ID,
      plannedDate
    }).lean();

    const mealIds = plannedMeals.map(
      (planned) => planned.mealLegacyId
    );

    const [meals, inventory] = await Promise.all([
      Meal.find({
        householdId: HOUSEHOLD_ID,
        legacyId: { $in: mealIds }
      }).lean(),
      Inventory.find({
        householdId: HOUSEHOLD_ID
      }).lean()
    ]);

    const mealMap = new Map(
      meals.map((meal) => [meal.legacyId, meal])
    );

    const requirements = new Map();
    const plannedMealDetails = [];

    for (const planned of plannedMeals) {
      const meal = mealMap.get(planned.mealLegacyId);

      if (!meal) continue;

      const baseServings = meal.servings || 1;
      const scale = planned.servings / baseServings;

      plannedMealDetails.push({
        mealName: meal.name,
        servings: planned.servings
      });

      for (const ingredient of meal.ingredients || []) {
        const name = ingredient.name.trim().toLowerCase();
        const unit = ingredient.unit;
        const key = `${name}::${unit}`;

        if (!requirements.has(key)) {
          requirements.set(key, {
            name,
            unit,
            required: 0
          });
        }

        requirements.get(key).required +=
          ingredient.quantity * scale;
      }
    }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setUTCDate(today.getUTCDate() + 3);

  const expiringIngredients = inventory
    .filter((item) => {
      if (!item.expiryDate) return false;

      const expiry = new Date(item.expiryDate);

      return expiry >= today && expiry <= threeDaysFromNow;
    })
    .map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate
    }));

    const shoppingList = [];

    for (const item of requirements.values()) {
      const stock = inventory
        .filter(
          (entry) =>
            entry.name.trim().toLowerCase() === item.name &&
            entry.unit === item.unit
        )
        .reduce((sum, entry) => sum + entry.quantity, 0);

      const neededToBuy = Math.max(
        0,
        item.required - stock
      );

      if (neededToBuy > 0) {
        shoppingList.push({
          name: item.name,
          unit: item.unit,
          required: Number(item.required.toFixed(2)),
          available: stock,
          neededToBuy: Number(neededToBuy.toFixed(2))
        });
      }
    }
    const plannedIngredientNames = new Set(
      meals.flatMap((meal) =>
        (meal.ingredients || []).map((ingredient) =>
          ingredient.name.trim().toLowerCase()
        )
      )
    );

    const useSoon = expiringIngredients.map((item) => {
      const includedInPlannedMeals = plannedIngredientNames.has(
        item.name.trim().toLowerCase()
      );

    return {
      ...item,
      includedInPlannedMeals,
      recommendation: includedInPlannedMeals
        ? "Already planned in a meal — use before expiry."
        : "Consider planning a meal that uses this ingredient soon."
    };
});

    return res.json({
      success: true,
      date,
      plannedMeals: plannedMealDetails,
      shoppingList,
      useSoon,
      message:
        plannedMeals.length === 0
          ? "No meals are planned for this date. Here are your ingredients that need using soon."
          : shoppingList.length === 0
            ? "Everything needed is already in stock."
            : "Here is what the household needs to buy."
    });
  } catch (error) {
    console.error("Grocery recommendations failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not calculate grocery recommendations."
    });
  }
});



function buildGrocerySummary(data) {
  const lines = [];

  const plannedMeals = Array.isArray(data?.plannedMeals)
    ? data.plannedMeals
    : [];

  const shoppingList = Array.isArray(data?.shoppingList)
    ? data.shoppingList
    : [];

  const useSoon = Array.isArray(data?.useSoon)
    ? data.useSoon
    : [];

  lines.push(`Here's your household plan for ${data?.date || "the requested date"}.`);

  if (plannedMeals.length > 0) {
    lines.push(
      `Planned meals: ${plannedMeals
        .map((meal) => `${meal.mealName} (${meal.servings} servings)`)
        .join(", ")}.`
    );
  } else {
    lines.push("No meals are planned for this date.");
  }

  if (shoppingList.length > 0) {
    const items = shoppingList.map(
      (item) =>
        `${item.name}: buy ${item.neededToBuy} ${item.unit}`
    );

    lines.push(`Shopping list: ${items.join("; ")}.`);
  } else {
    lines.push("You already have enough ingredients for the planned meals.");
  }

  if (useSoon.length > 0) {
    const items = useSoon.map((item) => {
      const expiry = item.expiryDate
        ? new Date(item.expiryDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "UTC"
          })
        : "an unknown date";

      return item.includedInPlannedMeals
        ? `${item.name} (${item.quantity} ${item.unit}) expires on ${expiry} and is already included in your planned meals`
        : `${item.name} (${item.quantity} ${item.unit}) expires on ${expiry}; consider planning a meal that uses it`;
    });

    lines.push(`Use soon: ${items.join("; ")}.`);
  } else {
    lines.push("No ingredients are expiring within the current recommendation window.");
  }

  return lines.join("\n\n");
}



app.get("/api/grocery-summary", async (req, res) => {
  const date = req.query.date;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a date in YYYY-MM-DD format."
    });
  }

  try {
    const baseUrl = `http://127.0.0.1:${PORT}`;

    const response = await fetch(
      `${baseUrl}/api/grocery-recommendations?date=${encodeURIComponent(date)}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return res.status(response.status).json(data);
    }

    return res.json({
      success: true,
      date: data.date,
      summary: buildGrocerySummary(data),
      details: data
    });
  } catch (error) {
    console.error("Grocery summary failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not generate the grocery summary."
    });
  }
});



app.post("/api/ai/grocery-summary", async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: "A message is required."
    });
  }

  try {
    // Get today's date in the household's local timezone.
    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const dateValues = Object.fromEntries(
      dateParts.map((part) => [part.type, part.value])
    );

    const today = `${dateValues.year}-${dateValues.month}-${dateValues.day}`;

    const parsed = await extractMealIntent(message.trim(), today);

    if (parsed.intent !== "grocery_summary") {
      return res.status(400).json({
        success: false,
        error: "Please ask about groceries, planned meals, or ingredients expiring soon.",
        understoodIntent: parsed.intent
      });
    }

    // Default to today if the user did not mention a date.
    const targetDate = parsed.targetDate || today;

    // Validate that the date is a real calendar date.
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(targetDate);

    if (!dateMatch) {
      return res.status(400).json({
        success: false,
        error: "Please specify a valid date."
      });
    }

    const [, year, month, day] = dateMatch;
    const checkDate = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day))
    );

    if (
      checkDate.getUTCFullYear() !== Number(year) ||
      checkDate.getUTCMonth() !== Number(month) - 1 ||
      checkDate.getUTCDate() !== Number(day)
    ) {
      return res.status(400).json({
        success: false,
        error: "The interpreted date is not a valid calendar date."
      });
    }

    const response = await fetch(
      `http://127.0.0.1:${PORT}/api/grocery-summary?date=${encodeURIComponent(targetDate)}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return res.status(response.status).json(data);
    }

    return res.json({
      success: true,
      understoodIntent: parsed.intent,
      date: targetDate,
      summary: data.summary,
      details: data.details
    });
  } catch (error) {
    console.error("AI grocery summary failed:", error.message);

    return res.status(502).json({
      success: false,
      error: "Could not generate the grocery summary."
    });
  }
});



async function startServer() {
  try {
    console.log("DEBUG 1: Starting server...");
    await connectDB();
    console.log("DEBUG 2: MongoDB connected, opening port", PORT);

    const server = app.listen(PORT, "127.0.0.1", () => {
      console.log("DEBUG 3: Server is listening!");
      console.log(server.address());
    });

    server.on("error", (error) => {
      console.error("SERVER LISTEN ERROR:", error);
    });
  } catch (error) {
    console.error("Failed to start WasteLess:", error);
    process.exit(1);
  }
}


app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please enter a message."
    });
  }

  try {
    const text = message.trim();

    // Give the AI today's date in the household's timezone.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const dateValues = Object.fromEntries(
      parts.map(part => [part.type, part.value])
    );

    const today =
      `${dateValues.year}-${dateValues.month}-${dateValues.day}`;

    const parsed = await extractMealIntent(text, today);
    console.log("[CHAT] Message:", text);
    console.log("[CHAT] Intent:", parsed.intent);

    // 1. General conversational questions
    if (parsed.intent === "general") {
      const reply = await understandMessage(text);

      return res.json({
        success: true,
        intent: "general",
        reply
      });
    }

    // 2. Inventory questions
    if (parsed.intent === "check_inventory") {
      const inventory = await Inventory.find({
        householdId: HOUSEHOLD_ID
      }).lean();

      return res.json({
        success: true,
        intent: "check_inventory",
        reply: inventory.length
          ? "Here's what's currently available in your household."
          : "Your household inventory is currently empty.",
        inventory
      });
    }

    // Meal suggestions based on actual household inventory
    if (parsed.intent === "suggest_meal") {
      const inventory = await Inventory.find({
        householdId: HOUSEHOLD_ID
      }).lean();

      const reply = await suggestMeal(text, inventory);

      return res.json({
        success: true,
        intent: "suggest_meal",
        reply,
        inventory
      });
    }

    // 3. Missing ingredients for a specific meal
    if (parsed.intent === "grocery_list") {
      const meals = await Meal.find({
        householdId: HOUSEHOLD_ID
      }).lean();

      // Match an explicitly named recipe against saved meal names.
      const normalizedMessage = text.toLowerCase();

      const meal = meals.find(item =>
        normalizedMessage.includes(item.name.toLowerCase())
      );

      if (!meal) {
        return res.status(400).json({
          success: false,
          intent: "grocery_list",
          error:
            "Which planned meal do you mean? Please use its name from your meal plan."
        });
      }

      const response = await fetch(
        `http://127.0.0.1:${PORT}/api/grocery-list/${meal.legacyId}`
      );

      const data = await response.json();

      return res.status(response.status).json({
        success: response.ok,
        intent: "grocery_list",
        ...data
      });
    }

    // 4. Household shopping and expiry summary
    if (parsed.intent === "grocery_summary") {
      const response = await fetch(
        `http://127.0.0.1:${PORT}/api/ai/grocery-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ message: text })
        }
      );

      const data = await response.json();

      return res.status(response.status).json({
        ...data,
        intent: "grocery_summary"
      });
    }

    // 5. Cancelled-meal recovery
    if (parsed.intent === "recover_cancelled_meal") {
      const response = await fetch(
        `http://127.0.0.1:${PORT}/api/ai/recover`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: text
          })
        }
      );

      const data = await response.json();

      return res.status(response.status).json({
        ...data,
        intent: "recover_cancelled_meal"
      });
    }

    return res.status(400).json({
      success: false,
      error: "I couldn't determine what you need. Could you rephrase that?"
    });
  } catch (error) {
    console.error("Chat request failed:", error.message);

    return res.status(502).json({
      success: false,
      error: "I couldn't process that request right now. Please try again."
    });
  }
});


startServer();
