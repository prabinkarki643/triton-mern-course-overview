# Lesson 19: Booking App -- Project Setup & Data Models

## What You Will Learn
- Planning a real-world application with multiple user roles
- Organising backend + frontend inside a single `bookmyroom_app/` root folder
- Setting up the **same tooling as the Todo app**: nodemon + ts-node for backend, Vite + shadcn for frontend
- Running the backend on port **4001** and the frontend on port **3001**
- Structuring a professional backend with controllers, routes, validators, and services
- Structuring a scalable React frontend with `services/`, `hooks/`, `pages/`, and `layouts/`
- Defining Mongoose models with full TypeScript interfaces
- Connecting to MongoDB
- Understanding document references between collections

---

## 19.1 Introducing BookMyRoom

We have built a Todo app and learned the fundamentals. Now it is time to build something bigger -- **BookMyRoom**, a room and venue booking application.

### What BookMyRoom Does

Imagine Airbnb, but for meeting rooms and event spaces:

- **Room Owners** list their rooms with photos, pricing, and amenities
- **Users** browse rooms, book them for specific dates, and pay
- **Authentication** ensures only the right people access the right features
- **Payments** support both eSewa (digital wallet) and cash on delivery

### Two Portals

| Portal | Who Uses It | What They Can Do |
|--------|-------------|------------------|
| **Owner Portal** | Room owners | Add rooms, manage bookings, view earnings |
| **User Portal** | Customers | Browse rooms, make bookings, manage their bookings |

### Feature Overview

```
Authentication
├── Register (as Owner or User)
├── Login
└── Protected routes (role-based)

Owner Features
├── Add new rooms
├── Edit/delete rooms
├── View bookings for their rooms
└── Confirm/reject bookings

User Features
├── Browse all available rooms
├── View room details
├── Book a room (select dates, guests)
├── Choose payment method (eSewa or COD)
└── View/cancel their bookings
```

---

## 19.2 Technology Choices

We are using **MongoDB** with **Mongoose** for the booking app (same as our Todo API). Here is why MongoDB is a great fit:

**Why MongoDB for BookMyRoom?**
- Rooms have varying amenities and images (flexible document structure)
- Nested data like arrays of amenities fits naturally in documents
- Mongoose provides excellent TypeScript support
- MongoDB Atlas offers a free cloud database -- no server setup needed

### Full Stack

```
Frontend                    Backend                    Database
─────────                   ────────                   ────────
React 18+                   Express.js                 MongoDB
TypeScript                  TypeScript                 (via Atlas)
Tailwind CSS                Mongoose (ODM)
shadcn/ui                   JWT Authentication
React Hook Form             bcrypt (passwords)
Zod (frontend forms)        express-validator (server)
React Query                 RESTful API
React Router v6             CORS
Axios                       Multer (file uploads)
```

> **Why split this way?** We use **Zod on the frontend** to type and validate forms (paired with React Hook Form). On the backend, we use **express-validator** -- exactly the same pattern as our Todo API. Students should not have to relearn validation.

---

## 19.3 Project Folder Layout

To keep both projects together, create a single root folder `bookmyroom_app` and place `booking-backend` and `booking-frontend` inside it:

```bash
mkdir bookmyroom_app
cd bookmyroom_app
```

The final structure will look like:

```
bookmyroom_app/
├── booking-backend/      # Express + Mongoose API
└── booking-frontend/     # React + shadcn UI
```

Run every backend command in `booking-backend/` and every frontend command in `booking-frontend/`.

---

## 19.4 Setting Up the Backend Project

From inside `bookmyroom_app/`:

```bash
mkdir booking-backend
cd booking-backend
npm init -y
```

### Install Dependencies

```bash
# Core dependencies
npm install express mongoose cors dotenv express-validator

# TypeScript and types
npm install -D typescript ts-node @types/express @types/cors @types/node nodemon

# Auth dependencies (we will use these in Lesson 20)
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken
```

