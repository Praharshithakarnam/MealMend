
function checkMealFeasibility(meal, inventory) {
  const missingIngredients = [];

  for (const required of meal.ingredients) {
    const item = inventory.find(
      ingredient =>
        ingredient.name.trim().toLowerCase() ===
        required.name.trim().toLowerCase()
    );

    if (
      !item ||
      item.unit.trim().toLowerCase() !==
        required.unit.trim().toLowerCase() ||
      item.quantity < required.quantity
    ) {
      missingIngredients.push(required.name);
    }
  }

  return {
    feasible: missingIngredients.length === 0,
    missingIngredients
  };
}


function consumeIngredients(meal, inventory) {
    for(const required of meal.ingredients){
        const item = inventory.find(
            ingredient => ingredient.name === required.name
        );
        if(item){
            item.quantity = item.quantity - required.quantity;
        }
    }
}


function selectMeal(meal, inventory) {
  const result = checkMealFeasibility(meal, inventory);

  if (!result.feasible) {
    return {
      success: false,
      missingIngredients: result.missingIngredients
    };
  }

  consumeIngredients(meal, inventory);

  return {
    success: true,
    missingIngredients: []
  };
}


function scaleMealToServings(meal, targetServings) {
  const mealData =
    typeof meal.toObject === "function"
      ? meal.toObject()
      : meal;

  const originalServings = mealData.servings || 2;
  const factor = targetServings / originalServings;

  return {
    ...mealData,
    servings: targetServings,
    ingredients: mealData.ingredients.map(ingredient => ({
      ...ingredient,
      quantity: ingredient.quantity * factor
    }))
  };
}



function recoverCancelledDinner(
    cancelledMeal,
    alternativeMeals,
    inventory,
    totalFlatmates = 3,
    peopleCancelled = 0
) {
    const remainingServings = Math.max(
        0,
        totalFlatmates - peopleCancelled
    );

    if (remainingServings === 0) {
        return {
            success: false,
            reason: "no_diners_remaining",
            originalMeal: cancelledMeal.name,
            replacementMeal: null,
            servings: 0
        };
    }

    for (const candidate of alternativeMeals) {
        const scaledMeal = scaleMealToServings(
            candidate,
            remainingServings
        );

        const result = checkMealFeasibility(
            scaledMeal,
            inventory
        );

        if (result.feasible) {
            console.log(
                "Inventory BEFORE consumption:",
                inventory.map(item => ({
                    name: item.name,
                    quantity: item.quantity
                }))
            );

            consumeIngredients(scaledMeal, inventory);

            console.log(
                "Replacement ingredients:",
                scaledMeal.ingredients
            );

            console.log(
                "Inventory AFTER consumption:",
                inventory.map(item => ({
                    name: item.name,
                    quantity: item.quantity
                }))
            );

            return {
                success: true,
                originalMeal: cancelledMeal.name,
                replacementMeal: scaledMeal.name,
                servings: remainingServings,
                ingredientsUsed: scaledMeal.ingredients
            };
        }
    }

    return {
        success: false,
        reason: "no_feasible_replacement",
        originalMeal: cancelledMeal.name,
        replacementMeal: null,
        servings: remainingServings
    };
}

function previewCancelledDinner(
  cancelledMeal,
  alternativeMeals,
  inventory,
  totalFlatmates = 3,
  peopleCancelled = 0
) {
  const remainingServings = Math.max(
    0,
    totalFlatmates - peopleCancelled
  );

  if (remainingServings === 0) {
    return {
      success: false,
      reason: "no_diners_remaining",
      originalMeal: cancelledMeal.name,
      replacementMeal: null,
      servings: 0
    };
  }

  for (const candidate of alternativeMeals) {
    const scaledMeal = scaleMealToServings(
      candidate,
      remainingServings
    );

    const feasibility = checkMealFeasibility(
      scaledMeal,
      inventory
    );

    if (!feasibility.feasible) {
      continue;
    }

    // Create a separate snapshot. Do not mutate database documents.
    const projectedInventory = inventory.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit
    }));

    // Calculate the quantities remaining after this meal.
    for (const required of scaledMeal.ingredients) {
      const item = projectedInventory.find(
        ingredient => ingredient.name === required.name
      );

      if (item) {
        item.quantity -= required.quantity;
      }
    }

    return {
      success: true,
      originalMeal: cancelledMeal.name,
      replacementMeal: scaledMeal.name,
      servings: remainingServings,
      cookingTime: scaledMeal.cookingTime,
      ingredientsUsed: scaledMeal.ingredients,
      projectedInventory
    };
  }

  return {
    success: false,
    reason: "no_feasible_replacement",
    originalMeal: cancelledMeal.name,
    replacementMeal: null,
    servings: remainingServings
  };
}



function getMissingIngredients(meal, inventory) {
  const missingIngredients = [];

  for (const required of meal.ingredients) {
    const item = inventory.find(
      ingredient => ingredient.name === required.name
    );

    if (!item || item.quantity < required.quantity) {
      missingIngredients.push({
        name: required.name,
        required: required.quantity,
        available: item ? item.quantity : 0,
        neededToBuy: required.quantity - (item ? item.quantity : 0),
        unit: required.unit
      });
    }
  }

  return missingIngredients;
}



module.exports = {
  checkMealFeasibility,
  consumeIngredients,
  selectMeal,
  recoverCancelledDinner,
  getMissingIngredients,
  scaleMealToServings,
  previewCancelledDinner
};
