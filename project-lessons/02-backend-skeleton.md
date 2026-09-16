# Project Lesson 02: Backend Skeleton (Node + Express + TypeScript)

## What You Will Learn
- Creating an Express + TypeScript backend from an empty folder
- Configuring `tsconfig.json`, your npm scripts, and running TypeScript with `tsx`
- The **professional folder structure** — `config`, `models`, `controllers`, `routes`, `middleware`, `validators`
- Keeping secrets in `.env` and sharing the shape with `.env.example`
- Connecting to MongoDB with Mongoose
- Building one complete feature end to end: model → validator → controller → route
- A global error handler and a 404 handler
- Testing your API with curl and the VS Code REST Client
- Pointing your Next.js frontend (Lesson 01) at this backend

**This is the other half of your project.** Lesson 01 built the frontend; this lesson builds the server it talks to. You already did this for the Todo app in Lesson 14 and BookMyRoom in Lesson 19 — this version is the clean skeleton you start every new project from.

---

## 2.1 What You Are Building

Your project is **two separate applications** that talk over HTTP:

```
  Next.js frontend                Express backend              MongoDB
  localhost:3000     ───────►     localhost:4001     ───────►  Atlas
  (Lesson 01)                     (this lesson)                (cloud)
                     ◄───────                        ◄───────
                       JSON                           documents
```

They are separate folders, separate `package.json` files, separate terminals. The browser never touches MongoDB — only your backend does. That separation is the single most important thing to be able to explain in your viva.

### Recommended project layout

```
futsal-booking/                 ← one folder for the whole project
├── frontend/                   ← Lesson 01 (Next.js)
└── backend/                    ← this lesson (Express)
```

> **Two repositories or one?** One repository containing both folders is simpler for a two-person team and easier for your supervisor to review. Lesson 03 sets that up.

---

## 2.2 Creating the Project

```bash
mkdir backend
cd backend
npm init -y
```

`npm init -y` creates a `package.json` with default values, skipping the questions.

### Install the packages

```bash
npm install express cors dotenv mongoose express-validator
npm install -D typescript tsx @types/express @types/cors @types/node
```

**What each one does:**

| Package | Why you need it |
|---------|----------------|
| `express` | The web framework — handles routes and requests |
| `cors` | Lets your Next.js app (a different port) call this API |
| `dotenv` | Reads secrets from a `.env` file |
| `mongoose` | Talks to MongoDB using schemas and models |
| `express-validator` | Checks incoming data before it reaches your database |
| `typescript` | The TypeScript compiler (for the production build) |
| `tsx` | Runs `.ts` files directly **and** restarts on save |
| `@types/*` | Type definitions so TypeScript understands these libraries |

The `-D` flag means **devDependency** — needed while developing, not when running in production.

### Why `tsx` and not `ts-node` + `nodemon`?

In Lessons 14 and 19 we used **`ts-node`** to run TypeScript and **`nodemon`** to restart on save. For a new project started today, use **`tsx`** instead. Two reasons:

1. **`ts-node` no longer works with current TypeScript.** Its last release was 10.9.2, and TypeScript has moved on. Install both today and `npm run dev` dies immediately with an internal crash — `TypeError: Cannot read properties of undefined (reading 'fileExists')` — which tells you nothing about the real cause.
2. **`tsx` watches files itself**, so you do not need nodemon or a `nodemon.json` at all. One tool instead of two.

Everything else is identical, and `tsc` still produces your production build. If you open the BookMyRoom backend and see `ts-node` there, that is why it differs — those projects pin an older TypeScript version.

---

## 2.3 TypeScript and Script Configuration

Generate a `tsconfig.json`:

```bash
npx tsc --init
```

That creates a file with every option documented as a comment. Replace its contents with just what we need:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
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

**The two settings that matter most:**

- `"rootDir": "./src"` — your TypeScript source lives in `src/`
- `"outDir": "./dist"` — compiled JavaScript goes to `dist/` when you run `npm run build`
- `"strict": true` — TypeScript catches far more mistakes. Leave it on. It feels annoying for a week, then it starts saving you hours

