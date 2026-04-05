# Lesson 20: Authentication Backend

## What You Will Learn
- Why authentication is essential for multi-user applications
- Hashing passwords securely with bcrypt
- Building user registration with validation
- Building user login with credential verification
- How JSON Web Tokens (JWT) work and why we use them
- Creating authentication middleware to protect routes
- Role-based access control (owner vs user)
- Building a "get current user" endpoint

---

## 20.1 Why Authentication?

In BookMyRoom, different people need different access:

| Action | Who Can Do It |
|--------|---------------|
| Browse rooms | Anyone (no login needed) |
| Book a room | Logged-in users |
| Add a room | Logged-in owners |
| Delete a room | The owner who created it |
| View my bookings | The user who made them |

Without authentication:
- Anyone could pretend to be an owner and add fake rooms
- Anyone could cancel someone else's bookings
- There would be no way to know who is making a request

Authentication answers two questions:
1. **Who are you?** (identification -- login with email and password)
2. **What are you allowed to do?** (authorisation -- check your role)

---

## 20.2 The Authentication Flow

Here is how the complete flow works:

```
REGISTRATION
────────────
1. User fills in the registration form (name, email, password, phone, role)
2. Frontend sends POST /api/auth/register
3. Backend hashes the password with bcrypt
4. Backend saves the new user to MongoDB
5. Backend creates a JWT token
6. Backend sends back { token, user }

LOGIN
─────
1. User fills in email and password
2. Frontend sends POST /api/auth/login
3. Backend finds the user by email
4. Backend compares the password with bcrypt
5. If correct, backend creates a JWT token
6. Backend sends back { token, user }

PROTECTED REQUESTS
──────────────────
1. Frontend stores the token (localStorage)
2. Every request includes: Authorization: Bearer <token>
3. Backend middleware reads the token
4. Backend verifies and decodes the token
5. Backend attaches the user to the request
6. Controller checks the user's role if needed
```

---

## 20.3 Password Hashing with bcrypt

**Never store passwords as plain text.** If your database is ever breached, every user's password would be exposed. Instead, we **hash** passwords -- converting them into an unreadable string that cannot be reversed.

### How Hashing Works

```
"mypassword123" → bcrypt → "$2b$10$K4GH8r5kF3.Wj2xN9xQZ6OeA..."

You CANNOT go backwards:
"$2b$10$K4GH8r5kF3.Wj2xN9xQZ6OeA..." → ??? → impossible to get "mypassword123"
```

### bcrypt Basics

```ts
import bcrypt from "bcrypt";

// HASHING (during registration)
const plainPassword: string = "mypassword123";
const saltRounds: number = 10; // How many times to scramble (10 is standard)
const hashedPassword: string = await bcrypt.hash(plainPassword, saltRounds);
console.log(hashedPassword);
// "$2b$10$K4GH8r5kF3.Wj2xN9xQZ6OeA..."

// COMPARING (during login)
const isMatch: boolean = await bcrypt.compare("mypassword123", hashedPassword);
console.log(isMatch); // true

const isWrong: boolean = await bcrypt.compare("wrongpassword", hashedPassword);
console.log(isWrong); // false
```

**What are salt rounds?** A "salt" is random data added to the password before hashing. This ensures that two users with the same password get different hashes. The number 10 means bcrypt runs the hashing algorithm 2^10 (1024) times, making it slow enough to prevent brute-force attacks but fast enough for normal use.

---

## 20.4 JSON Web Tokens (JWT) Explained

A JWT is a token that the server creates after successful login. The frontend stores it and sends it with every request to prove who the user is.

### JWT Structure

A JWT has three parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI2NTAiLCJyb2xlIjoib3duZXIifQ.Ks8mX5q_signature
│                      │                                                  │
└── Header             └── Payload                                        └── Signature
```

- **Header** -- says which algorithm was used (e.g. HS256)
- **Payload** -- contains the data you put in (userId, role, expiry)
- **Signature** -- proves the token was not tampered with (created using your secret key)

### Creating and Verifying JWTs

```ts
import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "fallback-secret";

