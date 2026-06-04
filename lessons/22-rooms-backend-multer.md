# Lesson 22: Room Management Backend & File Uploads

## What You Will Learn
- Creating CRUD endpoints for room management with owner-based access control
- Setting up Multer for handling file uploads in Express
- Filtering uploaded files to accept only specific image formats
- Handling multipart form data with multiple file uploads
- Serving static files (uploaded images) from Express
- Validating multipart requests with **`express-validator`** (the same pattern used in Lessons 16 and 20)
- Wrapping controllers in **`asyncHandler`** to remove `try/catch` boilerplate
- Building paginated, filterable, and searchable GET endpoints with a `{ data, meta }` envelope
- Deleting files from disk when a room is removed

---

## 22.1 The Big Picture

Our room booking platform needs rooms. Room owners create listings with images, descriptions, pricing, and amenities. Regular users browse and search those listings. In this lesson we build the entire backend for room management, including image upload handling with Multer.

```
Owner (authenticated)                    Express API                     MongoDB + Disk
       |                                      |                              |
       |-- POST /api/rooms (multipart) -----> |-- Save room to DB ---------> |
       |   (title, price, images[])           |-- Save images to /uploads -> |
       |                                      |                              |
       |<-- { room with image paths } --------|<-----------------------------|
       |                                      |                              |
User   |-- GET /api/rooms?page=1&location=..  |-- Query with filters ------> |
       |<-- { rooms[], total, pages } --------|<-----------------------------|
```

---

## 22.2 Installing Multer

Multer is the go-to middleware for handling `multipart/form-data` in Express -- the encoding type used for file uploads.

```bash
cd backend
npm install multer
npm install -D @types/multer
```

---

## 22.3 Setting Up Multer Storage

Multer needs to know **where** to save files and **what** to name them. We configure this with `diskStorage`:

```typescript
// backend/src/middleware/upload.ts
import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";

// Configure where and how files are stored
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, "uploads/rooms");
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Create a unique filename: timestamp-originalname
    // e.g., 1700000000000-living-room.jpg
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
```

**Why `Date.now()`?** If two users upload a file called `photo.jpg`, they would overwrite each other. The timestamp makes every filename unique.

---

## 22.4 File Filter -- Accept Only Images

We do not want users uploading PDFs, executables, or other non-image files. The file filter checks the MIME type and extension:

```typescript
// backend/src/middleware/upload.ts (continued)

const allowedMimeTypes: string[] = ["image/jpeg", "image/png", "image/webp"];
const allowedExtensions: string[] = [".jpg", ".jpeg", ".png", ".webp"];

const imageOnly = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const extension: string = path.extname(file.originalname).toLowerCase();
  const isMimeValid: boolean = allowedMimeTypes.includes(file.mimetype);
  const isExtValid: boolean = allowedExtensions.includes(extension);

  if (isMimeValid && isExtValid) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only .jpg, .png, and .webp image files are allowed"));
  }
};
```

**Why check both MIME type and extension?** A malicious user could rename `virus.exe` to `virus.jpg`. Checking both provides an extra layer of safety. The MIME type is determined by the file content, not the name.

---

## 22.5 Creating the Upload Middleware

Now we combine storage, file filter, and size limits into a single Multer instance:

```typescript
// backend/src/middleware/upload.ts (continued)

const upload = multer({
  storage,
  fileFilter: imageOnly,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
});

export default upload;
```

The `limits.fileSize` is in bytes. `5 * 1024 * 1024` equals 5 megabytes. If a user tries to upload a 10 MB photo, Multer will reject it automatically.

---

## 22.6 The Room Model

Before building routes, we need a Mongoose model for rooms:

```typescript
// backend/src/models/Room.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IRoom extends Document {
  title: string;
  description: string;
  location: string;
  price: number;
  capacity: number;
  amenities: string[];
  images: string[];
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    title: {
      type: String,
      required: [true, "Room title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Room description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [1, "Price must be at least 1"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [50, "Capacity cannot exceed 50"],
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
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

const Room = mongoose.model<IRoom>("Room", roomSchema);
export default Room;
```

**Key points:**
- `images` stores an array of filenames (not full URLs) -- we construct URLs when serving
- `owner` references the User model -- only this user can edit or delete the room
- `timestamps: true` gives us `createdAt` and `updatedAt` for free

---