> **No Zod here** -- this is the backend. Server-side validation uses **express-validator** chains, exactly like the Todo API in Lesson 16.
>
> **`nodemon` + `ts-node`** -- same setup as the Todo backend. `nodemon` watches the `src` folder and restarts the server via `ts-node` whenever you save a `.ts` file.

### TypeScript Configuration

```bash
npx tsc --init
```

Update `tsconfig.json`:

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
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Nodemon Configuration

Create a `nodemon.json` in the project root -- same pattern as the Todo backend:

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/index.ts"
}
```

### Package.json Scripts

Update `package.json` so `npm run dev` runs nodemon:

```json
{
  "scripts": {
    "start": "ts-node src/index.ts",
    "dev": "nodemon",
    "build": "tsc",
    "serve": "node dist/index.js"
  }
}
```

- `dev` -- nodemon watches `src/` and restarts via `ts-node` on any `.ts` save
- `start` -- one-off run with `ts-node` (no auto-restart)
- `build` -- compiles TypeScript to JavaScript in `dist/`
- `serve` -- runs the compiled JavaScript in production

---

## 19.5 Backend Project Structure

Create this folder structure (mirrors the Todo backend, plus a `validators/` folder and `uploads/` for Lesson 22's file uploads):

```bash
mkdir -p src/{models,routes,controllers,middleware,validators,services,config,types}
mkdir uploads
touch src/index.ts src/config/database.ts
```

```
booking-backend/
├── src/
│   ├── config/
│   │   └── database.ts        # MongoDB connection
│   ├── controllers/
│   │   ├── authController.ts  # Auth logic (Lesson 20)
│   │   ├── roomController.ts  # Room CRUD (Lesson 22)
│   │   └── bookingController.ts
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification (Lesson 20)
│   │   ├── upload.ts          # Multer config (Lesson 22)
│   │   └── validate.ts        # express-validator runner
│   ├── models/
│   │   ├── User.ts            # User Mongoose model
│   │   ├── Room.ts            # Room Mongoose model
│   │   └── Booking.ts         # Booking Mongoose model
│   ├── routes/
│   │   ├── authRoutes.ts      # /api/auth/*
│   │   ├── roomRoutes.ts      # /api/rooms/*
│   │   └── bookingRoutes.ts   # /api/bookings/*
│   ├── validators/
│   │   ├── auth.validator.ts  # express-validator chains
│   │   ├── room.validator.ts
│   │   └── booking.validator.ts
│   ├── services/              # Business logic (optional layer)
│   ├── types/
│   │   └── express.d.ts       # Extended Request type (req.user)
│   └── index.ts               # Express app entry point
├── uploads/                   # Multer destination for room images (gitignored)
├── .env                       # Environment variables
├── .gitignore
├── nodemon.json
├── package.json
└── tsconfig.json
```

### Why This Structure?

| Folder | Purpose | Example |
|--------|---------|---------|
| `models/` | Database schema definitions | "A Room has a title, price, and owner" |
| `routes/` | URL endpoint definitions | "POST /api/rooms goes to createRoom" |
| `controllers/` | Request handling logic | "Read the body, create a room, send response" |
| `validators/` | express-validator chains per endpoint | "title must be 3-100 chars" |
| `middleware/` | Functions that run before controllers | "Check if the user is logged in" |
| `services/` | Reusable business logic | "Calculate total price for a booking" |
| `config/` | Configuration and connections | "Connect to MongoDB" |
| `types/` | TypeScript type definitions | "Add `user` property to Express Request" |
| `uploads/` | Saved room images (filled by Multer) | `1736294423-cosy-apartment.jpg` |

Think of it like a restaurant:
- **Routes** are the menu (what the customer can order)
- **Controllers** are the waiters (take the order and deliver the food)
- **Services** are the chefs (do the actual cooking)
- **Middleware** is the host at the door (checks your reservation before letting you in)
- **Models** are the recipes (define what each dish looks like)

---

## 19.6 Setting Up the Frontend Project

From inside `bookmyroom_app/` (the same root folder, alongside `booking-backend`):

We will use the **shadcn CLI** -- the same one-shot setup we used for the Todo app in Lesson 13. It scaffolds Vite + React + TypeScript + Tailwind CSS + shadcn/ui in a single command.

### Step 1: Scaffold the Project

```bash
npx shadcn@latest init --template vite --name booking-frontend
```

The CLI will ask you a few questions -- pick the defaults (style: New York, base colour: Neutral, etc.). When it finishes, move into the project:

```bash
cd booking-frontend
npm install
```

> What does this single command set up? Vite, React, TypeScript, Tailwind CSS, shadcn/ui, the `@/` path alias and `components.json` -- exactly the same starting point as the Todo app.
>
> Want a custom theme? You can build one at [ui.shadcn.com/create](https://ui.shadcn.com/create) and pass the generated code with `--preset <CODE>`. For this course we will use the defaults.

### Step 2: Set the Dev Server Port to 3001

By default Vite runs on `5173`. We want the booking app on **port 3001** so it does not clash with anything else (and so it matches the `CLIENT_URL` the backend allows in its CORS config). Open `vite.config.ts` and add a `server` block:

```ts
// booking-frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
  },
});
```

> The `plugins`, `resolve.alias` lines are already there from the preset -- you are just adding the `server.port` line.

### Step 3: Add the shadcn Components We Will Use

```bash
npx shadcn@latest add button input card label badge dialog alert-dialog select tabs avatar form table skeleton dropdown-menu sonner
```

### Step 4: Install the Rest of the Libraries

```bash
npm install react-router-dom axios react-hook-form zod @hookform/resolvers @tanstack/react-query @tanstack/react-table lucide-react
```

Same libraries as the Todo app, plus `@tanstack/react-table` for the owner DataTables we built in Lesson 17.1.

---

## 19.7 Frontend Project Structure

Use the same folder layout as the Todo app frontend, just with more files:

```
booking-frontend/
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── Navbar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── rooms/               # Room-related components
│   │   └── bookings/            # Booking-related components
│   ├── context/
│   │   └── (auth lives in a hook now -- see Lesson 21)
│   ├── hooks/
│   │   ├── useAuth.ts           # useCurrentUser / useLogin / useRegister / useLogout
│   │   ├── useRooms.ts          # React Query hooks for rooms
│   │   ├── useBookings.ts       # React Query hooks for bookings
│   │   └── useRoomFilters.ts    # URL search params filter hook (Lesson 24)
│   ├── layouts/
│   │   ├── MainLayout.tsx       # Public layout (Navbar + Outlet + Footer)
│   │   ├── OwnerLayout.tsx      # Owner sidebar layout
│   │   └── AuthLayout.tsx       # Centred card for login/register
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── RoomListPage.tsx
│   │   ├── RoomDetailPage.tsx
│   │   ├── MyBookingsPage.tsx
│   │   ├── owner/
│   │   │   ├── OwnerDashboard.tsx
│   │   │   ├── OwnerRoomsPage.tsx
│   │   │   └── OwnerBookingsPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── schemas/
│   │   ├── authSchema.ts        # Zod schemas for login/register forms
│   │   ├── roomSchema.ts        # Zod schema for room form
│   │   └── bookingSchema.ts     # Zod schema for booking form
│   ├── services/                # Same name and purpose as the Todo app
│   │   ├── api.ts               # Axios instance (with auth interceptor)
│   │   ├── authApi.ts           # login / register / getMe
│   │   ├── roomApi.ts           # Room CRUD
│   │   └── bookingApi.ts        # Booking CRUD
│   ├── types/
│   │   ├── user.ts
│   │   ├── room.ts
│   │   └── booking.ts
│   ├── App.tsx
│   ├── main.tsx                 # BrowserRouter + QueryClientProvider + Toaster
│   └── index.css
├── .env                         # VITE_API_URL=http://localhost:4001/api
├── package.json
├── tsconfig.json
└── vite.config.ts               # server.port = 3001
```

### Why Not `api/` Like Many Tutorials?

In the Todo app we used `services/` -- so we keep the same name here. Every Axios call lives in `services/`:

- `services/api.ts` -- the **Axios instance** (base URL, interceptors)
- `services/authApi.ts`, `services/roomApi.ts`, etc. -- typed **API service layers** built on top of that instance

Then `hooks/useRooms.ts` wraps those services in React Query hooks, exactly like `hooks/useTodos.ts` did.

### How It Maps to the Todo App

| Todo App | Booking App | What changed |
|----------|-------------|--------------|
| `services/api.ts` | `services/api.ts` | Same Axios instance pattern |
| `services/todoApi.ts` | `services/roomApi.ts`, `services/bookingApi.ts`, `services/authApi.ts` | One service file per domain |
| `hooks/useTodos.ts` | `hooks/useRooms.ts`, `hooks/useBookings.ts`, `hooks/useAuth.ts` | One hooks file per domain |
| `context/TodoContext.tsx` | (removed -- React Query owns server state) | Auth covered in Lesson 21 |
| Single `App.tsx` | `pages/` + `layouts/` | Multi-page app needs routing |
| `schemas/todoSchema.ts` | `schemas/authSchema.ts`, `roomSchema.ts`, `bookingSchema.ts` | One schema per form |

---

## 19.8 MongoDB Connection

### Getting a MongoDB Database

The easiest way to get a MongoDB database is **MongoDB Atlas** (free tier):

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a free cluster (shared, M0 tier)
3. Create a database user with a username and password
4. Add your IP address to the access list (or allow access from anywhere for development)
5. Click "Connect" and copy the connection string

Your connection string will look like this:
```
mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/bookmyroom?retryWrites=true&w=majority
```

### Environment Variables

Create a `.env` file in `booking-backend/`:

```env
PORT=4001
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/bookmyroom?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-change-this-in-production
CLIENT_URL=http://localhost:3001
```

> **Why these ports?**
> - **Backend on `4001`** -- one off the Todo backend's `3001` so you can run both at the same time during teaching
> - **Frontend on `3001`** -- set in `vite.config.ts` above; this is what `CLIENT_URL` points at for CORS
>
> **Important:** Add `.env` to `.gitignore` so your credentials are never committed to git.

Create a matching `.env` in `booking-frontend/`:

```env
VITE_API_URL=http://localhost:4001/api
```

### Database Connection File

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

### Entry Point with Database Connection

```ts
// src/index.ts
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database";