// CREATING a token (after login)
interface TokenPayload {
  userId: string;
  role: "owner" | "user";
}

const payload: TokenPayload = {
  userId: "650abc123def456",
  role: "owner",
};

const token: string = jwt.sign(payload, JWT_SECRET, {
  expiresIn: "7d", // Token expires in 7 days
});

console.log(token);
// "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOi..."

// VERIFYING a token (in middleware)
try {
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
  console.log(decoded.userId); // "650abc123def456"
  console.log(decoded.role);   // "owner"
} catch (error: unknown) {
  console.log("Token is invalid or expired");
}
```

**What goes in the payload?** Only non-sensitive identification data:
- `userId` -- to look up the user in the database
- `role` -- to check permissions quickly
- Never put passwords, email addresses, or sensitive data in the payload

**Why 7 days?** The `expiresIn` value is a trade-off between security and convenience. Shorter tokens (1 hour) are more secure but require frequent re-login. Longer tokens (30 days) are more convenient but riskier if stolen. Seven days is a reasonable default.

---

## 20.5 Zod Validation Schemas

Before processing any request, validate the input data with Zod:

```ts
// src/middleware/validate.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const errors: string[] = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        res.status(400).json({
          message: "Validation failed",
          errors,
        });
        return;
      }
      next(error);
    }
  };
};