## 22.7 Creating the Uploads Directory

Express will not create directories for us. We need the `uploads/rooms` folder to exist before Multer tries to write to it:

```typescript
// backend/src/index.ts (add near the top, after imports)
import fs from "fs";
import path from "path";

const uploadsDir: string = path.join(__dirname, "..", "uploads", "rooms");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
```

The `{ recursive: true }` option creates parent directories too, so if `uploads/` does not exist, it will be created along with `uploads/rooms/`.

---

## 22.8 Serving Static Files

When the frontend needs to display a room image, it requests the file from the backend. Express can serve files from a directory using `express.static`:

```typescript
// backend/src/index.ts
import express from "express";

const app = express();

// Serve uploaded files as static assets
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
```

Now a file saved as `uploads/rooms/1700000000000-kitchen.jpg` is accessible at:
```
http://localhost:3001/uploads/rooms/1700000000000-kitchen.jpg
```

---

## 22.9 Request Validation with express-validator

Just like the Todo API (Lesson 16) and the auth endpoints (Lesson 20), we validate room requests with **`express-validator`** chains and the shared `validateResult` middleware. This gives every endpoint in the project the same validation pattern and the same 400 response shape.

> The `validateResult` middleware was created in Lesson 20 (`src/middleware/validate.ts`). We re-use it here -- no duplicate code.

### Room Validators

Numeric fields in multipart requests arrive as strings, so we sanitise them with `.toInt()` / `.toFloat()` so `req.body.price` is a real number by the time the controller runs.

```typescript
// backend/src/validators/room.validator.ts
import { body, param, query } from "express-validator";

// Reusable: validates the :id route parameter
const roomIdParam = param("id")
  .isMongoId()
  .withMessage("Invalid room ID format");

// POST /api/rooms -- create a new room
export const createRoomValidator = [
  body("title")
    .exists({ checkFalsy: true })
    .withMessage("Title is required")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .exists({ checkFalsy: true })
    .withMessage("Description is required")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("location")
    .exists({ checkFalsy: true })
    .withMessage("Location is required")
    .bail()
    .isString()
    .trim(),

  body("price")
    .exists({ checkFalsy: true })
    .withMessage("Price is required")
    .bail()
    .isFloat({ min: 1 })
    .withMessage("Price must be at least 1")
    .toFloat(),

  body("capacity")
    .exists({ checkFalsy: true })
    .withMessage("Capacity is required")
    .bail()
    .isInt({ min: 1, max: 50 })
    .withMessage("Capacity must be between 1 and 50")
    .toInt(),

  body("amenities")
    .optional()
    .isString()
    .withMessage("Amenities must be a JSON string or comma-separated list"),
];

// PUT /api/rooms/:id -- update an existing room (all fields optional)
export const updateRoomValidator = [
  roomIdParam,

  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("location")
    .optional()
    .isString()
    .trim(),

  body("price")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Price must be at least 1")
    .toFloat(),

  body("capacity")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Capacity must be between 1 and 50")
    .toInt(),

  body("amenities")
    .optional()
    .isString()
    .withMessage("Amenities must be a JSON string or comma-separated list"),
];

// GET /api/rooms/:id and DELETE /api/rooms/:id -- just validate the ID
export const roomIdValidator = [roomIdParam];

// GET /api/rooms -- validate optional query parameters (filters + pagination)
export const listRoomsValidator = [
  query("location")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("location must be a string under 100 characters"),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minPrice must be a non-negative number")
    .toFloat(),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxPrice must be a non-negative number")
    .toFloat(),

  query("capacity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("capacity must be a positive integer")
    .toInt(),

  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("search must be a string under 100 characters"),

  query("sort")
    .optional()
    .isIn(["price_asc", "price_desc", "newest", "oldest"])
    .withMessage("sort must be price_asc, price_desc, newest, or oldest"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100")
    .toInt(),
];
```

> **Note on file validation:** `express-validator` only checks `req.body`, `req.params`, and `req.query`. File checking (size, MIME type, count) is already handled by Multer's `fileFilter` and `limits` (sections 22.4-22.5).

---

## 22.10 POST /api/rooms -- Create a Room with Images

This is the most complex endpoint -- it handles both text fields and file uploads in a single request. We wrap it in `asyncHandler` (created in Lesson 20) so any thrown error is forwarded to the global error handler.

