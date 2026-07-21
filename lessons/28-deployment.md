# Lesson 28: Deployment & What's Next

## What You Will Learn
- Building a React application for production
- Setting up MongoDB Atlas for a production database
- Deploying the backend to Render (free tier)
- Deploying the frontend to Vercel
- Serving React from Express as an alternative single-deployment approach
- Configuring environment variables for production
- Testing the deployed application
- Where to go next in your learning journey

---

## 28.1 From Development to Production

Throughout this course, we have been running everything locally:
- React (booking-frontend) on `http://localhost:3002`
- Express (booking-backend) on `http://localhost:4001`
- MongoDB on Atlas (already, since L15)

Now we will put your application on the internet so anyone can use it. This process is called **deployment**.

```
Development                          Production
-----------                          ----------
localhost:3002 (React)     -->       yourapp.vercel.app
localhost:4001 (Express)   -->       yourapp.onrender.com
Atlas cluster              -->       same Atlas cluster (or a new "prod" one)
```

---

## 28.2 Building React for Production

In development, Vite serves your React code with hot reloading and debugging tools. For production, we create an optimised build -- smaller files, no debugging overhead, faster loading.

Run the build command:

```bash
cd booking-frontend
npm run build
```

This creates a `dist/` folder containing:

```
booking-frontend/dist/
├── index.html          # The single HTML page
├── assets/
│   ├── index-abc123.js   # All your JavaScript, minified
│   └── index-def456.css  # All your CSS, minified
```

**What happened during the build:**
1. **TypeScript compiled to JavaScript** -- browsers cannot run TypeScript directly.
2. **All files bundled together** -- instead of hundreds of separate files, everything is combined into a few.
3. **Code minified** -- variable names shortened, whitespace removed, making files much smaller.
4. **File names hashed** -- `index-abc123.js` includes a hash so browsers know when to download a new version.

You can preview the production build locally:

```bash
npm run preview
```

This starts a local server serving the `dist/` folder, so you can test the production build before deploying.

---

## 28.3 MongoDB Atlas for Production

If you followed Lesson 15, you already have a MongoDB Atlas account. Your cloud database works the same way in production -- you just need the connection string.

If you have not set up Atlas yet, here is a quick summary:

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account.
2. Create a free cluster (M0 tier -- completely free).
3. Create a database user with a username and password.
4. Under "Network Access", add `0.0.0.0/0` to allow connections from anywhere (required for Render and Vercel).
5. Click "Connect" and copy the connection string.

Your connection string looks like this:

```
mongodb+srv://youruser:yourpassword@cluster0.abc123.mongodb.net/booking-app?retryWrites=true&w=majority
```

> **Important:** Replace `youruser` and `yourpassword` with the database user credentials you created, not your Atlas account login.

---

## 28.4 Preparing the Backend for Deployment

The backend from L14-L26 is already deploy-ready in most respects -- it reads every host-specific value from env vars. Two things to double-check before you push:

### package.json scripts

