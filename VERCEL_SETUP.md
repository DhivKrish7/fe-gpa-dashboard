# Vercel Deployment — Step-by-Step
## fe-gpa-dashboard (DhivKrish7/fe-gpa-dashboard)

### What this project is

Your frontend (Vite + React) lives at the **repo root**.  
Data comes from a **Google Apps Script Web App** — not from the Express backend on Vercel.  
The Express backend (`backend/`) is deployed separately on Render/Railway.

Vercel only needs to deploy the **frontend**. That's it.

---

## What to set in the Vercel UI (from your screenshot)

### 1. Framework Preset
Vercel auto-detected **Vite** for the frontend service — that is **correct**. Leave it.

### 2. Root Directory
Set to: **`/`** (repo root — already correct in your screenshot)

> **Do NOT set it to `frontend/` or `backend/`.** The `package.json`, `vite.config.js`,
> and `index.html` are all at root level.

### 3. Build & Output Settings
Leave all as **auto-detected** — Vercel reads `vite.config.js` automatically:
- Build Command: `npm run build`  
- Output Directory: `dist`  
- Install Command: `npm install`

### 4. Environment Variables
This is the **only thing you must configure**:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | Your Google Apps Script Web App URL |

**Example value:**
```
https://script.google.com/macros/s/AKfycby.../exec
```

**Important:** The key in your screenshot shows `VITE_API_BASE_URL` — that matches
exactly what `src/config/api.js` reads:
```js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

Set **Environments** to: `Production and Preview` (already selected in your screenshot ✓)

### 5. The multi-service warning in your screenshot
> `vercel.json required to deploy projects with multiple services`

Vercel detected both `backend/` and the root frontend and got confused.  
**Fix:** Add the `vercel.json` file (provided here) to your repo root.  
It tells Vercel: "this is a single Vite app, ignore the backend folder."

---

## Files to add to your repo

### `/vercel.json` (add to repo root)
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### `/.vercelignore` (add to repo root)
```
backend/
backend/node_modules/
backend/.env
*.json.key
service-account.json
```

---

## Deploy steps

1. Add `vercel.json` and `.vercelignore` to your repo root → commit → push
2. Go back to Vercel → your project → **Redeploy** (or it auto-triggers on push)
3. Vercel will now see a clean single Vite project — no multi-service confusion
4. Add `VITE_API_BASE_URL` in Vercel → Settings → Environment Variables
5. Redeploy once more after adding the env var

---

## Full architecture summary

```
Student browser
      │
      ▼
Vercel (fe-gpa.vercel.app)
  React + Vite frontend
  reads VITE_API_BASE_URL at build time
      │
      │  fetch(VITE_API_BASE_URL)   ← one GET, returns full JSON array
      ▼
Google Apps Script Web App
  doGet() → SpreadsheetApp.openById(SHEET_ID)
  → returns all rows as JSON
      │
      ▼
Google Sheets (live grade data)
```

The Express backend (`backend/`) is **not involved** in the Vercel deployment.  
Deploy it separately on **Render** or **Railway** if you want the richer API
(per-student endpoint, batch stats, leaderboard, etc.).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "vercel.json required for multiple services" | Add the `vercel.json` above to repo root |
| Blank page / 404 on refresh | The `rewrites` rule in `vercel.json` fixes this |
| `VITE_API_BASE_URL is undefined` | Add it in Vercel → Settings → Environment Variables, then redeploy |
| GAS returns CORS error | In your GAS `doGet()`, make sure you return `ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)` — Vercel/browser requires proper content type |
| GAS returns 302 redirect | Publish GAS as "Anyone" access, not "Anyone with link" |