The response follows the project-wide envelope: **`{ data: room }`**.

```typescript
// backend/src/controllers/roomController.ts
import { Request, Response } from "express";
import Room, { IRoom } from "../models/Room";
import { asyncHandler } from "../middleware/asyncHandler";

// Helper -- amenities arrive as a JSON string or comma-separated list (multipart is strings only)
const parseAmenities = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(",").map((a) => a.trim()).filter(Boolean);
    }
  }
  return [];
};

export const createRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { title, description, location, price, capacity, amenities } = req.body;

  // Get uploaded file names from Multer
  const files = (req.files as Express.Multer.File[]) || [];
  const imageFilenames: string[] = files.map((file) => file.filename);

  const room: IRoom = await Room.create({
    title,
    description,
    location,
    price, // already converted to a number by the validator's .toFloat()
    capacity, // already converted by .toInt()
    amenities: parseAmenities(amenities),
    images: imageFilenames,
    owner: req.user!.userId,
  });

  res.status(201).json({ data: room });
});
```

**Why no manual `Number(price)`?** The `createRoomValidator` runs `.toFloat()` on `price` and `.toInt()` on `capacity`, so the values are already real numbers by the time the controller receives them.

**Why `req.user!.userId`?** The auth middleware (Lesson 20) attaches `{ userId, role }` to `req.user`. The `!` is TypeScript's non-null assertion -- it is safe here because the route is protected by `requireAuth`, so `req.user` is guaranteed to be set.

---

## 22.11 The Room Routes

Each request flows through **upload → validator → validateResult → controller**. Multer parses the multipart form first (so `req.body` is populated), then `express-validator` checks the values, then `validateResult` either responds with 400 or passes the request to the controller. The exact same `validator → validateResult → controller` shape used in Lesson 16, just with Multer added in front for the upload routes.

```typescript
// backend/src/routes/roomRoutes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateResult } from "../middleware/validate";
import upload from "../middleware/upload";
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} from "../controllers/roomController";
import {
  createRoomValidator,
  updateRoomValidator,
  roomIdValidator,
  listRoomsValidator,
} from "../validators/room.validator";

const router: Router = Router();

// Public routes -- anyone can browse rooms
router.get("/", listRoomsValidator, validateResult, getRooms);
router.get("/:id", roomIdValidator, validateResult, getRoomById);

// Protected routes -- only authenticated owners
router.post(
  "/",
  requireAuth,
  requireRole("owner"),
  upload.array("images", 5),
  createRoomValidator,
  validateResult,
  createRoom
);
router.put(
  "/:id",
  requireAuth,
  requireRole("owner"),
  upload.array("images", 5),
  updateRoomValidator,
  validateResult,
  updateRoom
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("owner"),
  roomIdValidator,
  validateResult,
  deleteRoom
);

export default router;
```

**`upload.array("images", 5)`** tells Multer to expect up to 5 files in a field called `images`. Multer must run **before** the validators -- otherwise `req.body` would be empty when the validators check it.

---

## 22.12 GET /api/rooms -- Pagination, Filtering, and Search

A real application does not return every room at once. We need pagination (pages of results), filtering (by location, price, capacity), and search (by title or description).

The response follows the same `{ data, meta }` envelope used in the Todo API (Lesson 16) -- the frontend can rely on one consistent shape across the whole project.

```typescript
// backend/src/controllers/roomController.ts (continued)

interface RoomQuery {
  location?: { $regex: string; $options: string };
  price?: { $gte?: number; $lte?: number };
  capacity?: { $gte: number };
  $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
}

export const getRooms = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Query params have been validated AND coerced to numbers by listRoomsValidator
  const { location, minPrice, maxPrice, capacity, search, sort, page, limit } = req.query as {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    capacity?: number;
    search?: string;
    sort?: "price_asc" | "price_desc" | "newest" | "oldest";
    page?: number;
    limit?: number;
  };

  // Build filter object
  const filter: RoomQuery = {};

  // Filter by location (case-insensitive partial match)
  if (location) {
    filter.location = { $regex: location, $options: "i" };
  }

  // Filter by price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  // Filter by minimum capacity
  if (capacity !== undefined) {
    filter.capacity = { $gte: capacity };
  }

  // Search by title or description
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Sort options
  let sortOption: Record<string, 1 | -1> = { createdAt: -1 }; // default: newest first
  if (sort === "price_asc") sortOption = { price: 1 };
  if (sort === "price_desc") sortOption = { price: -1 };
  if (sort === "oldest") sortOption = { createdAt: 1 };

  // Pagination -- defaults: page 1, 10 items per page
  const pageNum: number = page ? Number(page) : 1;
  const limitNum: number = limit ? Number(limit) : 10;
  const skip: number = (pageNum - 1) * limitNum;

  // Run the query and a count in parallel for performance
  const [rooms, total]: [IRoom[], number] = await Promise.all([
    Room.find(filter)
      .populate("owner", "name email")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Room.countDocuments(filter),
  ]);

  const totalPages: number = Math.ceil(total / limitNum);

  res.json({
    data: rooms,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  });
});
```

