# TouchMark — Fingerprint Attendance System

TouchMark is a role-based attendance app for administrators, teachers, and students. It combines a React dashboard, an Express/MongoDB API, and an optional Arduino fingerprint sensor.

## Features

- Role-based sign-in and student registration
- Class creation, editing, scheduling, and enrollment
- Fingerprint enrollment and live attendance scanning
- Live scanner connection updates through an authenticated server-sent event stream
- Attendance reports with student/class/date filters, pagination, and CSV/Excel exports
- Student attendance history and summary statistics
- Responsive administrator and teacher dashboards

## Stack

- Frontend: React 19, Vite, Tailwind CSS 4, React Router
- API: Node.js, Express, MongoDB/Mongoose, JWT
- Hardware: Arduino Uno and compatible fingerprint sensor (optional for dashboard-only review)

## Run locally

Requirements: Node.js 18 or newer, MongoDB, and (for biometric features) a configured Arduino and fingerprint sensor.

1. Install frontend and backend dependencies:

   ```sh
   cd frontend && npm install
   cd ../backend && npm install
   ```

2. Configure `backend/.env` using `backend/.env.example`. At minimum set `MONGODB_URI` and a long, random `JWT_SECRET`. Set `NODE_ENV=development` for local development.

3. Start the API from `backend/`:

   ```sh
   npm run dev
   ```

   The API listens on port 5000 by default. It exposes `GET /api/health`.

4. Start the frontend from `frontend/`:

   ```sh
   npm run dev
   ```

   Open the URL printed by Vite (port 3000 in this project). Vite proxies `/api` to `http://localhost:5000`.

For local UI review, load the database-backed demo accounts with the seed command below. Public registration always creates a student account.

### Load interview demo data

With `NODE_ENV=development` and `MONGODB_URI` configured in `backend/.env`, run:

```sh
cd backend
npm run seed:demo
```

This idempotently creates one admin, two teachers, 10 students, four classes, class enrollments, and attendance over the previous five weekdays. Demo accounts use `TouchMarkDemo123!` by default; set `DEMO_ACCOUNT_PASSWORD` and optionally `DEMO_ADMIN_EMAIL` before seeding to use different local credentials. The seed command refuses to run outside development and does not reset existing data. Fingerprints stay unenrolled because real sensor templates must be captured on the connected device.

### Create accounts

- Sign in as the administrator, open **Students**, and create student accounts with temporary passwords; each login is created with its student profile.
- Open **Teacher accounts** to provision teacher logins.
- Share each temporary password out of band. Users can change it from the profile menu after signing in.
- Public student registration remains available and always assigns the student role on the server.

For production, create the first administrator with `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters in a one-off backend environment, then run `npm run create:admin`. Remove those bootstrap variables after the command completes.

## Production deployment

For Render, follow [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md); the root `render.yaml` defines the API and frontend services.

- Build the frontend with `cd frontend && npm run build`; deploy `frontend/dist` to a static host.
- Deploy `backend/` as a Node service and set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`, and `PORT` in the hosting provider’s secret/environment settings. Point `MONGODB_URI` at a separate production database; do not reuse the development database populated by `npm run seed:demo`.
- Set the frontend build variable `VITE_API_URL` to the deployed API base, including `/api` (for example, `https://api.example.com/api`). If the frontend and API share a host, the default `/api` works.
- Permit the frontend origin in the API's `CORS_ORIGIN` setting and configure the host/proxy to allow long-lived `text/event-stream` responses for `/api/fingerprint/events`.
- Configure the static host to send unknown paths to `index.html` so React Router routes load directly.
- Set `ARDUINO_PORT` and `ARDUINO_BAUD_RATE` only on a backend machine physically connected to the scanner. Most cloud hosts cannot access a USB device; dashboard and account features can still run without it.
- Use HTTPS and a strong, unique JWT secret. Do not deploy with `NODE_ENV=development`.

## Commands

```sh
# frontend
npm run dev
npm run lint
npm run build

# backend
npm run dev
npm start
```
