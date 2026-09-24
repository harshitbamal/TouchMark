# Backend setup

## Requirements

- Node.js 18 or newer
- MongoDB (local or hosted)
- An Arduino fingerprint scanner for biometric enrollment and scanning

## Configure and start locally

1. Install packages: `npm install`
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=development`, and your `ARDUINO_PORT` if using a sensor.
3. Load the realistic interview/demo data: `npm run seed:demo`. The command only runs in development and is safe to rerun.
4. Start the API: `npm run dev`. Check `GET http://localhost:5000/api/health`.

The demo seed creates one admin (`admin@touchmark.local`), two teachers, 10 student accounts, four classes, enrollments, and five weekdays of attendance. All demo accounts use `TouchMarkDemo123!` unless `DEMO_ACCOUNT_PASSWORD` was set before running the seed. Fingerprint profiles remain pending until a real fingerprint is enrolled on the device.

## Create the first production administrator

On a new production database, provide `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` with at least 12 characters in a one-off backend environment, then run:

```sh
npm run create:admin
```

This command refuses to create an admin if one already exists. Remove both bootstrap variables after it succeeds. Never expose them in frontend configuration.

## Account management

- The administrator creates teacher accounts from the Teacher accounts page.
- The administrator creates student accounts from the Students page. The API creates both the student profile and login, always with the student role.
- Give each account its temporary password securely. Users can change it from the profile menu after signing in.
- Public registration only creates student accounts. The login endpoint determines each user's role from the database.

## Arduino notes

Configure `ARDUINO_PORT` and `ARDUINO_BAUD_RATE=9600`. The backend reports status changes through the authenticated `/api/fingerprint/events` SSE route and retries a disconnected serial device every five seconds. Cloud hosts without USB access can still run account, class, and report features, but cannot enroll or scan fingerprints.

## Production

Set `NODE_ENV=production`, `MONGODB_URI`, a unique `JWT_SECRET` of at least 32 characters, `CORS_ORIGIN`, and `PORT` in the hosting environment. Point `MONGODB_URI` at a separate production database; do not reuse the development database populated by `npm run seed:demo`. Set the frontend build variable `VITE_API_URL` to the deployed API base ending in `/api`. Use HTTPS and do not set production environment variables in the frontend.
