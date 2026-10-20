# MealMend 🍅
### Plans change. Dinner finds a way.

MealMend is an AI-powered kitchen companion that helps households reduce food waste by making better use of ingredients they already have. It helps users discover recipes using available ingredients, prioritize products approaching expiry, recover cancelled meals, and make smarter grocery decisions.

Built for the Amazon Developer Hackathon 2026 — Alexa+ track, MealMend demonstrates a simulated assistant experience for smarter household meal planning.

## 💡 Inspiration

Meal plans do not always go as expected. A flatmate might cancel dinner, plans might change at the last minute, or ingredients might remain unused until they approach their expiry dates.

We wanted to build a solution that helps people adapt to these changes instead of wasting usable food or purchasing ingredients they already have.

That idea became MealMend: a kitchen companion that helps turn unexpected changes into opportunities to make another meal.

## ✨ Features

- **Household Inventory:** Track ingredients and their available quantities.
- **Expiry-Aware Meal Suggestions:** Find recipes that prioritize ingredients approaching their expiry dates.
- **AI Kitchen Companion:** Ask natural-language questions about recipes, ingredients, meal planning, and food recovery.
- **Cancelled Meal Recovery:** Get alternative meal proposals when a planned meal is cancelled.
- **User-Controlled Recovery:** Review a proposed recovery before confirming it.
- **Inventory Updates:** Reflect ingredient usage through the recovery workflow.
- **Grocery Recommendations:** Get suggestions based on existing inventory and planned meals to help avoid unnecessary purchases.

## 🎯 Target Users

MealMend is designed for:

- Students living in shared apartments or hostels.
- Flatmates managing groceries together.
- Families planning meals around ingredients at home.
- Individuals who want to reduce household food waste.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tooling |
| CSS | Styling and responsive interface |
| Node.js | Backend runtime |
| Express.js | Backend API |
| MongoDB | Household and application data storage |
| Mongoose | MongoDB object modeling |
| Google Gemini | AI-powered conversational assistance |
| `@google/genai` | Gemini API integration |
| `react-markdown` | Rendering formatted AI responses |
| `remark-gfm` | Markdown formatting support |
| Lucide React | Interface icons |

## ⚙️ How It Works

1. Users view their household inventory and ingredient expiry dates.
2. They ask MealMend for a recipe or help recovering a cancelled meal.
3. The backend processes the request using application data and, where appropriate, the AI service.
4. MealMend provides a recipe or recovery proposal.
5. Users review the proposal and confirm the recovery.
6. The application updates the relevant inventory data.
7. Users can request further meal suggestions based on ingredients that should be used soon.

## 🏗️ System Architecture

```text
              User
               |
               v
       React + Vite Frontend
               |
               v
       Node.js + Express API
          /           \
         v             v
     MongoDB      Google Gemini
         |
         v
 Household Inventory,
 Meal Plans & Recovery Data
```

The frontend provides the user interface, the backend handles API requests and application workflows, MongoDB stores application data, and Google Gemini supports AI-powered interactions.

## 🚀 Getting Started

### Prerequisites

Before running MealMend, ensure you have:

- [Node.js](https://nodejs.org/) and npm installed.
- [MongoDB](https://www.mongodb.com/) running locally or an accessible MongoDB instance.
- A Google Gemini API key for AI-powered features.

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_REPOSITORY_FOLDER
```

Replace the placeholders with your actual GitHub repository URL and folder name.

### 2. Install dependencies

Navigate to the frontend and backend directories and install dependencies wherever a `package.json` exists:

```bash
npm install
```

If the frontend and backend have separate `package.json` files, run this command in each directory.

### 3. Configure environment variables

Create a `.env` file in the backend directory and configure the variables expected by your application.

Example:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Start the backend

From the backend directory, run the development command defined in its `package.json`. For example:

```bash
npm run dev
```

### 5. Start the frontend

Open another terminal, navigate to the frontend directory, and run:

```bash
npm run dev
```

Open the local URL provided by Vite in your browser.

Make sure the frontend API configuration points to the correct backend address. The current development setup has used `http://127.0.0.1:3000`.

Use the actual scripts and folder names from your repository if they differ from these examples.

## 🎬 Demo

The MealMend demo showcases the following workflow:

1. Introducing MealMend and its purpose.
2. Viewing household inventory and expiry dates.
3. Cancelling a planned meal and requesting recovery.
4. Reviewing the AI-generated recovery proposal.
5. Confirming the proposal and viewing inventory changes.
6. Requesting a recipe using ingredients approaching expiry.

The demo presents MealMend as a simulated assistant experience for the Alexa+ track.

## 🌱 Future Improvements

- More personalized recipes based on household preferences.
- Improved meal scheduling and expiry-aware planning.
- More accurate grocery recommendations based on quantities and upcoming meals.
- Household-specific dietary preferences and restrictions.
- A more voice-oriented assistant experience.
- Improved error handling and automated testing.


---

**MealMend — Plans change. Dinner finds a way.** 🍅

*Helping households make the most of what they already have, one meal at a time.*