// Load environment variables BEFORE anything else
dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 4001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    credentials: true,
  })
);
app.use(express.json());

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "BookMyRoom API is running" });
});

// Connect to database, then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

Test it:

```bash
npm run dev
```

You should see:
```
MongoDB connected successfully
Server running on port 4001
```

---

## 19.9 The User Model

The User model represents anyone who uses the application -- both room owners and regular users.

### TypeScript Interface

```ts
// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "owner" | "user";
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be under 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Do not return password by default in queries
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["owner", "user"],
      default: "user",
    },
    avatar: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
```

### Key Points

- **`extends Document`** -- this is how Mongoose types work in TypeScript. `Document` adds Mongoose methods like `.save()` and `._id`
- **`select: false`** on password -- when you query users, the password is excluded by default. You must explicitly ask for it: `User.findOne({ email }).select("+password")`
- **`timestamps: true`** -- Mongoose automatically adds and manages `createdAt` and `updatedAt` fields
- **`unique: true`** on email -- MongoDB will not allow two users with the same email
- **Validation messages** -- `required: [true, "Message"]` provides clear error messages

---

## 19.10 The Room Model

The Room model represents a bookable room or venue.

```ts
// src/models/Room.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRoom extends Document {
  title: string;
  description: string;
  price: number;
  location: string;
  amenities: string[];
  images: string[];
  owner: Types.ObjectId;
  isAvailable: boolean;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    title: {
      type: String,
      required: [true, "Room title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title must be under 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [1000, "Description must be under 1000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0, "Price cannot be negative"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Room must have an owner"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
  },
  {
    timestamps: true,
  }
);

const Room = mongoose.model<IRoom>("Room", roomSchema);

export default Room;
```

