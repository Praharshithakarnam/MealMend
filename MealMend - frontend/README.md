# WasteLess frontend

React + Vite frontend for the existing WasteLess Express backend.

## Requirements
- Node.js 18+ (Node.js 20 LTS recommended)
- Existing WasteLess backend running at `http://127.0.0.1:3000`
- MongoDB and Gemini setup remain on the backend; do not put the Gemini key in this frontend.

## Run locally
1. Extract this folder.
2. Open a terminal in the `wasteless-frontend` folder.
3. Install packages:
   ```bash
   npm install
   ```
4. Create a `.env` file by copying `.env.example`. The default backend URL is already `http://127.0.0.1:3000`.
5. Start Vite:
   ```bash
   npm run dev
   ```
6. Open the local URL Vite prints, usually `http://localhost:5173`.

In a separate terminal, start the existing backend using your usual command from its project folder. Confirm `GET http://127.0.0.1:3000/api/household` works.

## API routes used
- `GET /api/household`
- `POST /api/ai/recovery-proposal` with `{ "cancelledMealId": <id>, "message": "..." }`
- `POST /api/ai/recovery-confirm` with `{ "cancelledMealId": <id>, "replacementMeal": "<meal name>", "peopleCancelled": <number> }`

The proposal is treated as preview-only. The frontend only displays a success notice and reloads the household after the confirmation endpoint returns a successful response. Cancel makes no backend request.

## Build check
```bash
npm run build
```

## Notes
- API base URL can be changed in `.env` with `VITE_API_BASE_URL`.
- If Vite is running on a different computer from the backend, change the base URL to the backend computer's reachable LAN IP and ensure the server/network allow the connection.
- The low-stock count is currently a visual heuristic (quantity <= 100 units), not an expiry prediction.
