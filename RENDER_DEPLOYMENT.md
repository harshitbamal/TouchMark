# Deploy TouchMark on Render

The repository includes a Render Blueprint at `render.yaml` for two services: the Express API and the Vite static site. MongoDB remains hosted separately (for example, MongoDB Atlas).

## Before creating the Render services

1. Push this repository to a GitHub or GitLab repository that Render can access.
2. In MongoDB Atlas, create a **separate production database** and a database user with a strong password. Do not use the development `test` database or seed demo credentials for production.
3. Configure Atlas Network Access to allow connections from Render. Render's outbound addresses can vary, so Atlas may require allowing `0.0.0.0/0`; use a strong database password and a user scoped to this app's database.

## Create the services

1. In Render, choose **New → Blueprint**, connect the repository, and let Render read `render.yaml`.
2. Provide `MONGODB_URI` for the production database and `CORS_ORIGIN` for the frontend's Render origin when prompted. The expected origins are `https://touchmark-frontend.onrender.com` and API URL `https://touchmark-api.onrender.com/api`; Render may adjust a name if it is already taken. If so, use the actual service URLs instead.
3. Render generates `JWT_SECRET` automatically. Keep it private and do not add it to the frontend.
4. Once both services exist, check their actual URLs. Set the frontend service's `VITE_API_URL` to `https://<actual-api-host>/api`, and set the API service's `CORS_ORIGIN` to `https://<actual-frontend-host>`. Save each change and redeploy the affected service. `VITE_API_URL` is applied at frontend build time.
5. Wait for the API health check at `/api/health`, then open the frontend URL.

## Create the first administrator

Run the one-time bootstrap from your local machine, using the **production** MongoDB URI and a unique admin email/password. In PowerShell, from `backend/`:

```powershell
$env:NODE_ENV = 'production'
$env:MONGODB_URI = '<production MongoDB URI>'
$env:BOOTSTRAP_ADMIN_EMAIL = '<your admin email>'
$env:BOOTSTRAP_ADMIN_PASSWORD = '<unique password with at least 12 characters>'
npm run create:admin
Remove-Item Env:BOOTSTRAP_ADMIN_EMAIL
Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD
```

The script refuses to create another administrator if one already exists. Then sign in through the deployed site and create teacher/student accounts from the admin workspace. Do not use the demo seed account on a public deployment.

## Hardware and free-plan behavior

Render's cloud process cannot access a fingerprint reader connected by USB to your computer. The dashboards, login, account management, class enrollment, stored attendance, reports, and API status work in the cloud, but live fingerprint capture requires hardware connected to a machine running the backend. The deployed UI will report the scanner as disconnected. Free web services may also sleep when idle, so the first request after inactivity can take longer.

The API emits scanner updates over Server-Sent Events. Keep the API service public and make sure the frontend uses its HTTPS URL; the app reconnects if the stream closes.
