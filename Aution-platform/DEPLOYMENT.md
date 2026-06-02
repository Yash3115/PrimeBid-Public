# PrimeBid Deployment Guide

PrimeBid is a split MERN app:

- `frontend`: Vite + React static app
- `backend`: Express API + MongoDB
- Database: MongoDB Atlas is recommended for deployment

Deploy the frontend and backend as separate services. Set exact environment variables in the hosting dashboard; do not commit real `.env` files.

## Best Free Demo Setup

Recommended free path for a small demo:

1. MongoDB Atlas free cluster for the database.
2. Vercel or Netlify for the frontend.
3. Render free web service for the backend, or Vercel backend if daily auction settlement is acceptable.

For auction demos, a backend that stays warm is better because ended-auction settlement, notifications, wallet transfer, and fulfillment creation are background tasks. Free services can sleep or limit cron frequency, so always test closing an auction after deployment.

## Local Development

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Local defaults:

- Backend API: `http://localhost:8000/api/v1`
- Frontend app: `http://localhost:5173`
- Frontend `.env`: `VITE_API_BASE_URL=http://localhost:8000/api/v1`
- Backend `.env`: keep `COOKIE_SECURE=false` for local HTTP.

Useful checks:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/ready
```

`/health` confirms the server process is alive. `/ready` confirms the API can connect to MongoDB.

Seed or repair the demo Super Admin after `MONGODB_URL` is set:

```bash
cd backend
npm run seed:admin
```

Default admin credentials created by that command:

- Email: `admin@primebid.local`
- Password: `PrimeBid@123`

For a deployed backend, run the same command locally with the deployed backend's exact `MONGODB_URL`, or run it from the hosting provider's shell if available. If deployed login fails while local login works, the backend service is almost always pointing at a different MongoDB database or stale environment variable.

## Backend Environment Variables

Set these for the backend service:

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
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_MAIL=your-smtp-login@example.com
SMTP_PASSWORD=your-smtp-app-password
SMTP_FROM="PrimeBid <your-smtp-login@example.com>"
AI_FEATURES_ENABLED=true
GEMINI_MODEL=gemini-2.0-flash
GEMINI_API_KEY=your-gemini-key
ADMIN_SEED_USERNAME=PrimeBid Admin
ADMIN_SEED_EMAIL=admin@primebid.local
ADMIN_SEED_PASSWORD=PrimeBid@123
ADMIN_SEED_PHONE=9000000001
ADMIN_SEED_ADDRESS=PrimeBid admin workspace
```

Notes:

- `CLIENT_URL` and `FRONTEND_URL` can contain comma-separated origins.
- Trailing slashes are safe, but exact origins are still best.
- Keep `COOKIE_SECURE=true` on HTTPS hosting.
- The API also accepts `Authorization: Bearer <token>` for deployed frontends where cross-site cookies are blocked.
- Email delivery is used for auction-winner emails. Use either `SMTP_SERVICE` or `SMTP_HOST + SMTP_PORT`. If `SMTP_HOST` is set, the backend uses host/port and ignores the service shortcut.
- Common SMTP ports: `465` means SSL/TLS (`SMTP_SECURE=true`), while `587` means STARTTLS (`SMTP_SECURE=false`). Gmail typically requires an app password, not your normal password.
- `ADMIN_SEED_*` variables are only used when running `npm run seed:admin`; the API does not create a default admin during normal startup.

## Frontend Environment Variables

Set these for the frontend service:

```bash
VITE_API_BASE_URL=https://your-backend-domain/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_EMAILJS_SERVICE_ID=your-emailjs-service-id
VITE_EMAILJS_TEMPLATE_ID=your-emailjs-template-id
VITE_EMAILJS_PUBLIC_KEY=your-emailjs-public-key
```

If the frontend and backend are deployed behind the same domain with `/api/v1` routed to the backend, `VITE_API_BASE_URL` can be omitted and the app will use `/api/v1`.

The EmailJS variables power the frontend Contact form. Configure the EmailJS service/template to accept the same template fields used by the app: `name`, `email`, `phone`, `subject`, and `message`.

## Vercel Deployment

### Frontend On Vercel

Create a Vercel project with:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

The included `frontend/vercel.json` rewrites all routes to `index.html` so React Router pages work on refresh.

### Backend On Vercel

Create a second Vercel project with:

- Root Directory: `backend`
- Build/runtime: Node
- Entry: `index.js`

The backend exports the Express app for serverless hosting. It only starts `app.listen()` and local `node-cron` jobs outside Vercel.

The included `backend/vercel.json` schedules `/api/v1/cron/all` once daily so it can deploy on Vercel Hobby. For real auctions, use Vercel Pro or an external cron service to call:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-backend-domain/api/v1/cron/all
```

## Render Deployment

The included `render.yaml` can create:

- `primebid-api`: backend web service
- `primebid-web`: frontend static site

After creating the services, fill the `sync: false` environment variables in Render.

Set:

- Backend `CLIENT_URL` and `FRONTEND_URL` to the deployed frontend URL.
- Frontend `VITE_API_BASE_URL` to `https://your-api-domain/api/v1`.
- Backend `SMTP_*` variables if you want auction-winner emails in production.
- Frontend `VITE_EMAILJS_*` variables if you want the Contact form to send emails in production.

Free Render services may sleep when idle, so the first request can be slow and in-process cron may not run while the service is sleeping.

## Netlify Frontend Deployment

Use Netlify for the frontend only:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

The included `frontend/netlify.toml` handles React Router refreshes.

## Smoke Checks

After deploying:

```bash
curl https://your-backend-domain/health
curl https://your-backend-domain/ready
curl -H "Authorization: Bearer <CRON_SECRET>" https://your-backend-domain/api/v1/cron/all
```

Then verify from the frontend:

- Register/login with email/password.
- Confirm Google login only if both frontend and backend Google client IDs are set.
- Create an auction as an approved auctioneer.
- Add wallet balance as a bidder.
- Place a bid.
- Let an auction end and run the cron endpoint.
- Confirm wallet settlement, winner notification, delivery address, and seller shipment flow.

## Common Deployment Problems

- Login works locally but not deployed: check `COOKIE_SECURE=true`, `CLIENT_URL`, `FRONTEND_URL`, and `VITE_API_BASE_URL`.
- Admin seed works locally but deployed admin login still says invalid password: verify Vercel/Render has the same `MONGODB_URL` you seeded, then redeploy or rerun `npm run seed:admin` against the deployed database.
- CORS error: set the exact frontend origin in backend `CLIENT_URL` and `FRONTEND_URL`.
- Auction does not settle after ending: run `/api/v1/cron/all` with the `Authorization` header and check backend logs.
- Winner email does not send: verify `SMTP_MAIL`, `SMTP_PASSWORD`, and either `SMTP_SERVICE` or `SMTP_HOST + SMTP_PORT` in the backend environment.
- Contact form does not send: verify `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` in the frontend environment, then rebuild/redeploy the frontend.
- Frontend refresh returns 404: confirm Vercel rewrites or Netlify redirects are active.
- MongoDB connection fails: confirm the Atlas connection string, database user password, and Atlas network access settings.
