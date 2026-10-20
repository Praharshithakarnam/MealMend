const flatmates = [
  { id: 1, name: "Aarav" },
  { id: 2, name: "Priya" },
  { id: 3, name: "Sam" }
];

  const daysFromNow = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
const inventory = [
  { name: "rice", quantity: 1000, unit: "g", expiryDate: daysFromNow(180) },
  { name: "eggs", quantity: 12, unit: "pieces", expiryDate: daysFromNow(7) },
  { name: "tomatoes", quantity: 700, unit: "g", expiryDate: daysFromNow(1) },
  { name: "onions", quantity: 500, unit: "g", expiryDate: daysFromNow(14) },
  { name: "pasta", quantity: 600, unit: "g", expiryDate: daysFromNow(90) },
  { name: "cheese", quantity: 250, unit: "g", expiryDate: daysFromNow(5) },
  { name: "potatoes", quantity: 800, unit: "g", expiryDate: daysFromNow(21) },
  { name: "bread", quantity: 12, unit: "slices", expiryDate: daysFromNow(2) },
  { name: "milk", quantity: 750, unit: "ml", expiryDate: daysFromNow(2) },
  { name: "carrots", quantity: 400, unit: "g", expiryDate: daysFromNow(7) },
  { name: "bell peppers", quantity: 300, unit: "g", expiryDate: daysFromNow(4) },
  { name: "beans", quantity: 300, unit: "g", expiryDate: daysFromNow(4) },
  { name: "flour", quantity: 500, unit: "g", expiryDate: daysFromNow(90) },
  { name: "butter", quantity: 150, unit: "g", expiryDate: daysFromNow(21) },
  { name: "yogurt", quantity: 400, unit: "g", expiryDate: daysFromNow(3) }
];


const meals = [
  {
    id: 1,
    name: "Tomato Egg Fried Rice",
    day: "Monday",
    servings: 2,
    cookingTime: 20,
    ingredients: [
      { name: "rice", quantity: 150, unit: "g" },
      { name: "eggs", quantity: 2, unit: "pieces" },
      { name: "tomatoes", quantity: 100, unit: "g" },
      { name: "onions", quantity: 50, unit: "g" }
    ]
  },
  {
    id: 2,
    name: "Cheesy Tomato Pasta",
    day: "Tuesday",
    servings: 2,
    cookingTime: 25,
    ingredients: [
      { name: "pasta", quantity: 200, unit: "g" },
      { name: "cheese", quantity: 80, unit: "g" },
      { name: "tomatoes", quantity: 100, unit: "g" },
      { name: "onions", quantity: 50, unit: "g" }
    ]
  },
  {
    id: 3,
    name: "Vegetable Fried Rice",
    day: "Wednesday",
    servings: 3,
    cookingTime: 25,
    ingredients: [
      { name: "rice", quantity: 250, unit: "g" },
      { name: "carrots", quantity: 100, unit: "g" },
      { name: "bell peppers", quantity: 100, unit: "g" },
      { name: "onions", quantity: 50, unit: "g" }
    ]
  },
  {
    id: 4,
    name: "Cheesy Potato Skillet",
    day: "Thursday",
    servings: 2,
    cookingTime: 30,
    ingredients: [
      { name: "potatoes", quantity: 250, unit: "g" },
      { name: "cheese", quantity: 60, unit: "g" },
      { name: "onions", quantity: 50, unit: "g" }
    ]
  },
  {
    id: 5,
    name: "Egg and Cheese Toast",
    day: "Friday",
    servings: 2,
    cookingTime: 15,
    ingredients: [
      { name: "bread", quantity: 4, unit: "slices" },
      { name: "eggs", quantity: 2, unit: "pieces" },
      { name: "cheese", quantity: 40, unit: "g" }
    ]
  },
  {
    id: 6,
    name: "Creamy Vegetable Pasta",
    day: "Saturday",
    servings: 3,
    cookingTime: 30,
    ingredients: [
      { name: "pasta", quantity: 250, unit: "g" },
      { name: "milk", quantity: 150, unit: "ml" },
      { name: "cheese", quantity: 60, unit: "g" },
      { name: "carrots", quantity: 100, unit: "g" },
      { name: "bell peppers", quantity: 50, unit: "g" }
    ]
  },
  {
    id: 7,
    name: "Tomato Potato Curry",
    day: "Sunday",
    servings: 3,
    cookingTime: 35,
    ingredients: [
      { name: "potatoes", quantity: 300, unit: "g" },
      { name: "tomatoes", quantity: 150, unit: "g" },
      { name: "onions", quantity: 100, unit: "g" }
    ]
  },
  {
    id: 8,
    name: "Quick Vegetable Egg Scramble",
    day: "Monday",
    servings: 2,
    cookingTime: 15,
    ingredients: [
      { name: "eggs", quantity: 3, unit: "pieces" },
      { name: "tomatoes", quantity: 100, unit: "g" },
      { name: "onions", quantity: 50, unit: "g" },
      { name: "bell peppers", quantity: 50, unit: "g" }
    ]
  },
  {
    id: 9,
    name: "Potato Cheese Sandwich",
    day: "Tuesday",
    servings: 2,
    cookingTime: 20,
    ingredients: [
      { name: "bread", quantity: 4, unit: "slices" },
      { name: "potatoes", quantity: 200, unit: "g" },
      { name: "cheese", quantity: 40, unit: "g" },
      { name: "onions", quantity: 30, unit: "g" }
    ]
  },
  {
    id: 10,
    name: "Homemade Savory Pancakes",
    day: "Wednesday",
    servings: 2,
    cookingTime: 20,
    ingredients: [
      { name: "flour", quantity: 150, unit: "g" },
      { name: "eggs", quantity: 1, unit: "pieces" },
      { name: "milk", quantity: 100, unit: "ml" },
      { name: "onions", quantity: 30, unit: "g" }
    ]
  },
  {
    id: 11,
    name: "Creamy Mashed Potatoes",
    day: "Thursday",
    servings: 2,
    cookingTime: 25,
    ingredients: [
      { name: "potatoes", quantity: 300, unit: "g" },
      { name: "milk", quantity: 100, unit: "ml" },
      { name: "butter", quantity: 30, unit: "g" },
      { name: "cheese", quantity: 30, unit: "g" }
    ]
  },
  {
    id: 12,
    name: "Mixed Vegetable Rice Bowl",
    day: "Friday",
    servings: 3,
    cookingTime: 25,
    ingredients: [
      { name: "rice", quantity: 250, unit: "g" },
      { name: "carrots", quantity: 100, unit: "g" },
      { name: "beans", quantity: 100, unit: "g" },
      { name: "bell peppers", quantity: 75, unit: "g" },
      { name: "onions", quantity: 50, unit: "g" }
    ]
  }
];

module.exports = { flatmates, inventory, meals };