Open `package.json` and replace the `"scripts"` block:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc",
    "serve": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

| Script | When you use it |
|--------|----------------|
| `npm run dev` | **Every day.** `tsx watch` restarts the server each time you save |
| `npm run typecheck` | Check types without building — run before every commit |
| `npm run build` | Before deploying — compiles `src/` into `dist/` |
| `npm run serve` | Runs the compiled build (this is what Render runs) |

There is no `nodemon.json` — `tsx watch` does the watching itself.

---

## 2.4 The Folder Structure

Create these folders inside `src/`:

```
backend/
├── src/
│   ├── config/            # database connection, other setup
│   │   └── database.ts
│   ├── models/            # Mongoose schemas -- the shape of your data
│   │   └── Listing.ts
│   ├── controllers/       # the actual logic for each route
│   │   └── listingController.ts
│   ├── routes/            # which URL maps to which controller
│   │   └── listingRoutes.ts
│   ├── middleware/        # code that runs between request and controller
│   │   └── validate.ts
│   ├── validators/        # rules for incoming data
│   │   └── listing.validator.ts
│   └── index.ts           # entry point -- wires everything together
├── .env                   # your secrets  (NEVER committed)
├── .env.example           # the template  (committed)
├── .gitignore
├── tsconfig.json
└── package.json
```

### Why split it up like this?

Everything *could* go in one file. For a project this size it would become 2,000 unreadable lines. The split gives each file one job:

| Folder | One-sentence job |
|--------|-----------------|
| `models/` | "This is what a booking looks like in the database" |
| `validators/` | "These are the rules incoming data must pass" |
| `controllers/` | "This is what actually happens when the request arrives" |
| `routes/` | "This URL and method run that controller" |
| `middleware/` | "Run this before the controller — auth checks, validation results" |
| `config/` | "Set up connections and shared configuration" |

**Examiners ask about this.** "Why did you structure it this way?" — the answer is *separation of concerns*: each file has one reason to change, so a bug in validation never means touching database code.

> **Rename `Listing`.** Throughout this lesson `Listing` is a placeholder for whatever your project books. Use `Table` for a restaurant, `Ground` for futsal, `Doctor` for a clinic, `Vehicle` for rentals. Keep the file name and the model name matching.

---

## 2.5 Environment Variables

> **Need your `MONGODB_URI`?** [Lesson 01.2](01.2-mongodb-atlas-setup.md) walks through Atlas — creating the cluster, the database user, opening Network Access, and assembling the string. Do that first; this backend will not start without it.

Create **`.env`** in the project root — this holds your real secrets:

```bash
PORT=4001
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/futsal?retryWrites=true&w=majority
CLIENT_URL=http://localhost:3000
JWT_SECRET=replace-me-with-a-long-random-string
```

Create **`.env.example`** next to it — same keys, **no real values**:

```bash
# Copy this file to .env and fill in your own values:
#   cp .env.example .env

# Port this server listens on.
PORT=4001

# MongoDB connection string from Atlas, or a local mongod:
#   mongodb://127.0.0.1:27017/yourdb
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/yourdb

# Where your Next.js frontend runs. CORS allows only this origin.
CLIENT_URL=http://localhost:3000

# Long random string for signing JWTs. Generate one with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=replace-me-with-a-long-random-string
```

Create **`.gitignore`**:

```gitignore
node_modules/
dist/
.env
uploads/
.DS_Store
```

### Why two files?

`.env` holds your real MongoDB password. It must **never** reach GitHub — anyone who reads it can delete your database. `.env.example` documents *which* variables exist so your teammate knows what to set, without leaking the values.

> **This costs students marks every year.** A committed `.env` in your submitted repository is a security failure your examiner will spot immediately. Write `.gitignore` **before** your first commit.

---

## 2.6 Connecting to MongoDB

`src/config/database.ts`:

```ts
// src/config/database.ts
import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI: string = process.env.MONGODB_URI || "";

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("MongoDB connection failed:", message);
    process.exit(1);
  }
};

export default connectDB;
```

`process.exit(1)` stops the server if the database is unreachable. A backend that is running but cannot reach its database is worse than one that refuses to start — it fails on every request instead of telling you immediately.

---

## 2.7 The Entry Point

`src/index.ts` — this wires everything together:

```ts
// src/index.ts
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database";
import listingRoutes from "./routes/listingRoutes";

// Load environment variables BEFORE anything else reads them
dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 4001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/listings", listingRoutes);

// Health check -- useful for checking the server is alive
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "API is running" });
});

// 404 -- any request that matched no route above
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler -- the safety net
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Unhandled error:", err);

    if (err.name === "ValidationError") {
      res.status(400).json({ message: err.message });
      return;
    }

    if (err.name === "CastError") {
      res.status(400).json({ message: "Invalid ID format" });
      return;
    }

    res.status(500).json({ message: err.message || "Server error" });
  }
);

// Connect to the database first, then start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
```

### Read this file top to bottom

**Order matters enormously in Express.** Every `app.use()` runs in the order you wrote it:

1. `cors` — decide whether this origin is even allowed
2. `express.json()` — turn the JSON body into `req.body`
3. your routes — handle the request
4. the 404 handler — nothing matched
5. the error handler — something threw

Put the 404 handler *above* your routes and every request 404s. Students lose an afternoon to this at least once.

### The error handler's four arguments

```ts
(err, req, res, next) => { ... }
```

Express identifies an error handler purely by it taking **four** parameters. Drop `next` and it silently becomes ordinary middleware that never runs on errors. The underscores (`_req`, `_next`) tell TypeScript "I know I am not using this" — the parameter must still be there.

---

## 2.8 A Model

`src/models/Listing.ts`:

```ts
// src/models/Listing.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IListing extends Document {
  ownerId: Types.ObjectId;
  title: string;
  description: string;
  pricePerHour: number;
  location: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    pricePerHour: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IListing>("Listing", listingSchema);
```

**Two things worth noticing:**

- `{ timestamps: true }` gives you `createdAt` and `updatedAt` automatically. Never write those by hand
- The `IListing` interface and the schema describe the same shape twice — once for TypeScript, once for MongoDB. Keep them in step

---

## 2.9 Validation Rules

`src/validators/listing.validator.ts`:

```ts
// src/validators/listing.validator.ts
import { body } from "express-validator";

export const createListingValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title cannot be more than 100 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required"),

  body("pricePerHour")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("location").trim().notEmpty().withMessage("Location is required"),
];
```

`src/middleware/validate.ts` — runs after the rules and turns failures into a clean 400:

```ts
// src/middleware/validate.ts
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export const validateResult = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: "path" in err ? err.path : "unknown",
        message: err.msg,
      })),
    });
    return;
  }

  next();
};
```

### "But I already validate with Zod on the frontend"

You do — and you still need this. Frontend validation is a **convenience** for honest users. Anyone can open Postman and post whatever they like straight to your API, skipping your React form entirely.

**Validate on both sides. Frontend for the user experience, backend for safety.** That is a viva question, and the answer above is the one examiners want.

---

## 2.10 A Controller

`src/controllers/listingController.ts`:

```ts
// src/controllers/listingController.ts
import { Request, Response } from "express";
import Listing from "../models/Listing";

// GET /api/listings
export const getListings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || "";
    const filter = search
      ? { title: { $regex: search, $options: "i" }, isActive: true }
      : { isActive: true };

    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Listing.countDocuments(filter),
    ]);

    res.json({
      data: listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    res.status(500).json({ message });
  }
};

// GET /api/listings/:id
export const getListingById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    res.json({ data: listing });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    res.status(500).json({ message });
  }
};

// POST /api/listings
export const createListing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const listing = await Listing.create(req.body);
    res.status(201).json({ data: listing });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    res.status(500).json({ message });
  }
};

// PUT /api/listings/:id
export const updateListing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    res.json({ data: listing });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    res.status(500).json({ message });
  }
};

// DELETE /api/listings/:id
export const deleteListing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const listing = await Listing.findByIdAndDelete(req.params.id);

    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    res.json({ message: "Listing deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    res.status(500).json({ message });
  }
};
```