### Understanding References

The `owner` field is a **reference** to the User collection:

```ts
owner: {
  type: Schema.Types.ObjectId,  // Stores the _id of a User document
  ref: "User",                   // Tells Mongoose which model to look up
  required: true,
}
```

This means a Room does not store the entire User object -- it stores just the User's `_id`. When you need the full owner details, you use Mongoose's `.populate()`:

```ts
// Without populate -- owner is just an ID string
const room = await Room.findById(roomId);
console.log(room.owner); // "507f1f77bcf86cd799439011"

// With populate -- owner becomes the full User object
const room = await Room.findById(roomId).populate("owner", "name email");
console.log(room.owner); // { _id: "507f...", name: "John", email: "john@example.com" }
```

### Arrays in MongoDB

Unlike SQL databases where you would need a separate table for amenities, MongoDB lets you store arrays directly:

```ts
amenities: ["WiFi", "Projector", "Air Conditioning", "Whiteboard"]
images: ["/uploads/room1-a.jpg", "/uploads/room1-b.jpg"]
```

This is one of MongoDB's strengths -- data that belongs together stays together.

---

## 19.11 The Booking Model

The Booking model connects a User to a Room for specific dates.

```ts
// src/models/Booking.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBooking extends Document {
  room: Types.ObjectId;
  user: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentMethod: "esewa" | "cod";
  paymentStatus: "pending" | "paid";
  esewaRefId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room is required"],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    checkIn: {
      type: Date,
      required: [true, "Check-in date is required"],
    },
    checkOut: {
      type: Date,
      required: [true, "Check-out date is required"],
    },
    guests: {
      type: Number,
      required: [true, "Number of guests is required"],
      min: [1, "Must have at least 1 guest"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Price cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["esewa", "cod"],
      required: [true, "Payment method is required"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    esewaRefId: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;
```