### How Pagination Works

Imagine 25 rooms with `limit=10`:

| Page | Skip | Returns      |
|------|------|-------------|
| 1    | 0    | Rooms 1-10  |
| 2    | 10   | Rooms 11-20 |
| 3    | 20   | Rooms 21-25 |

The formula is simple: `skip = (page - 1) * limit`.

> **Always combine `.skip()` with `.sort()`** -- without an explicit sort order, MongoDB does not guarantee consistent results across pages.

### Example Response

```json
{
  "data": [
    { "_id": "65abc...", "title": "Spacious Meeting Room", "price": 75, "capacity": 10, "...": "..." }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### How Filtering Works

Each query parameter adds a condition to the MongoDB filter. If a user requests:
```
GET /api/rooms?location=London&minPrice=50&maxPrice=200&capacity=4
```

The filter object becomes:
```typescript
{
  location: { $regex: "London", $options: "i" },
  price: { $gte: 50, $lte: 200 },
  capacity: { $gte: 4 }
}
```

MongoDB only returns rooms matching **all** conditions.

> **Why no manual `Number()` for query params?** The `listRoomsValidator` runs `.toInt()` / `.toFloat()` on `page`, `limit`, `capacity`, `minPrice`, and `maxPrice`, so they arrive at the controller already typed as numbers.

---

## 22.13 GET /api/rooms/:id -- Room Details

A simple endpoint that returns a single room with full owner details:

```typescript
// backend/src/controllers/roomController.ts (continued)

export const getRoomById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const room: IRoom | null = await Room.findById(req.params.id)
    .populate("owner", "name email");

  if (!room) {
    res.status(404).json({ message: "Room not found" });
    return;
  }

  res.json({ data: room });
});
```

---

## 22.14 PUT /api/rooms/:id -- Update Room (Owner Only)

Only the room owner should be able to edit their listing. We also handle optional new image uploads:

```typescript
// backend/src/controllers/roomController.ts (continued)
import fs from "fs";
import path from "path";

export const updateRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const room: IRoom | null = await Room.findById(req.params.id);

  if (!room) {
    res.status(404).json({ message: "Room not found" });
    return;
  }

  // Check ownership
  if (room.owner.toString() !== req.user!.userId) {
    res.status(403).json({ message: "You can only edit your own rooms" });
    return;
  }

  // Update text fields (values are already typed by the validator)
  const { title, description, location, price, capacity, amenities } = req.body;

  if (title !== undefined) room.title = title;
  if (description !== undefined) room.description = description;
  if (location !== undefined) room.location = location;
  if (price !== undefined) room.price = price; // already a number via .toFloat()
  if (capacity !== undefined) room.capacity = capacity; // already a number via .toInt()
  if (amenities !== undefined) room.amenities = parseAmenities(amenities);

  // Handle new images (if uploaded)
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length > 0) {
    // Delete old images from disk
    for (const oldImage of room.images) {
      const oldPath: string = path.join(__dirname, "..", "..", "uploads", "rooms", oldImage);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Replace with new image filenames
    room.images = files.map((file) => file.filename);
  }

  const updatedRoom: IRoom = await room.save();

  res.json({ data: updatedRoom });
});
```

**Key detail:** When new images are uploaded, we delete the old files from disk first. Otherwise, orphaned files would pile up in the `uploads/rooms` directory forever.

---

## 22.15 DELETE /api/rooms/:id -- Delete Room (Owner Only)

When a room is deleted, we must also delete its image files from disk. The response uses status `204 No Content` -- there is nothing meaningful to return for a successful delete (matching the Todo API in Lesson 16).

```typescript
// backend/src/controllers/roomController.ts (continued)