export default validate;
```

Now create the auth validation schemas:

```ts
// src/schemas/authSchemas.ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters")
    .trim(),
  email: z
    .string()
    .email("Please provide a valid email")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be under 100 characters"),
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 digits")
    .trim(),
  role: z.enum(["owner", "user"]).default("user"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

---

## 20.6 The Auth Controller

The controller handles the actual registration and login logic:

```ts
// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import type { RegisterInput, LoginInput } from "../schemas/authSchemas";

const JWT_SECRET: string = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRES_IN: string = "7d";

interface TokenPayload {
  userId: string;
  role: "owner" | "user";
}

const generateToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, role }: RegisterInput = req.body;

    // Check if user already exists
    const existingUser: IUser | null = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "A user with this email already exists" });
      return;
    }

    // Hash the password
    const saltRounds: number = 10;
    const hashedPassword: string = await bcrypt.hash(password, saltRounds);

    // Create the user
    const user: IUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
    });

    // Generate JWT
    const token: string = generateToken(user);

    // Send response (without password)
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Registration failed";
    res.status(500).json({ message });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginInput = req.body;

    // Find user and explicitly include the password field
    const user: IUser | null = await User.findOne({ email }).select("+password");
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Compare passwords
    const isPasswordValid: boolean = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Generate JWT
    const token: string = generateToken(user);

    // Send response (without password)
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    res.status(500).json({ message });
  }
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user is set by the auth middleware (see section 20.7)
    const userId: string = (req as any).user.userId;

    const user: IUser | null = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get user";
    res.status(500).json({ message });
  }
};
```

### Security Notes

**Why the same error message for wrong email and wrong password?**

```ts
// ✅ CORRECT - Same message for both cases
res.status(401).json({ message: "Invalid email or password" });

// ❌ WRONG - Tells attackers which emails exist
res.status(401).json({ message: "No user found with this email" });
res.status(401).json({ message: "Incorrect password" });
```

If you tell the user "no account with this email", an attacker can use this to discover which emails are registered. By always saying "invalid email or password", you reveal nothing.

**Why `.select("+password")` in login?**

Remember, the User model has `select: false` on the password field. This means normal queries like `User.findOne({ email })` do not return the password. During login, we specifically need the password to compare it, so we use `select("+password")` to override the default.

---

## 20.7 Authentication Middleware

The auth middleware runs before protected routes. It reads the JWT from the request header, verifies it, and attaches the user information to the request.

### Extending the Express Request Type

First, tell TypeScript that the Request object can have a `user` property:

```ts
// src/types/express.d.ts

declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      role: "owner" | "user";
    };
  }
}
```

This is a **declaration file** (`.d.ts`). It extends the existing Express types without modifying the Express library itself.

### The Auth Middleware

```ts
// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "fallback-secret";

interface TokenPayload {
  userId: string;
  role: "owner" | "user";
}

// Middleware: Require authentication
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // 1. Get the Authorization header
    const authHeader: string | undefined = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // 2. Extract the token (remove "Bearer " prefix)
    const token: string = authHeader.split(" ")[1];

    // 3. Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // 4. Attach user info to the request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    // 5. Continue to the next middleware or controller
    next();
  } catch (error: unknown) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Middleware: Require a specific role
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
};
```

### How the Middleware Works Step by Step

```
Request: GET /api/rooms/my-rooms
Headers: { Authorization: "Bearer eyJhbGciOi..." }

Step 1: Extract header → "Bearer eyJhbGciOi..."
Step 2: Split and get token → "eyJhbGciOi..."
Step 3: jwt.verify(token, secret) → { userId: "650abc", role: "owner" }
Step 4: req.user = { userId: "650abc", role: "owner" }
Step 5: next() → controller runs with req.user available
```

### Understanding 401 vs 403

| Status Code | Meaning | When to Use |
|-------------|---------|-------------|
| **401 Unauthorised** | "I do not know who you are" | No token, expired token, invalid token |
| **403 Forbidden** | "I know who you are, but you cannot do this" | User is logged in but lacks the required role |

---

## 20.8 Auth Routes

Connect the controller functions to URL endpoints:

```ts
// src/routes/authRoutes.ts
import { Router } from "express";
import { register, login, getMe } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import validate from "../middleware/validate";
import { registerSchema, loginSchema } from "../schemas/authSchemas";

const router: Router = Router();

// Public routes (no authentication needed)
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

// Protected route (must be logged in)
router.get("/me", requireAuth, getMe);

export default router;
```

### Register the Routes in the App

```ts
// src/index.ts
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database";
import authRoutes from "./routes/authRoutes";

dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Health check
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

---

## 20.9 Testing the Auth API

Use a tool like **Thunder Client** (VS Code extension), **Postman**, or **curl** to test your endpoints.

### Test 1: Register a User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@example.com",
    "password": "password123",
    "phone": "07700900001",
    "role": "user"
  }'
```

**Expected response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "650abc123def456789012345",
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "07700900001",
    "role": "user",
    "createdAt": "2026-04-05T10:00:00.000Z",
    "updatedAt": "2026-04-05T10:00:00.000Z"
  }
}
```

### Test 2: Register an Owner

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Owner",
    "email": "sarah@example.com",
    "password": "ownerpass456",
    "phone": "07700900002",
    "role": "owner"
  }'
```

### Test 3: Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Expected response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "650abc123def456789012345",
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "07700900001",
    "role": "user"
  }
}
```

### Test 4: Get Current User (Protected)

```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Replace the token with the actual token from the login response.

### Test 5: Invalid Requests

```bash
# Missing fields -- should return 400 with validation errors
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Wrong password -- should return 401
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "wrongpassword"}'

# No token -- should return 401
curl http://localhost:3001/api/auth/me
```

---

## 20.10 Using Role-Based Middleware

Here is an example of how you would protect owner-only routes (we will build these fully in later lessons):

```ts
// src/routes/roomRoutes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

const router: Router = Router();

// Public -- anyone can browse rooms
router.get("/", getAllRooms);

// Public -- anyone can view a single room
router.get("/:id", getRoomById);

// Protected + Owner only -- create a room
router.post("/", requireAuth, requireRole("owner"), createRoom);

// Protected + Owner only -- update a room
router.put("/:id", requireAuth, requireRole("owner"), updateRoom);

// Protected + Owner only -- delete a room
router.delete("/:id", requireAuth, requireRole("owner"), deleteRoom);

export default router;
```

