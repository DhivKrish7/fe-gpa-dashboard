# GPA Dashboard

A modular React GPA dashboard for Financial Engineering students with batch analytics, forecasting, and PDF export.

## Development

1. Install frontend dependencies: `npm install`
2. Start the frontend dev server: `npm run dev`
3. Run frontend tests: `npm test -- --run`
4. Build for production: `npm run build`

## Environment

Create a `.env` file for the frontend and configure `VITE_API_BASE_URL` to point at your backend.

For local backend development, place a Google service account JSON file at `backend/service-account.json` and set `GOOGLE_SHEET_ID` in the backend environment.

For Render deployment, configure these backend environment variables:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_SHEET_ID`

The frontend and backend are compatible with a Vercel frontend and a Render backend without any route or API contract changes.