export const deleteRoom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const room: IRoom | null = await Room.findById(req.params.id);

  if (!room) {
    res.status(404).json({ message: "Room not found" });
    return;
  }

  // Check ownership
  if (room.owner.toString() !== req.user!.userId) {
    res.status(403).json({ message: "You can only delete your own rooms" });
    return;
  }

  // Delete image files from disk
  for (const image of room.images) {
    const imagePath: string = path.join(__dirname, "..", "..", "uploads", "rooms", image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  // Delete room from database
  await Room.findByIdAndDelete(req.params.id);

  res.status(204).send();
});
```

---

## 22.16 Registering the Routes

Add the room routes to your main Express app:

```typescript
// backend/src/index.ts
import roomRoutes from "./routes/roomRoutes";

// ... after other middleware (and before the global error handler)
app.use("/api/rooms", roomRoutes);
```

---

## 22.17 Extending the Global Error Handler for Multer

In Lesson 20 we added a global error handler at the bottom of `index.ts`. Multer-specific errors (file too large, unexpected field, wrong file type) need their own branches so we can return clear 400 responses. We extend the existing handler -- no separate `errorHandler.ts` file needed.

```typescript
// backend/src/index.ts (replace the existing global error handler)
import multer from "multer";
import { Request, Response, NextFunction } from "express";

app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err);

  // Multer-specific errors (file uploads)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "File too large. Maximum size is 5 MB." });
      return;
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      res.status(400).json({ message: "Too many files. Maximum is 5 images." });
      return;
    }
    res.status(400).json({ message: err.message });
    return;
  }

  // File-filter rejection from upload.ts
  if (err.message === "Only .jpg, .png, and .webp image files are allowed") {
    res.status(400).json({ message: err.message });
    return;
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    res.status(400).json({ message: err.message });
    return;
  }

  // Invalid MongoDB ObjectId
  if (err.name === "CastError") {
    res.status(400).json({ message: "Invalid ID format" });
    return;
  }

  res.status(500).json({ message: err.message || "Server error" });
});
```

**The full error-handling pattern in this project:**
- **`express-validator`** catches bad input (400) before the controller runs
- **Multer** rejects oversized files and disallowed types
- **`asyncHandler`** forwards any controller error to this global handler
- **Global error handler** decides the response based on the error type

---

## 22.18 Testing with Postman or Thunder Client

### Creating a Room (POST)

1. Set method to **POST** and URL to `http://localhost:3001/api/rooms`
2. Add header: `Authorization: Bearer <your-jwt-token>`
3. Switch body to **form-data** (not JSON!)
4. Add text fields:
   - `title`: "Spacious Meeting Room"
   - `description`: "A bright room with city views and full conference facilities"
   - `location`: "London"
   - `price`: "75"
   - `capacity`: "10"
   - `amenities`: '["WiFi","Projector","Whiteboard"]'
5. Add file fields:
   - `images`: select a .jpg file
   - `images`: select another .jpg file
6. Send the request

