# PrimeBid

PrimeBid is a MERN auction marketplace demo with role-based dashboards, wallet-based bidding, automatic platform commission settlement, winner handoff, delivery address collection, seller shipment updates, notifications, watchlists, KYC review, and Gemini-powered AI helpers.

This public repository is a clean sharing and deployment copy. It intentionally contains no real `.env` files, no local secrets, no `node_modules`, and no generated frontend `dist` output.

## Project Structure

```text
Aution-platform/
  backend/   Express API, MongoDB models, wallet/auction/fulfillment logic
  frontend/  Vite React app
  docs/      Product and implementation notes
```

## Local Setup

Backend:

```bash
cd Aution-platform/backend
npm install
cp .env.example .env
npm run dev
```

Frontend:

```bash
cd Aution-platform/frontend
npm install
cp .env.example .env
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/v1`

## Required Environment Variables

Set local values in `.env` files and deployment values in the hosting provider dashboard. Do not commit real `.env` files.

Backend essentials:

```bash
NODE_ENV=production
MONGODB_URL=mongodb+srv://...
JWT_SECRET=replace-with-a-long-random-secret
COOKIE_EXPIRE=7
COOKIE_SECURE=true
CLIENT_URL=https://your-frontend-domain
FRONTEND_URL=https://your-frontend-domain
CRON_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
AI_FEATURES_ENABLED=true
GEMINI_MODEL=gemini-2.0-flash
GEMINI_API_KEY=your-gemini-api-key
```

Frontend essentials:

```bash
VITE_API_BASE_URL=https://your-backend-domain/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Verification

```bash
cd Aution-platform/backend
npm test

cd ../frontend
npm test
npm run lint
npm run build
```

## Deployment

See [Aution-platform/DEPLOYMENT.md](Aution-platform/DEPLOYMENT.md) for Vercel, Render, and Netlify deployment notes.

Recommended free demo setup:

1. MongoDB Atlas free cluster.
2. Vercel or Netlify for the frontend.
3. Vercel or Render for the backend.

For real auctions, use a reliable scheduler for `/api/v1/cron/all` so ended auctions settle promptly.
