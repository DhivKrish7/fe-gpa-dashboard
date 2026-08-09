# GPA Dashboard Backend

A minimal Express-based backend scaffold for the GPA Dashboard.

## Scripts

- `npm install`
- `npm run dev`
- `npm start`
- `npm test`

## Endpoints

- `GET /health` → returns `{ "status": "ok" }`

## Local development

1. Create a Google service account and download the JSON key.
2. Place the file at `backend/service-account.json` (or point `GOOGLE_SERVICE_ACCOUNT` to the file path).
3. Set `GOOGLE_SHEET_ID` in your backend `.env` file if it is not already available.
4. Start the backend with `npm run dev`.

The backend will automatically use the local service-account JSON when it exists. If the file is missing, it will fall back to environment variables for deployment.

## Render deployment

Set the following environment variables in Render for the backend service:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_SHEET_ID`

If you are using a service account JSON for local development only, keep it out of production. Render should use the environment variables above instead.

### Vercel frontend + Render backend

- In Vercel, set `VITE_API_BASE_URL` to your Render backend URL, for example `https://your-backend.onrender.com`.
- The frontend will continue to call the same API routes without any code changes.
- The backend will automatically select the correct authentication method at runtime.
