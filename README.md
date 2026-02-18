# Weather Glass - Weatherstack API App

A beautiful glassmorphic React app for fetching weather data from Weatherstack API.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**
   - The API key is already set in `.env`: `827cfc90677841c49092f26883b6b5a6`
   - For Vercel deployment, set `WEATHERSTACK_KEY` in Vercel dashboard (Environment Variables)

## Development

**Important:** After changing `.env` file, you MUST restart the dev server:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

The app will be available at `http://localhost:5173`

## How It Works

- **Local Development:** Vite proxy (`vite.config.ts`) intercepts `/api/*` requests and forwards them to Weatherstack API with your API key
- **Production (Vercel):** Serverless functions in `/api/*` handle requests server-side

## API Endpoints

- `/api/weather` - Current weather
- `/api/historical` - Historical weather  
- `/api/marine` - Marine weather

## Troubleshooting

If you see "You have not supplied an API Access Key":

1. **Restart the dev server** - Vite only loads `.env` on startup
2. Check `.env` file exists and has `VITE_WEATHERSTACK_KEY=827cfc90677841c49092f26883b6b5a6`
3. Verify no extra spaces around the `=` sign
4. Check browser console and terminal for error messages

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push to GitHub/GitLab
2. Import project in Vercel
3. **Set environment variable in Vercel Dashboard:**
   - Go to Project Settings → Environment Variables
   - Add: `WEATHERSTACK_KEY` = `827cfc90677841c49092f26883b6b5a6`
   - **Important:** Use `WEATHERSTACK_KEY` (not `VITE_WEATHERSTACK_KEY`) for serverless functions
4. Deploy

**Note:** The serverless functions (`/api/*`) will automatically handle API requests server-side, keeping your API key secure.
