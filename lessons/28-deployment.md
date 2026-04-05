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
- React on `http://localhost:5173`
- Express on `http://localhost:3001`
- MongoDB on `localhost:27017` or MongoDB Atlas

Now we will put your application on the internet so anyone can use it. This process is called **deployment**.

```
Development                          Production
-----------                          ----------
localhost:5173 (React)     -->       yourapp.vercel.app
localhost:3001 (Express)   -->       yourapp.onrender.com
localhost:27017 (MongoDB)  -->       MongoDB Atlas (cloud)
```

---

## 28.2 Building React for Production

In development, Vite serves your React code with hot reloading and debugging tools. For production, we create an optimised build -- smaller files, no debugging overhead, faster loading.

Run the build command:

```bash
cd webapp
npm run build
```

This creates a `dist/` folder containing:

```
webapp/dist/
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

Before deploying, make a few adjustments to your backend:

### Update package.json

Ensure your `package.json` has the correct start and build scripts:

```json
{
  "name": "booking-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- **`build`** -- compiles TypeScript to JavaScript (output in `dist/`).
- **`start`** -- runs the compiled JavaScript (this is what Render will use).

### Update tsconfig.json

Make sure your TypeScript configuration outputs to a `dist` folder:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Dynamic Port and CORS

Your Express app must use the port provided by the hosting platform and allow requests from your frontend domain:

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Use the PORT environment variable (Render sets this automatically)
const PORT = process.env.PORT || 3001;

// Allow requests from your frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/booking-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ... your routes ...

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## 28.5 Deploying the Backend to Render

[Render](https://render.com) offers a free tier for web services, which is perfect for learning projects.

### Step 1: Push to GitHub

If you have not already, push your project to a GitHub repository:

```bash
cd backend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/booking-backend.git
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
| **Name** | `booking-backend` |
| **Region** | Choose the closest to Nepal (Singapore is closest) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Free |

### Step 4: Set Environment Variables

In the Render dashboard, go to **"Environment"** and add:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random string for token signing |
| `CLIENT_URL` | `https://your-frontend.vercel.app` (set after deploying frontend) |
| `ESEWA_MERCHANT_ID` | `EPAYTEST` (or your production merchant ID) |
| `ESEWA_SECRET_KEY` | `8gBm/:&EnhH.1/q` (or your production key) |
| `ESEWA_TEST_MODE` | `true` (set to `false` for production) |
| `NODE_ENV` | `production` |

### Step 5: Deploy

Click **"Create Web Service"**. Render will:
1. Clone your repository
2. Run `npm install && npm run build`
3. Start your server with `npm start`

After a few minutes, your backend will be live at something like:

```
https://booking-backend-xxxx.onrender.com
```

Test it by visiting `https://booking-backend-xxxx.onrender.com/api/rooms` in your browser.

> **Note:** On the free tier, Render spins down your service after 15 minutes of inactivity. The first request after a spin-down takes about 30 seconds to respond. This is fine for learning but not suitable for a real business.

---

## 28.6 Deploying the Frontend to Vercel

[Vercel](https://vercel.com) is excellent for deploying React applications. It is free for personal projects.

### Step 1: Push Frontend to GitHub

```bash
cd webapp
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/booking-frontend.git
git push -u origin main
```

### Step 2: Create a Vercel Account

Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.

### Step 3: Import the Project

1. Click **"Add New Project"**.
2. Select your `booking-frontend` repository.
3. Vercel automatically detects Vite and configures the build settings.

Confirm the settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 4: Set Environment Variables

Add this environment variable in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://booking-backend-xxxx.onrender.com` |

> **Important:** Vite requires environment variables to start with `VITE_` to be available in the browser. This is a security feature -- it prevents accidentally exposing server-side secrets.

### Step 5: Update Frontend API Calls

Make sure your frontend uses the environment variable for API calls:

```typescript
// webapp/src/utils/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'An unexpected error occurred');
  }

  return data as T;
}
```

Now all API calls use the correct URL automatically -- `localhost` in development, Render in production.

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
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React build
  app.use(express.static(path.join(__dirname, '../../webapp/dist')));

  // For any route that is NOT an API route, serve index.html
  // This allows React Router to handle client-side routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../../webapp/dist/index.html'));
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
|----------|---------|----------|
| `PORT` | Set automatically by Render | Auto |
| `NODE_ENV` | `production` | Yes |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/db` | Yes |
| `JWT_SECRET` | `a-long-random-string-at-least-32-characters` | Yes |
| `CLIENT_URL` | `https://your-app.vercel.app` | Yes |
| `ESEWA_MERCHANT_ID` | `EPAYTEST` or production ID | Yes |
| `ESEWA_SECRET_KEY` | Test or production key | Yes |
| `ESEWA_TEST_MODE` | `true` or `false` | Yes |

### Frontend (Vercel)

| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_URL` | `https://your-backend.onrender.com` | Yes |

### Generate a Secure JWT Secret

Use this command to generate a random secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`. Never share this value or commit it to version control.

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

- A **React frontend** with TypeScript, Tailwind CSS, and shadcn/ui components
- **Form handling** with React Hook Form and Zod validation
- **User authentication** with JWT tokens
- **Role-based access** (users and owners)
- An **Express.js REST API** with proper error handling
- **MongoDB database** with Mongoose models and aggregation pipelines
- **Payment integration** with eSewa and Cash on Delivery
- **Dashboard pages** with statistics and data visualisation
- **Responsive design** that works on mobile devices
- **Production deployment** on Render and Vercel

That is a complete, full-stack web application.

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

### Email Notifications with Nodemailer

Send automated emails for booking confirmations, payment receipts, and reminders:

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

await transporter.sendMail({
  from: '"BookingApp" <noreply@bookingapp.com>',
  to: user.email,
  subject: 'Booking Confirmed',
  html: '<h1>Your booking is confirmed!</h1>',
});
```

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
EXPOSE 3001
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

1. **Build for production:** Run `npm run build` in both the `webapp` and `backend` directories. Preview the frontend build with `npm run preview` and confirm everything works.

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