Confirm you have `build` and `start` (from L20). Render runs `npm run build` at deploy time and `npm start` to boot your server:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- **`build`** compiles TypeScript to `dist/`.
- **`start`** runs the compiled JS (Render's entry point).

### tsconfig.json outputs to dist/

If you followed L14, your `tsconfig.json` already sets `"outDir": "./dist"`. If not, add it.

### `index.ts` already reads env vars

The `booking-backend/src/index.ts` you built in L14-L26 already does the right thing:

```typescript
const PORT: number = Number(process.env.PORT) || 4001;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3002",
    credentials: true,
  })
);
```

Render sets `PORT` automatically, and you'll set `CLIENT_URL` to your Vercel domain in the Render dashboard (§28.5 Step 4). **No code changes are needed** -- just the env vars.

> **Note:** the DNS override for Atlas connections you may have added in L26.14 (`dns.setServers(["8.8.8.8", "8.8.4.4"])`) is harmless in production. Render's DNS resolvers already handle SRV/TXT lookups fine, but the override does no harm -- you can leave it in.

---

## 28.5 Deploying the Backend to Render

[Render](https://render.com) offers a free tier for web services, which is perfect for learning projects.

### Step 1: Push to GitHub

If you have not already, push your project to a GitHub repository. This course uses **one monorepo** with `bookmyroom_app/booking-backend/` and `bookmyroom_app/booking-frontend/` as sibling folders, which is how we've committed it end-to-end. Render supports monorepos out of the box -- you point it at the same repo twice (once with `bookmyroom_app/booking-backend` as the Root Directory for the backend service, once with `bookmyroom_app/booking-frontend` for the frontend on Vercel).

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/bookmyroom.git
git push -u origin main
```

### Step 2: Create a Render Account

Go to [render.com](https://render.com) and sign up with your GitHub account.

### Step 3: Create a Web Service

1. Click **"New +"** then **"Web Service"**.
2. Connect your GitHub repository.
3. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `bookmyroom-backend` |
| **Region** | Choose the closest to Nepal (Singapore is closest) |
| **Branch** | `main` |
| **Root Directory** | `bookmyroom_app/booking-backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

### Step 4: Set Environment Variables

In the Render dashboard, go to **"Environment"** and add every variable that lives in your local `.env`. Anything you rely on locally that isn't here will simply be missing in production.

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables Express prod optimisations |
| `MONGODB_URI` | Your MongoDB Atlas connection string | Same URI you used locally |
| `JWT_SECRET` | A long random string | Generate with the `crypto` snippet in §28.8 |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | Set after deploying the frontend; controls CORS |
| `SERVER_BASE_URL` | `https://booking-backend-xxxx.onrender.com` | **Must match this Render service's URL** -- eSewa builds its success/failure callback URLs from this (L26). Localhost breaks eSewa in production. |
| `ESEWA_MERCHANT_ID` | `EPAYTEST` (sandbox) or your production merchant ID | |
| `ESEWA_SECRET_KEY` | `8gBm/:&EnhH.1/q` (sandbox) or your production key | |
| `ESEWA_TEST_MODE` | `true` for the sandbox, `false` for production eSewa | |
| `ABANDONED_BOOKING_MINUTES` | `30` | L26.14 cron window |
| `ABANDONED_BOOKING_CRON` | `*/5 * * * *` | L26.14 cron schedule |
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` (dev) or your real SMTP host | L21.1 email |
| `SMTP_PORT` | `587` | |
| `MAIL_SECURE` | `false` (dev) or `true` (prod SMTP with TLS) | |
| `SMTP_USERNAME` | Mailtrap username or prod SMTP user | |
| `SMTP_PASSWORD` | Mailtrap password or prod SMTP password | |
| `SMTP_DEFAULT_FROM` | `no-reply@yourdomain.com` | Appears in the `From:` header |

> **Where does `PORT` come from?** Render injects it into every web service automatically. Do NOT hard-code it or paste `4001` into the Render dashboard -- our `index.ts` reads `process.env.PORT` and falls back to `4001` only for local dev.
>
> **Don't leave the sandbox eSewa creds in prod.** `EPAYTEST` + `8gBm/:&EnhH.1/q` never process real money; every "successful" payment is fake. When you go live, replace them with the real merchant credentials from your eSewa dashboard AND set `ESEWA_TEST_MODE=false`.

### Step 5: Deploy

Click **"Create Web Service"**. Render will:
1. Clone your repository
2. Run `npm install && npm run build`
3. Start your server with `npm start`

After a few minutes, your backend will be live at something like:

```
https://bookmyroom-backend-xxxx.onrender.com
```

Test it by visiting `https://bookmyroom-backend-xxxx.onrender.com/api/health` in your browser -- it should return `{ "status": "ok", "message": "BookMyRoom API is running" }` from the health-check route we added in L14/L20.

> **Note:** On the free tier, Render spins down your service after 15 minutes of inactivity. The first request after a spin-down takes about 30 seconds to respond. This is fine for learning but not suitable for a real business.

---

## 28.6 Deploying the Frontend to Vercel

[Vercel](https://vercel.com) is excellent for deploying React applications. It is free for personal projects.

### Step 1: Push Frontend to GitHub

The frontend lives in the **same repo** as the backend (`bookmyroom_app/booking-frontend/`). If you already pushed for §28.5 Step 1, skip -- Vercel just needs to know which subfolder to build.

### Step 2: Create a Vercel Account

Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.

### Step 3: Import the Project

1. Click **"Add New Project"**.
2. Select your `bookmyroom` repository.
3. In **Root Directory**, set `bookmyroom_app/booking-frontend`.
4. Vercel detects Vite and configures the rest.

Confirm the settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `bookmyroom_app/booking-frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 4: Set Environment Variables

Add this environment variable in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://booking-backend-xxxx.onrender.com/api` |

> **The trailing `/api` matters.** Our Axios instance is configured as `baseURL: import.meta.env.VITE_API_URL || "http://localhost:4001/api"` (see `booking-frontend/src/services/api.ts`). Every service call then hits `axios.get("/rooms")`, `axios.post("/auth/login")`, etc. -- which resolves to `<VITE_API_URL>/rooms`. If you set `VITE_API_URL` to just `https://backend.onrender.com` (no `/api`), the browser will fetch `https://backend.onrender.com/rooms` and get a 404 for every request. Include the `/api` suffix.
>
> **Why `VITE_`?** Vite only exposes env vars whose names start with `VITE_` to the client bundle. This is a security feature -- it prevents you accidentally shipping a secret to the browser.

### Step 5: No frontend code changes required

`booking-frontend/src/services/api.ts` from L17/L20 already reads `VITE_API_URL` with a localhost fallback:

```typescript
// booking-frontend/src/services/api.ts (already in place from L17)
export const API_URL: string =
  import.meta.env.VITE_API_URL || "http://localhost:4001/api";

const api = axios.create({
  baseURL: API_URL,
  // ...
});
```

Every service (`bookingApi`, `roomApi`, `paymentApi`, `authApi`, ...) uses this shared `api` instance, so **setting `VITE_API_URL` in Vercel is enough to redirect the whole app at the Render backend.** No source changes.

If you were still using the `apiFetch` wrapper from the L11 Todo app days -- migrate to the Axios setup from L17 first. Every subsequent lesson (auth, rooms, bookings, payments) assumes it.

### Step 6: Deploy

Click **"Deploy"**. After a minute or two, your frontend will be live at:

```
https://booking-frontend.vercel.app
```

### Step 7: Update Backend CORS

Now that you know your Vercel URL, go back to Render and update the `CLIENT_URL` environment variable:

```
CLIENT_URL=https://booking-frontend.vercel.app
```

Render will automatically redeploy with the new variable.

---

## 28.7 Alternative: Serve React from Express

Instead of deploying frontend and backend separately, you can serve the React build directly from your Express server. This gives you a single deployment:

```typescript
// backend/src/index.ts
import express from 'express';
import path from 'path';

const app = express();

// ... your API routes ...

// Serve React build files in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React build
  app.use(express.static(path.join(__dirname, "../../booking-frontend/dist")));

  // For any route that is NOT an API route, serve index.html
  // This allows React Router to handle client-side routing
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(
        path.join(__dirname, "../../booking-frontend/dist/index.html")
      );
    }
  });
}
```

With this approach:
- API requests (`/api/*`) are handled by Express as normal.
- All other requests serve the React `index.html`, which lets React Router handle the page.
- You only need one Render deployment instead of Render + Vercel.

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| **Separate (Render + Vercel)** | Vercel is faster for static files, independent scaling | Two deployments to manage |
| **Combined (Render only)** | One deployment, simpler setup | Slower static file serving, single point of failure |

For learning purposes, either approach works well.

---

## 28.8 Environment Variables Checklist

Before going live, verify every environment variable is set correctly:

### Backend (Render)

| Variable | Example | Required |
|---|---|---|
| `PORT` | Set automatically by Render | Auto |
| `NODE_ENV` | `production` | Yes |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/bookmyroom?retryWrites=true&w=majority` | Yes |
| `JWT_SECRET` | `a-long-random-string-at-least-32-characters` | Yes |
| `CLIENT_URL` | `https://your-app.vercel.app` | Yes -- controls CORS |
| `SERVER_BASE_URL` | `https://booking-backend-xxxx.onrender.com` | Yes -- eSewa callback base |
| `ESEWA_MERCHANT_ID` | `EPAYTEST` or production ID | Yes |
| `ESEWA_SECRET_KEY` | Test or production key | Yes |
| `ESEWA_TEST_MODE` | `true` or `false` | Yes |
| `ABANDONED_BOOKING_MINUTES` | `30` | Yes |
| `ABANDONED_BOOKING_CRON` | `*/5 * * * *` | Yes |
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` or prod SMTP host | Yes |
| `SMTP_PORT` | `587` | Yes |
| `MAIL_SECURE` | `false` (Mailtrap) / `true` (prod TLS) | Yes |
| `SMTP_USERNAME` | Your SMTP user | Yes |
| `SMTP_PASSWORD` | Your SMTP password | Yes |
| `SMTP_DEFAULT_FROM` | `no-reply@yourdomain.com` | Yes |

### Frontend (Vercel)

| Variable | Example | Required |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` | Yes -- **include the `/api` suffix** |

### Generate a Secure JWT Secret

Use this command to generate a random secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`. Never share this value or commit it to version control.

### Two Atlas clusters in production?

Optional but recommended once you go live: keep the L15 sandbox cluster for development and create a second, empty cluster for production so student demo data doesn't sit next to real bookings. Same connection-string shape; just paste the prod URI into Render.

---

## 28.9 Testing the Deployed Application

Once both deployments are live, test the complete flow:

1. **Open the Vercel URL** in your browser.
2. **Register a new account** -- verify the API call reaches Render and the user is saved in MongoDB Atlas.
3. **Log in** -- check that you receive a JWT token and can access protected routes.
4. **Create a room** (as an owner) -- confirm it appears in the rooms list.
5. **Create a booking** -- test both COD and eSewa payment methods.
6. **Check the dashboard** -- verify statistics are calculated correctly.
7. **Test on mobile** -- resize your browser or use your phone to check responsive layout.
8. **Check error handling** -- try invalid inputs and confirm meaningful error messages appear.

### Common Deployment Issues

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| CORS errors in browser console | `CLIENT_URL` not set or incorrect on Render | Update the environment variable to match your Vercel URL exactly |
| "Cannot connect to server" | Backend not running or wrong `VITE_API_URL` | Check Render logs; verify the URL in Vercel environment variables |
| "MongoServerError: bad auth" | Wrong MongoDB credentials | Double-check the username and password in `MONGODB_URI` |
| Login works but pages are blank | React Router not handling client-side routes | Ensure Vercel serves `index.html` for all routes (Vite preset does this automatically) |
| Slow first load | Render free tier spun down | Wait 30 seconds for Render to spin up; consider upgrading for a real project |

---

## 28.10 What You Have Built

Take a moment to appreciate what you have accomplished. Starting from zero, you have built:

- A **React + TypeScript frontend** with Tailwind CSS and shadcn/ui, built on Vite
- **Form handling** with React Hook Form + Zod, using shadcn `Field` primitives
- **JWT authentication** with role-based access (guest vs owner), forgot-password OTP flow, change-password, and email verification (L20-L21.1)
- An **Express.js REST API** with a shared `{ data, meta } / { message }` envelope, centralised validation, and existence-safe 404 authorisation
- **MongoDB via Mongoose** with schema validation, indexes, and aggregation pipelines
- **Image uploads** for rooms with Multer, path-traversal guards, and gallery management (L22)
- **Owner Portal** built on the shadcn sidebar-07 block (L23)
- **Room browsing** with cards, filters, and detail pages (L24)
- A full **booking system** with pending/confirmed/cancelled states, owner + guest email notifications, shared `BookingSummary`, and dedicated guest + owner detail pages (L25)
- **Payment integration**: COD with owner-marks-received flow, eSewa with HMAC-SHA256 signed payloads and backend callbacks, payment-received emails, and a cron sweep for abandoned bookings (L26)
- **Dashboards** with server-side MongoDB aggregation, `<StatsCard>` skeleton loading, reusable `<DataTable>`, and reused `<BookingCard>` for the guest view (L27)
- **Toast notifications** via Sonner mounted once and driven from every mutation hook
- **Responsive navigation** with a role-aware hamburger `Sheet` below `md` (L27)
- **Production deployment** on Render + Vercel with correct env-var wiring

That is a complete, production-grade full-stack web application.

---

## 28.11 What's Next: Continuing Your Journey

You now have a solid foundation. Here are the most valuable topics to explore next:

### Real-Time Features with WebSockets

Currently, users must refresh the page to see new data. With WebSockets (using [Socket.io](https://socket.io/)), you can push updates instantly:

```typescript
// Example: notify owner when a new booking is created
io.to(ownerId).emit('new-booking', { booking });
```

Use cases: live booking notifications, chat between user and owner, real-time availability updates.

### Take the L21.1 email system to real deliverability

You already have Nodemailer wired end-to-end -- booking-created, owner-decision, payment-received, OTP -- against Mailtrap for development. To go live:

- Swap the Mailtrap sandbox creds for a real transactional provider (AWS SES, Postmark, SendGrid, Resend). It's just the same env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_SECURE=true`).
- Set up **SPF, DKIM and DMARC** on the sending domain so major inboxes (Gmail, Outlook) don't spam your emails.
- Add a **bounce/complaint webhook** to unsubscribe or flag bad recipients.
- Extend the template set: booking reminders 24h before check-in, review requests after check-out, refund confirmations.

### Admin Panel

Build an admin interface for managing all users, rooms, and bookings. Libraries like [React Admin](https://marmelab.com/react-admin/) can speed this up significantly.

### Testing with Vitest

Write automated tests to catch bugs before they reach production:

```typescript
// Example test with Vitest
import { describe, it, expect } from 'vitest';
import { generateSignature } from '../services/esewa.service';

describe('eSewa Service', () => {
  it('should generate a valid signature', () => {
    const signature = generateSignature('total_amount=100,transaction_uuid=123,product_code=EPAYTEST');
    expect(signature).toBeTruthy();
    expect(typeof signature).toBe('string');
  });
});
```

### Docker Containers

Package your application into Docker containers for consistent deployments across any platform:

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 4001
CMD ["node", "dist/index.js"]
```

### CI/CD with GitHub Actions

Automate testing and deployment so every push to `main` is automatically tested and deployed:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
```

### Other Ideas

- **Image uploads** -- let owners upload room photos (using Cloudinary or AWS S3)
- **Search and filtering** -- full-text search, price range filters, location-based search
- **Reviews and ratings** -- let users rate rooms after their stay
- **Internationalisation (i18n)** -- support multiple languages (Nepali and English)
- **Progressive Web App (PWA)** -- make your app installable on mobile devices

---

## Practice Exercises

1. **Build for production:** Run `npm run build` in both `booking-frontend` and `booking-backend`. Preview the frontend build with `npm run preview` and confirm everything works.

2. **Deploy the backend:** Create a Render account, connect your GitHub repository, set the environment variables, and deploy. Verify the API is accessible at the Render URL.

3. **Deploy the frontend:** Create a Vercel account, connect your GitHub repository, set `VITE_API_URL`, and deploy. Verify the application loads and can communicate with the backend.

4. **End-to-end test:** Go through the entire user flow on your deployed application: register, log in, browse rooms, create a booking, complete payment, view dashboard.

5. **Share your work:** Send the Vercel URL to a friend or classmate. Ask them to register and create a booking. Check that their data appears in your owner dashboard.

6. **Challenge:** Set up the combined deployment (serve React from Express) on a single Render instance. Compare the two approaches and decide which you prefer.

---

## Key Takeaways

- **`npm run build`** creates an optimised production bundle with minified code and hashed file names.
- **MongoDB Atlas** provides a free cloud database that works identically in development and production.
- **Render** hosts your Express backend for free, though the free tier spins down after inactivity.
- **Vercel** hosts your React frontend for free with excellent performance and automatic HTTPS.
- **Environment variables** keep secrets out of your code and let you configure different values for development and production.
- **CORS configuration** must match your frontend URL exactly, or the browser will block API requests.
- **Always test the deployed application end-to-end** before sharing it with others.
- **This is just the beginning.** WebSockets, email, testing, Docker, and CI/CD are all natural next steps that build on everything you have learnt.

---

## Course Completion

Congratulations! You have completed the entire course. You started with no coding experience and have built a full-stack web application with:

- HTML, CSS, and JavaScript fundamentals
- TypeScript for type safety
- React for building user interfaces
- Tailwind CSS and shadcn/ui for professional styling
- React Hook Form and Zod for validation
- Node.js and Express for the backend API
- MongoDB for data storage
- Authentication and authorisation
- Payment integration
- Dashboard analytics
- Production deployment

You are now a **junior full-stack developer**. Keep building, keep learning, and keep shipping.
