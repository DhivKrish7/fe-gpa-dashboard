# GPA Dashboard

A modular React GPA dashboard for Financial Engineering students with batch analytics, forecasting, and PDF export.

## Development

1. Install frontend dependencies: `npm install`
2. Create a `.env` file in the project root.
3. Set `VITE_API_BASE_URL` to your Google Apps Script endpoint, for example:
   `VITE_API_BASE_URL=https://script.google.com/macros/s/XXXXXXXX/exec`
4. Start the frontend dev server: `npm run dev`
5. Run frontend tests: `npm test -- --run`
6. Build for production: `npm run build`

## Frontend data source

The app now reads student data directly from Google Apps Script.

- No Node backend is required for production.
- The frontend fetches the Apps Script URL from [src/config/api.js](src/config/api.js).
- The app validates rows client-side, skips malformed records, and shows a friendly error state when the data source is unavailable.

## Vercel deployment

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Set the environment variable:
   - `VITE_API_BASE_URL=https://script.google.com/macros/s/XXXXXXXX/exec`
4. Deploy.

The frontend is fully compatible with Vercel and does not require the backend folder for production deployment.