**Three habits in this file that are worth keeping:**

- `res.status(404).json(...)` then `return;` — without the `return`, the code keeps running and Express warns you about sending headers twice
- `{ new: true }` on update makes Mongoose return the **updated** document rather than the old one
- `{ runValidators: true }` makes your schema rules apply on update too. Without it, an update can write data your schema would have rejected on create

---

## 2.11 Routes

`src/routes/listingRoutes.ts`:

```ts
// src/routes/listingRoutes.ts
import { Router } from "express";
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
} from "../controllers/listingController";
import { createListingValidator } from "../validators/listing.validator";
import { validateResult } from "../middleware/validate";

const router = Router();

router.get("/", getListings);
router.get("/:id", getListingById);
router.post("/", createListingValidator, validateResult, createListing);
router.put("/:id", createListingValidator, validateResult, updateListing);
router.delete("/:id", deleteListing);

export default router;
```

Read the POST line left to right — it is the whole request pipeline in one line:

```
validator rules  →  validateResult  →  createListing
   check data       reject if bad      save to database
```

Because `index.ts` mounts this with `app.use("/api/listings", listingRoutes)`, the `/` inside this file means `/api/listings`. The paths combine.

### Run it

```bash
npm run dev
```

```
MongoDB connected successfully
Server running on http://localhost:4001
```

Visit **http://localhost:4001/api/health** — you should see `{"status":"ok","message":"API is running"}`.

---

## 2.12 Testing Your API

### With curl

```bash
# Health check
curl http://localhost:4001/api/health

# Create one
curl -X POST http://localhost:4001/api/listings \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"507f1f77bcf86cd799439011","title":"Green Futsal","description":"Astro turf, floodlights","pricePerHour":1200,"location":"Chabahil"}'

# List them
curl http://localhost:4001/api/listings

# Prove validation works -- this should fail with 400
curl -X POST http://localhost:4001/api/listings \
  -H "Content-Type: application/json" \
  -d '{"title":""}'
```

### With the VS Code REST Client (easier)

Install the **REST Client** extension, create a file called `api.http`, and click "Send Request" above any block:

```http
### Health check
GET http://localhost:4001/api/health

### Get all listings
GET http://localhost:4001/api/listings

### Search and paginate
GET http://localhost:4001/api/listings?search=futsal&page=1&limit=5

### Create a listing
POST http://localhost:4001/api/listings
Content-Type: application/json

{
  "ownerId": "507f1f77bcf86cd799439011",
  "title": "Green Futsal",
  "description": "Astro turf with floodlights",
  "pricePerHour": 1200,
  "location": "Chabahil"
}

### Validation should reject this
POST http://localhost:4001/api/listings
Content-Type: application/json

{
  "title": ""
}
```

Keep `api.http` in your repository. It documents your API and it is genuinely impressive in a demo — you can show every endpoint working in seconds without clicking through the UI.

---

## 2.13 Connecting the Frontend

Your Next.js app from Lesson 01 already has this in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

And this backend has `CLIENT_URL=http://localhost:3000` in its `.env`.

**Those two must agree, in both directions:**

| | Value | Set in |
|---|-------|--------|
| Frontend calls the backend at | `http://localhost:4001/api` | `frontend/.env.local` |
| Backend allows requests from | `http://localhost:3000` | `backend/.env` |

Get either wrong and every request fails with a CORS error in the browser console. The backend will look perfectly healthy in curl — CORS is enforced by the **browser**, not the server, so curl never shows the problem.

### Running both

```bash
# Terminal 1 -- backend first
cd backend
npm run dev            # http://localhost:4001

# Terminal 2 -- frontend
cd frontend
npm run dev            # http://localhost:3000
```

