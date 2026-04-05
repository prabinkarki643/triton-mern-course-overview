# Lesson 19: Booking App -- Project Setup & Data Models

## What You Will Learn
- Planning a real-world application with multiple user roles
- Setting up separate frontend and backend projects
- Structuring a professional backend with controllers, routes, and services
- Structuring a scalable React frontend
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
Zod                         Zod (server validation)
React Router v6             RESTful API
Axios                       CORS
```

---

## 19.3 Setting Up the Backend Project

Create the backend project from scratch:

```bash
mkdir booking-backend
cd booking-backend
npm init -y
```

### Install Dependencies

```bash
# Core dependencies
npm install express mongoose cors dotenv zod

# TypeScript and types
npm install -D typescript ts-node-dev @types/express @types/cors @types/node

# Auth dependencies (we will use these in Lesson 20)
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken
```

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

### Package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- `dev` -- runs the server with hot-reload (restarts when you save a file)
- `build` -- compiles TypeScript to JavaScript
- `start` -- runs the compiled JavaScript in production

---

## 19.4 Backend Project Structure

Create this folder structure:

```bash
mkdir -p src/{models,routes,controllers,middleware,services,config,types}
touch src/index.ts src/config/database.ts
```

```
booking-backend/
├── src/
│   ├── config/
│   │   └── database.ts        # MongoDB connection
│   ├── controllers/
│   │   ├── authController.ts  # Auth logic (Lesson 20)
│   │   ├── roomController.ts  # Room CRUD
│   │   └── bookingController.ts
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification (Lesson 20)
│   │   └── validate.ts        # Zod validation middleware
│   ├── models/
│   │   ├── User.ts            # User Mongoose model
│   │   ├── Room.ts            # Room Mongoose model
│   │   └── Booking.ts         # Booking Mongoose model
│   ├── routes/
│   │   ├── authRoutes.ts      # /api/auth/*
│   │   ├── roomRoutes.ts      # /api/rooms/*
│   │   └── bookingRoutes.ts   # /api/bookings/*
│   ├── services/              # Business logic (optional layer)
│   ├── types/
│   │   └── express.d.ts       # Extended Request type
│   └── index.ts               # Express app entry point
├── .env                       # Environment variables
├── .gitignore
├── package.json
└── tsconfig.json
```

### Why This Structure?

| Folder | Purpose | Example |
|--------|---------|---------|
| `models/` | Database schema definitions | "A Room has a title, price, and owner" |
| `routes/` | URL endpoint definitions | "POST /api/rooms goes to createRoom" |
| `controllers/` | Request handling logic | "Read the body, create a room, send response" |
| `middleware/` | Functions that run before controllers | "Check if the user is logged in" |
| `services/` | Reusable business logic | "Calculate total price for a booking" |
| `config/` | Configuration and connections | "Connect to MongoDB" |
| `types/` | TypeScript type definitions | "Add `user` property to Express Request" |

Think of it like a restaurant:
- **Routes** are the menu (what the customer can order)
- **Controllers** are the waiters (take the order and deliver the food)
- **Services** are the chefs (do the actual cooking)
- **Middleware** is the host at the door (checks your reservation before letting you in)
- **Models** are the recipes (define what each dish looks like)

---

## 19.5 Setting Up the Frontend Project

Create the frontend using the shadcn preset:

```bash
npx shadcn@latest init --preset new-york --template vite
```

When prompted, name it `booking-frontend`. Then install the dependencies:

```bash
cd booking-frontend
npm install react-router-dom axios react-hook-form zod @hookform/resolvers
npx shadcn@latest add button input card label badge dialog select tabs avatar
```

---

## 19.6 Frontend Project Structure

Organise the frontend for a larger application:

```
booking-frontend/
├── src/
│   ├── api/
│   │   └── axios.ts             # Axios instance with interceptors
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (auto-generated)
│   │   ├── Navbar.tsx
│   │   ├── RoomCard.tsx
│   │   ├── BookingForm.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/
│   │   └── AuthContext.tsx      # Authentication state
│   ├── hooks/
│   │   ├── useAuth.ts           # Auth convenience hook
│   │   └── useRooms.ts          # Room data hook
│   ├── layouts/
│   │   ├── MainLayout.tsx       # Public layout (Navbar + Outlet + Footer)
│   │   └── AuthLayout.tsx       # Auth layout (centred card)
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── RoomListPage.tsx
│   │   ├── RoomDetailPage.tsx
│   │   ├── BookingPage.tsx
│   │   ├── DashboardPage.tsx    # Owner dashboard
│   │   ├── MyBookingsPage.tsx   # User's bookings
│   │   └── NotFoundPage.tsx
│   ├── schemas/
│   │   ├── authSchemas.ts       # Login/register Zod schemas
│   │   ├── roomSchemas.ts       # Room form schemas
│   │   └── bookingSchemas.ts    # Booking form schemas
│   ├── types/
│   │   ├── user.ts
│   │   ├── room.ts
│   │   └── booking.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env
├── package.json
└── tsconfig.json
```

### Why More Folders Than the Todo App?

| Folder | Todo App | Booking App |
|--------|----------|-------------|
| `api/` | Used fetch directly | Axios instance with auth headers |
| `hooks/` | Not needed | Custom hooks for data fetching |
| `layouts/` | Not needed | Multiple layouts (public vs auth) |
| `pages/` | Single page | Multiple pages with routing |
| `schemas/` | One schema | Multiple form schemas |
| `types/` | One type file | Types per domain (user, room, booking) |

---

## 19.7 MongoDB Connection

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

Create a `.env` file in the backend root:

```env
PORT=3001
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/bookmyroom?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key-change-this-in-production
```

**Important:** Add `.env` to `.gitignore` so your credentials are never committed to git.

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
const PORT: number = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
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
Server running on port 3001
```

