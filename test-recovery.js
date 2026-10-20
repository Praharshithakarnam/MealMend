
const {
  recoverCancelledDinner
} = require("./services/recovery");

const cancelledMeal = {
  name: "Cancelled Dinner",
  servings: 2,
  ingredients: []
};

const alternativeMeals = [
  {
    name: "Test Replacement",
    servings: 2,
    ingredients: [
      { name: "rice", quantity: 100, unit: "g" },
      { name: "tomatoes", quantity: 50, unit: "g" }
    ]
  }
];

const inventory = [
  { name: "rice", quantity: 300, unit: "g" },
  { name: "tomatoes", quantity: 200, unit: "g" }
];

const result = recoverCancelledDinner(
  cancelledMeal,
  alternativeMeals,
  inventory,
  2,
  0
);

console.log("Recovery result:", result);
console.log("Final test inventory:", inventory);
