const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function understandMessage(message) {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      "You are WasteLess, an AI assistant for students sharing an apartment.",
      "Help users understand meal changes and reduce food waste.",
      "For now, only reply conversationally. Do not claim to have changed meals or inventory.",
      `User message: ${message}`
    ].join("\n\n")
  });

  return response.text;
}


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateContentWithRetry(params, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      const status = error.status ?? error.code;
      const retryable = [429, 500, 502, 503, 504].includes(Number(status));

      if (!retryable || attempt === attempts) {
        throw error;
      }

      const delay = 1000 * 2 ** (attempt - 1);
      console.warn(
        `Gemini temporarily unavailable (HTTP ${status}). Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }
}




async function extractMealIntent(message, currentLocalDate = null) {
  const normalized = message.toLowerCase();

  const groceryQuestion =
    /\b(expiring|expire|expires|expiry|going bad|use soon|grocery|groceries|shopping|what to buy|food waste)\b/i.test(normalized);

  const mealSuggestionQuestion =
    /\b(suggest|recommend|idea|ideas|make|cook|prepare)\b/i.test(normalized) &&
    /\b(meal|recipe|food|dish|bread|milk|ingredient|ingredients|use up|using)\b/i.test(normalized);

  if (mealSuggestionQuestion) {
    return {
      intent: "suggest_meal",
      cancelledMealName: null,
      peopleCancelled: null,
      targetDate: null
    };
  }

  if (groceryQuestion) {
    return {
      intent: "grocery_summary",
      cancelledMealName: null,
      peopleCancelled: null,
      targetDate: null
    };
  }
  const response = await generateContentWithRetry({
    model: "gemini-3.8-flash",
    contents: `
You are the intent parser for WasteLess, a shared-household food assistant.

Return ONLY valid JSON with this exact structure:
{
  "intent": "general",
  "cancelledMealName": null,
  "peopleCancelled": null,
  "targetDate": null
}

Allowed intent values:
- "recover_cancelled_meal"
- "check_inventory"
- "grocery_list"
- "grocery_summary"
- "general"
- "suggest_meal"

Rules:
- Changed or cancelled dinner plans mean recover_cancelled_meal.
- Extract cancelledMealName only when the user explicitly names the meal.
- peopleCancelled must be an integer when the number of people cancelling is explicitly stated.
- Convert number words to integers: "two" becomes 2, "one" becomes 1.
- Extract the number who CANCELLED, not the number remaining.
- If the count is not stated, return null.
- Requests asking what to buy, what expires soon, or for a combined meal-plan and grocery summary mean grocery_summary.
- Requests asking only for ingredients missing for a particular meal mean grocery_list.
- Requests asking what food is available mean check_inventory.
- For an explicitly mentioned calendar date, return targetDate as YYYY-MM-DD.
- For "today" or "tomorrow", calculate targetDate relative to the supplied current local date.
- If no date is mentioned, return null.
- Never invent a meal name, cancellation count, or date.
- Return no markdown or additional text.

Current household local date: ${currentLocalDate ?? "not provided"}

User message:
${JSON.stringify(message)}
`
  });

  const text = response.text.trim();
  const jsonText = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const parsed = JSON.parse(jsonText);

  const allowedIntents = [
    "recover_cancelled_meal",
    "check_inventory",
    "grocery_list",
    "grocery_summary",
    "general",
    "suggest_meal"
  ];

  if (!allowedIntents.includes(parsed.intent)) {
    throw new Error("Invalid intent returned by AI");
  }

  if (
    parsed.peopleCancelled !== null &&
    (!Number.isInteger(parsed.peopleCancelled) ||
      parsed.peopleCancelled < 0)
  ) {
    throw new Error("Invalid cancellation count returned by AI");
  }

  if (
    parsed.targetDate !== null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(parsed.targetDate)
  ) {
    throw new Error("Invalid target date returned by AI");
  }

  return parsed;
}



async function suggestMeal(message, inventory = []) {
  const inventoryContext = inventory.map((item) => ({
    name: item.name ?? item.ingredient ?? item.itemName ?? "Unknown item",
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    expiryDate: item.expiryDate ?? null
  }));

  const response = await generateContentWithRetry({
    model: "gemini-3.8-flash",
    contents: [
      "You are MealMend, an AI meal assistant that helps households reduce food waste.",
      "Recommend practical meals using the user's actual inventory.",
      "Prioritize ingredients that expire soon.",
      "Never claim an ingredient is available unless the inventory confirms it.",
      "Never assume an ingredient is missing just because it is absent from the inventory.",
      "Separate confirmed available ingredients from ingredients whose availability is unknown.",
      "Give a meal name, brief reason, ingredients with approximate quantities, and simple preparation steps.",
      `User request: ${message}`,
      `Household inventory (JSON): ${JSON.stringify(inventoryContext)}`
    ].join("\n\n")
  });

  return response.text;
}



module.exports = { understandMessage , extractMealIntent , suggestMeal};
