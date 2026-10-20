
const {
  recoverCancelledDinner
} = require("../services/recovery");

function makeInventory() {
  return [
    { name: "rice", quantity: 500, unit: "g" },
    { name: "eggs", quantity: 6, unit: "pieces" },
    { name: "tomatoes", quantity: 300, unit: "g" },
    { name: "onions", quantity: 200, unit: "g" },
    { name: "pasta", quantity: 400, unit: "g" },
    { name: "cheese", quantity: 150, unit: "g" }
  ];
}

const cancelledMeal = {
  name: "Tomato Egg Fried Rice",
  servings: 2,
  ingredients: [
    { name: "rice", quantity: 150, unit: "g" },
    { name: "eggs", quantity: 2, unit: "pieces" },
    { name: "tomatoes", quantity: 100, unit: "g" },
    { name: "onions", quantity: 50, unit: "g" }
  ]
};

const pasta = {
  name: "Cheesy Tomato Pasta",
  servings: 2,
  cookingTime: 25,
  ingredients: [
    { name: "pasta", quantity: 200, unit: "g" },
    { name: "cheese", quantity: 80, unit: "g" },
    { name: "tomatoes", quantity: 100, unit: "g" },
    { name: "onions", quantity: 50, unit: "g" }
  ]
};

// Test 1: Two flatmates cancel; one person remains.
const inventory1 = makeInventory();

const result1 = recoverCancelledDinner(
  cancelledMeal,
  [pasta],
  inventory1,
  3,
  2
);

console.log("\nTEST 1: Two cancel, one remains");
console.log(JSON.stringify(result1, null, 2));
console.log("Remaining cheese:", inventory1.find(
  item => item.name === "cheese"
).quantity, "g");

// Test 2: Everyone cancels.
const inventory2 = makeInventory();
const before2 = JSON.stringify(inventory2);

const result2 = recoverCancelledDinner(
  cancelledMeal,
  [pasta],
  inventory2,
  3,
  3
);

console.log("\nTEST 2: Everyone cancels");
console.log(JSON.stringify(result2, null, 2));
console.log(
  "Inventory unchanged:",
  before2 === JSON.stringify(inventory2)
);

// Test 3: Nobody cancels; three people need dinner.
const inventory3 = makeInventory();

const result3 = recoverCancelledDinner(
  cancelledMeal,
  [pasta],
  inventory3,
  3,
  0
);

console.log("\nTEST 3: Nobody cancels, three remain");
console.log(JSON.stringify(result3, null, 2));
console.log("Remaining cheese:", inventory3.find(
  item => item.name === "cheese"
).quantity, "g");