---

## 19.8 The User Model

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

## 19.9 The Room Model

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

## 19.10 The Booking Model

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

## 19.11 Frontend Type Definitions

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

## 19.12 The .gitignore File

Create a `.gitignore` in both projects:

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
```

---

## Practice Exercises

### Exercise 1: Set Up the Backend
1. Create the `booking-backend` folder and initialise it with `npm init -y`
2. Install all dependencies listed in section 19.3
3. Create the folder structure from section 19.4
4. Set up `tsconfig.json` and `package.json` scripts
5. Run `npm run dev` and verify it compiles without errors

### Exercise 2: Connect to MongoDB
1. Create a free MongoDB Atlas account and cluster
2. Get your connection string
3. Create the `.env` file with your `MONGODB_URI`
4. Write the `database.ts` connection file
5. Write the `index.ts` entry point
6. Run the server and verify you see "MongoDB connected successfully"

### Exercise 3: Create All Three Models
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

### Exercise 4: Set Up the Frontend
1. Create the `booking-frontend` project using the shadcn preset
2. Install React Router, Axios, and form libraries
3. Create the folder structure from section 19.6
4. Create all three type files (`user.ts`, `room.ts`, `booking.ts`)
5. Set up basic routing with Home, About, Login, and Register pages (from Lesson 18)
6. Run the frontend and verify it loads with navigation

---

## Key Takeaways
1. **Plan before you code** -- know your features, user roles, and data models before writing any code
2. **Separate projects** for frontend and backend keep concerns isolated and deployable independently
3. **Structured folders** (models, routes, controllers, middleware) make large codebases manageable
4. **Mongoose models** combine schema definition, validation, and TypeScript interfaces in one file
5. **`extends Document`** is how TypeScript interfaces work with Mongoose models
6. **References** (`Schema.Types.ObjectId` with `ref`) link documents across collections without duplicating data
7. **`.populate()`** expands references into full objects when you need the related data
8. **`timestamps: true`** automatically manages `createdAt` and `updatedAt` fields
9. **`select: false`** on sensitive fields like passwords prevents accidental data leaks
10. **Environment variables** (`.env`) keep credentials out of your code and out of git