**How the middleware chain works:**

```
POST /api/rooms
  │
  ▼
requireAuth          → Is there a valid JWT? If not → 401
  │
  ▼
requireRole("owner") → Is the user an owner? If not → 403
  │
  ▼
createRoom           → Actually create the room
```

Each middleware calls `next()` to pass control to the next function in the chain. If any middleware sends a response (like a 401 error), the chain stops.

---

## 20.11 Complete File Summary

```
booking-backend/
├── src/
│   ├── config/
│   │   └── database.ts            # MongoDB connection
│   ├── controllers/
│   │   └── authController.ts      # register, login, getMe
│   ├── middleware/
│   │   ├── auth.ts                # requireAuth, requireRole
│   │   └── validate.ts            # Zod validation middleware
│   ├── models/
│   │   ├── User.ts                # User schema + IUser interface
│   │   ├── Room.ts                # Room schema + IRoom interface
│   │   └── Booking.ts             # Booking schema + IBooking interface
│   ├── routes/
│   │   └── authRoutes.ts          # /api/auth/* endpoints
│   ├── schemas/
│   │   └── authSchemas.ts         # Zod schemas for register/login
│   ├── types/
│   │   └── express.d.ts           # Extended Request type
│   └── index.ts                   # Express app entry point
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Practice Exercises

### Exercise 1: Build the Complete Auth API
1. Create the Zod validation schemas (`registerSchema` and `loginSchema`)
2. Create the validation middleware (`validate.ts`)
3. Create the auth controller with `register`, `login`, and `getMe`
4. Create the auth middleware with `requireAuth` and `requireRole`
5. Create the auth routes and register them in `index.ts`
6. Run the server and verify it compiles without errors

### Exercise 2: Test Every Endpoint
1. Register a user with role "user" -- verify you get a token and user object
2. Register an owner with role "owner" -- verify different role in response
3. Try registering with the same email -- verify you get a 400 error
4. Login with correct credentials -- verify you get a token
5. Login with wrong password -- verify you get 401 with "Invalid email or password"
6. Call GET /api/auth/me with a valid token -- verify you get your user data
7. Call GET /api/auth/me without a token -- verify you get 401

### Exercise 3: Test Validation
1. Try registering with an empty name -- check the validation error message
2. Try registering with an invalid email format -- check the error
3. Try registering with a password shorter than 6 characters -- check the error
4. Try logging in with an empty password -- check the error
5. Verify all error messages are clear and helpful

### Exercise 4: Understand the Security
Answer these questions to check your understanding:
1. Why do we hash passwords instead of storing them directly?
2. What happens if someone steals a JWT token?
3. Why do we use the same error message for "wrong email" and "wrong password"?
4. What is the difference between a 401 and a 403 response?
5. Why does the password field have `select: false` in the User model?

---

## Key Takeaways
1. **Never store plain-text passwords** -- always hash with bcrypt before saving
2. **bcrypt.hash()** creates a one-way hash; **bcrypt.compare()** checks if a password matches a hash
3. **JWT tokens** contain a payload (userId, role) and are signed with a secret key
4. **Auth middleware** extracts the token from the `Authorization: Bearer <token>` header
5. **`select: false`** on the password field prevents it from being returned in normal queries
6. **Use the same error message** for invalid email and invalid password to prevent user enumeration
7. **401 means "who are you?"** (not authenticated); **403 means "you cannot do this"** (not authorised)
8. **Zod validation** on the server protects against malformed requests regardless of frontend validation
9. **`requireRole()`** provides role-based access control -- owners and users have different permissions
10. **Declaration files** (`.d.ts`) extend existing TypeScript types like Express's Request object