**Expected response (201):**
```json
{
  "data": {
    "_id": "65abc123...",
    "title": "Spacious Meeting Room",
    "description": "A bright room with city views and full conference facilities",
    "location": "London",
    "price": 75,
    "capacity": 10,
    "amenities": ["WiFi", "Projector", "Whiteboard"],
    "images": ["1700000000000-room1.jpg", "1700000000001-room2.jpg"],
    "owner": "65def456...",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

### Browsing Rooms (GET with Filters and Pagination)

```
GET http://localhost:3001/api/rooms?page=1&limit=5&location=London&minPrice=50&maxPrice=200
```

No authentication needed -- browsing is public.

**Expected response (200):**
```json
{
  "data": [
    { "_id": "65abc...", "title": "Spacious Meeting Room", "price": 75, "...": "..." }
  ],
  "meta": {
    "page": 1,
    "limit": 5,
    "total": 12,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Example Validation Error (400)

```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "title", "message": "Title must be between 3 and 100 characters" },
    { "field": "price", "message": "Price must be at least 1" }
  ]
}
```

### Viewing an Image

Open in your browser:
```
http://localhost:3001/uploads/rooms/1700000000000-room1.jpg
```

You should see the uploaded image displayed directly.

---

## 22.19 Complete File Summary

```
backend/
├── src/
│   ├── controllers/
│   │   └── roomController.ts      # CRUD logic wrapped in asyncHandler
│   ├── middleware/
│   │   ├── asyncHandler.ts        # (from Lesson 20) forwards errors
│   │   ├── auth.ts                # (from Lesson 20) requireAuth, requireRole
│   │   ├── validate.ts            # (from Lesson 20) validateResult
│   │   └── upload.ts              # Multer storage, filter, limits
│   ├── models/
│   │   └── Room.ts                # Mongoose schema with typed interface
│   ├── routes/
│   │   └── roomRoutes.ts          # Public + protected route definitions
│   ├── validators/
│   │   └── room.validator.ts      # createRoomValidator, updateRoomValidator, listRoomsValidator, roomIdValidator
│   └── index.ts                   # Static files + route registration + global error handler
├── uploads/
│   └── rooms/                     # Uploaded images stored here
└── package.json
```

---

## Practice Exercises

### Exercise 1: Complete Room API
1. Create the `upload.ts` middleware with storage, filter, and size limit
2. Create the `Room` model with all fields and validation
3. Create `validators/room.validator.ts` with all four validator arrays
4. Implement all five endpoints (each wrapped in `asyncHandler`): POST, GET (list), GET (single), PUT, DELETE
5. Wire each route as `[upload?] → [validator] → validateResult → controller`
6. Ensure the `uploads/rooms` directory is created on server start
7. Test creating a room with images using Postman or Thunder Client

### Exercise 2: Add Amenity Filtering
Extend the GET `/api/rooms` endpoint to filter by amenities:
```
GET /api/rooms?amenities=WiFi,Projector
```
Steps:
1. Add an `amenities` rule to `listRoomsValidator` (`.optional().isString()`)
2. In the controller, split the comma list and apply `$all`:
```typescript
if (req.query.amenities) {
  const amenityList: string[] = (req.query.amenities as string).split(",");
  filter.amenities = { $all: amenityList };
}
```

### Exercise 3: Image Count Validation
Modify the POST endpoint to require at least one image when creating a room. Hint: check `req.files` length inside the controller (`express-validator` does not see files):
```typescript
const files = (req.files as Express.Multer.File[]) || [];
if (files.length === 0) {
  res.status(400).json({ message: "At least one image is required" });
  return;
}
```

### Exercise 4: Test Every Validation Branch
1. POST a room with `title: "Hi"` -- verify the 400 lists `title` in `errors`
2. POST a room with `price: "free"` -- verify the 400 lists `price`
3. GET `/api/rooms?page=0` -- verify the validator rejects it
4. GET `/api/rooms?sort=random` -- verify the validator rejects it
5. Confirm every 400 response follows the shape `{ message, errors: [{ field, message }] }`

---

## Key Takeaways
1. **Multer** handles `multipart/form-data` -- the encoding used for file uploads in HTTP
2. **`diskStorage`** gives you control over the destination folder and filename for each upload
3. **File filters** should check both MIME type and file extension for security
4. **`upload.array("images", 5)`** accepts up to 5 files in the `images` field of the form
5. **Middleware order matters** -- run Multer **before** the validators so `req.body` is populated when the validators check it
6. **`express-validator`** is used for every endpoint in the project -- same pattern as Lessons 16 and 20
7. **`.toFloat()` / `.toInt()`** sanitisers convert multipart strings into real numbers, so the controller skips manual `Number()` conversions
8. **`asyncHandler`** wraps each controller so any thrown error flows to the global handler -- no `try/catch` noise
9. **Response envelope** -- `{ data: room }` for single items and `{ data: [...], meta: {...} }` for paginated lists, identical to the Todo API
10. **`express.static`** serves files from a directory, making uploads accessible via URL
11. **Ownership checks** (`room.owner.toString() === req.user!.userId`) ensure only the creator can edit or delete
12. **Pagination** uses `skip` and `limit` to return results in pages: `skip = (page - 1) * limit` -- always combined with `.sort()`
13. **`Promise.all`** runs `find()` and `countDocuments()` in parallel for fewer round trips
14. **MongoDB `$regex`** enables case-insensitive search across text fields
15. **Always delete files from disk** when deleting or replacing room images -- otherwise orphaned files accumulate
16. **Global error handler** branches on Multer errors, Mongoose validation, and CastError to keep responses structured