### How the Models Connect

```
User (owner)
  │
  │ owns (one-to-many)
  ▼
Room
  │
  │ booked by (one-to-many)
  ▼
Booking ──── references ──── User (customer)
```

- One **User** (with role "owner") can own many **Rooms**
- One **Room** can have many **Bookings**
- One **User** (with role "user") can make many **Bookings**
- Each **Booking** references both a **Room** and a **User**

### Payment Fields Explained

| Field | Purpose |
|-------|---------|
| `paymentMethod` | How the customer wants to pay: eSewa (digital) or COD (cash) |
| `paymentStatus` | Whether payment has been received |
| `esewaRefId` | Transaction reference from eSewa (only filled if using eSewa) |

The `?` in the TypeScript interface (`esewaRefId?: string`) and `default: undefined` in the schema mean this field is optional -- it only has a value when the payment method is eSewa.

---

## 19.12 Frontend Type Definitions

Create matching TypeScript types for the frontend:

```ts
// booking-frontend/src/types/user.ts

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "owner" | "user";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "owner" | "user";
}

export interface AuthResponse {
  token: string;
  user: User;
}
```

```ts
// booking-frontend/src/types/room.ts

export interface Room {
  _id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  amenities: string[];
  images: string[];
  owner: string | { _id: string; name: string; email: string };
  isAvailable: boolean;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomData {
  title: string;
  description: string;
  price: number;
  location: string;
  amenities: string[];
  capacity: number;
}
```

```ts
// booking-frontend/src/types/booking.ts

export interface Booking {
  _id: string;
  room: string | Room;
  user: string | User;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentMethod: "esewa" | "cod";
  paymentStatus: "pending" | "paid";
  esewaRefId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  paymentMethod: "esewa" | "cod";
}
```

**Why `string | { ... }` for references?** When the API returns data without `.populate()`, the `owner` field is just an ID string. When populated, it becomes the full object. The union type handles both cases.

---

## 19.13 The .gitignore File

Create a `.gitignore` in both projects (and a top-level one in `bookmyroom_app/` if you like):

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local
.env.production

