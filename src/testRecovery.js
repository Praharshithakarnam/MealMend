const { checkMealFeasibility , consumeIngredients , selectMeal , recoverCancelledDinner , getMissingIngredients} = require("../services/recovery");

const inventory = [
  { name: "pasta", quantity: 400, unit: "g" },
  { name: "cheese", quantity: 150, unit: "g" }
];

const meal = {
  name: "Cheesy Pasta",
  ingredients: [
    { name: "pasta", quantity: 200, unit: "g" },
    { name: "cheese", quantity: 80, unit: "g" }
  ]
};

const result = checkMealFeasibility(meal, inventory);

console.log(result);

consumeIngredients(meal, inventory);
console.log("Remaining inventory:", inventory);


const lowInventory = [
  { name: "pasta", quantity: 400, unit: "g" },
  { name: "cheese", quantity: 50, unit: "g" }
];

const result2 = selectMeal(meal, lowInventory);

console.log("Selection result:", result2);
console.log("Inventory after selection:", lowInventory);

const cancelledMeal = {
  name: "Cheesy Tomato Pasta",
  ingredients: [
    { name: "pasta", quantity: 200, unit: "g" },
    { name: "cheese", quantity: 80, unit: "g" }
  ]
};

const alternativeMeals = [
  {
    name: "Tomato Egg Fried Rice",
    ingredients: [
      { name: "rice", quantity: 150, unit: "g" },
      { name: "eggs", quantity: 2, unit: "pieces" },
      { name: "tomatoes", quantity: 100, unit: "g" },
      { name: "onions", quantity: 50, unit: "g" }
    ]
  }
];

const recoveryInventory = [
  { name: "rice", quantity: 500, unit: "g" },
  { name: "eggs", quantity: 6, unit: "pieces" },
  { name: "tomatoes", quantity: 300, unit: "g" },
  { name: "onions", quantity: 200, unit: "g" },
  { name: "pasta", quantity: 400, unit: "g" },
  { name: "cheese", quantity: 150, unit: "g" }
];

const recoveryResult = recoverCancelledDinner(
  cancelledMeal,
  alternativeMeals,
  recoveryInventory
);

console.log("\nRecovery result:", recoveryResult);
console.log("Inventory after recovery:", recoveryInventory);

const emptyInventory = [
  { name: "rice", quantity: 0, unit: "g" },
  { name: "eggs", quantity: 0, unit: "pieces" },
  { name: "tomatoes", quantity: 0, unit: "g" },
  { name: "onions", quantity: 0, unit: "g" }
];

const failedRecovery = recoverCancelledDinner(
  cancelledMeal,
  alternativeMeals,
  emptyInventory
);

console.log("\nFailed recovery:", failedRecovery);
console.log("Inventory after failed recovery:", emptyInventory);

const groceryInventory = [
  { name: "pasta", quantity: 400, unit: "g" },
  { name: "cheese", quantity: 50, unit: "g" }
];

const groceryMeal = {
  name: "Cheesy Pasta",
  ingredients: [
    { name: "pasta", quantity: 200, unit: "g" },
    { name: "cheese", quantity: 80, unit: "g" },
    { name: "tomatoes", quantity: 100, unit: "g" }
  ]
};

console.log(
  "Missing ingredients:",
  getMissingIngredients(groceryMeal, groceryInventory)
);


const EmptyInventory = [];

const noFoodResult = recoverCancelledDinner(
  cancelledMeal,
  alternativeMeals,
  EmptyInventory
);

console.log("No-replacement test:", noFoodResult);

console.log(
  "Grocery suggestions:",
  getMissingIngredients(cancelledMeal, EmptyInventory)
);