Always start the backend first. The frontend will load without it, but every data request fails.

---

## 2.14 When Things Go Wrong

| Error | Cause | Fix |
|-------|-------|-----|
| `MONGODB_URI is not defined` | No `.env`, or `dotenv.config()` runs too late | Create `.env`; keep `dotenv.config()` at the top of `index.ts` |
| `MongooseServerSelectionError` | Wrong URI, or your IP is not whitelisted | Atlas → Network Access → Add IP Address |
| `bad auth : Authentication failed` | Wrong username/password in the URI | Re-copy it from Atlas. A `@` in the password must be encoded as `%40` |
| CORS error in the browser, curl works fine | `CLIENT_URL` does not match the frontend origin | Set `CLIENT_URL=http://localhost:3000` and restart the backend |
| `req.body` is `undefined` | `express.json()` missing or placed after the routes | Put `app.use(express.json())` above your routes |
| `Cannot set headers after they are sent` | Missing `return` after a `res.` call | Add `return;` after every early response |
| Every route returns 404 | The 404 handler is above the routes | Move it below all `app.use("/api/...")` lines |
| `EADDRINUSE :::4001` | Port already taken | Change `PORT` in `.env`, and `NEXT_PUBLIC_API_URL` to match |
| Changes not picked up | Running `npm start`, not `npm run dev` | Use `npm run dev` — that is the one that watches |
| `TypeError: Cannot read properties of undefined (reading 'fileExists')` | Using `ts-node` with current TypeScript | Use `tsx` — see section 2.2 |

---

## Practice Exercises

### Exercise 1: Build the Skeleton
1. Create your `backend/` folder and install all the packages
2. Add `tsconfig.json` and the scripts
3. Create every folder from section 2.4
4. Get `/api/health` responding before writing anything else

### Exercise 2: Make It Yours
1. Rename `Listing` to your project's main thing — `Table`, `Ground`, `Doctor`, `Vehicle`
2. Change the fields to match. A restaurant table needs `seats` and `tableNumber`, not `pricePerHour`
3. Update the validator to match your new fields
4. Create three records with the REST Client and fetch them back

### Exercise 3: Prove Your Validation
1. Post a listing with an empty title — confirm 400 and a clear message
2. Post one with a negative price — confirm it is rejected
3. Request `/api/listings/abc` (not a real ID) — confirm you get a clean error, not a crash
4. Request `/api/listings/507f1f77bcf86cd799439011` (valid format, no such record) — confirm 404

### Exercise 4: Add a Second Model
Every booking project needs at least two collections. Add the one your project books:

- `Booking` with `listingId`, `customerName`, `date`, `timeSlot`, `status`
- Give it its own model, validator, controller and routes
- `status` should be an enum: `pending`, `confirmed`, `cancelled`

### Exercise 5: Connect the Two Halves
1. Start this backend and your Lesson 01 frontend together
2. Fetch `/api/listings` from a page and render the titles
3. Deliberately change `CLIENT_URL` to the wrong port, reload, and read the CORS error so you recognise it later

---

## Key Takeaways
1. Frontend and backend are **separate applications** — separate folders, terminals and `package.json` files
2. `npm run dev` runs `tsx watch`; `npm run build` compiles `src/` to `dist/` for deployment. Do not use `ts-node` in a new project — it breaks with current TypeScript
3. The folder split is **separation of concerns** — models, validators, controllers, routes each have one job
4. **Order matters in Express**: cors → `express.json()` → routes → 404 → error handler
5. An error handler is recognised by having **four** parameters — `(err, req, res, next)`
6. `.env` holds secrets and is **gitignored**; `.env.example` documents the keys and is committed
7. Validate on the backend even though the frontend validates — anyone can bypass your form with Postman
8. Always `return` after sending a response, or Express complains about duplicate headers
9. `CLIENT_URL` in the backend and `NEXT_PUBLIC_API_URL` in the frontend must agree
10. CORS is enforced by the browser — curl succeeding does not mean your frontend will