# Uploaded files (backend only)
uploads/

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
```

---

## Practice Exercises

### Exercise 1: Create the Root Folder
1. Create `bookmyroom_app/` somewhere on disk
2. Open it in VS Code -- this is your working folder for the rest of the course
3. Confirm both projects will live as siblings: `bookmyroom_app/booking-backend/` and `bookmyroom_app/booking-frontend/`

### Exercise 2: Set Up the Backend
1. From `bookmyroom_app/`, create `booking-backend` and initialise it with `npm init -y`
2. Install all dependencies listed in section 19.4 (including `express-validator`, `nodemon`, `ts-node`)
3. Create the folder structure from section 19.5 (including the `validators/` and `uploads/` folders)
4. Set up `tsconfig.json`, `nodemon.json`, and the `package.json` scripts
5. Confirm `npm run dev` boots without errors

### Exercise 3: Connect to MongoDB
1. Create a free MongoDB Atlas account and cluster (skip if you already have one)
2. Get your connection string
3. Create the `.env` file in `booking-backend/` with `PORT=4001`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL=http://localhost:3001`
4. Write the `database.ts` connection file
5. Write the `index.ts` entry point with CORS pointing at the frontend URL
6. Run the server and verify you see "MongoDB connected successfully" and "Server running on port 4001"

### Exercise 4: Create All Three Models
1. Create `User.ts` with the complete schema and interface
2. Create `Room.ts` with the owner reference
3. Create `Booking.ts` with both room and user references
4. Import all models in `index.ts` to verify they compile:
   ```ts
   import "./models/User";
   import "./models/Room";
   import "./models/Booking";
   ```
5. Check that TypeScript reports no errors: `npx tsc --noEmit`

### Exercise 5: Set Up the Frontend
1. From `bookmyroom_app/`, run `npx shadcn@latest init --template vite --name booking-frontend` (accept the defaults when prompted)
2. Add `server.port = 3001` to `vite.config.ts`
3. Add the shadcn components and the rest of the libraries from section 19.6
4. Create the folder structure from section 19.7 (note `services/`, not `api/`)
5. Create all three type files (`user.ts`, `room.ts`, `booking.ts`)
6. Create the `.env` file with `VITE_API_URL=http://localhost:4001/api`
7. Run `npm run dev` and confirm the frontend loads on `http://localhost:3001`

### Exercise 6: Run Both Together
1. Open two terminals
2. Terminal 1: `cd bookmyroom_app/booking-backend && npm run dev` (boots on `:4001`)
3. Terminal 2: `cd bookmyroom_app/booking-frontend && npm run dev` (boots on `:3001`)
4. Visit `http://localhost:4001/api/health` -- you should see the JSON health response
5. Visit `http://localhost:3001` -- you should see the React app

---

## Key Takeaways
1. **Plan before you code** -- know your features, user roles, and data models before writing any code
2. **One root folder, two sibling projects** -- `bookmyroom_app/` contains `booking-backend/` and `booking-frontend/`
3. **Reuse Todo-app tooling** -- nodemon + ts-node for the backend, services/ + hooks/ + Vite + shadcn for the frontend
4. **Backend = express-validator** for request validation (same pattern as Lesson 16). **Frontend = Zod** for forms (same pattern as Lesson 12).
5. **Ports**: backend on `4001`, frontend on `3001`, with CORS pointing at `CLIENT_URL`
6. **Structured folders** (models, routes, controllers, validators, middleware) make large codebases manageable
7. **Mongoose models** combine schema definition, validation, and TypeScript interfaces in one file
8. **`extends Document`** is how TypeScript interfaces work with Mongoose models
9. **References** (`Schema.Types.ObjectId` with `ref`) link documents across collections without duplicating data
10. **`.populate()`** expands references into full objects when you need the related data
11. **`timestamps: true`** automatically manages `createdAt` and `updatedAt` fields
12. **`select: false`** on sensitive fields like passwords prevents accidental data leaks
13. **Environment variables** (`.env`) keep credentials out of your code and out of git
