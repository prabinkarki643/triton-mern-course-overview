# Lesson 22: Room Management Backend & File Uploads

## What You Will Learn
- Creating CRUD endpoints for room management with owner-based access control
- Setting up Multer for handling file uploads in Express
- Filtering uploaded files to accept only specific image formats
- Handling multipart form data with multiple file uploads
- Serving static files (uploaded images) from Express
- Validating multipart requests with **`express-validator`** (the same pattern used in Lessons 16 and 20)
- Handling errors in controllers with **explicit `try/catch`** blocks (matching Lessons 16 and 20)
- Building paginated, filterable, and searchable GET endpoints with a `{ data, meta }` envelope
- **Splitting image management into its own endpoints** -- `POST /:id/images` to add and `DELETE /:id/images/:imageName` to remove individual images
- Deleting files from disk when a room or single image is removed

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

Multer needs to know **where** to save files and **what** to name them. We configure this with `diskStorage`. We put everything Multer-related -- the upload directory, the storage config, the file filter, and the multer instance itself -- in a single `middleware/upload.ts` file. That way any route that wants to accept uploads just imports it.

Start the file with the imports and compute the absolute upload path from `__dirname`:

```typescript
// backend/src/middleware/upload.ts
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// Where uploaded room images live on disk. __dirname is src/middleware,
// so we go up twice to reach the backend project root, then into uploads/rooms.
const uploadDir: string = path.join(__dirname, "..", "..", "uploads", "rooms");
```

> Why an **absolute path** built from `__dirname` and not a relative one like `"uploads/rooms"`? Relative paths are resolved against the process's *current working directory* (`process.cwd()`), which depends on **where** the developer ran `npm run dev` from. Building the path off `__dirname` is deterministic -- the code always writes to the same folder regardless of where the process was launched.

Now the storage config -- destination points at our absolute path, filename is a unique slug so two uploads never collide:

```typescript
// backend/src/middleware/upload.ts (continued)

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Prefix with a timestamp + random number so two uploads with the same
    // name never collide, and slug the original name for safety.
    const uniqueSuffix: string = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;
    const ext: string = path.extname(file.originalname).toLowerCase();
    const base: string = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    cb(null, `${uniqueSuffix}-${base}${ext}`);
  },
});
```

**Why the extra work on the filename?** A bare `${Date.now()}-${file.originalname}` has two problems:
1. If two users upload `photo.jpg` in the same millisecond, they collide.
2. Original filenames can contain spaces, unicode, or slashes -- anything that ends up in a URL should be slugged.

The final filename looks something like `1782958518067-56314975-cosy-apartment.jpg`.

---

## 22.4 File Filter -- Accept Only Images

We do not want users uploading PDFs, executables, or other non-image files. The file filter checks the MIME type and extension:

```typescript
// backend/src/middleware/upload.ts (continued)

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedMimeTypes: string[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  const allowedExtensions: string[] = [".jpg", ".jpeg", ".png", ".webp"];

  const mimeOk: boolean = allowedMimeTypes.includes(file.mimetype);
  const extOk: boolean = allowedExtensions.includes(
    path.extname(file.originalname).toLowerCase()
  );

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .png, and .webp image files are allowed"));
  }
};
```

**Why check both MIME type and extension?** A malicious user could rename `virus.exe` to `virus.jpg`. The MIME type is derived from the actual file bytes, so checking both gives you an extra layer of defence.

---

## 22.5 Creating the Upload Middleware

Now we combine storage, file filter, and size limits into a single Multer instance:

```typescript
// backend/src/middleware/upload.ts (continued)

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5, // up to 5 files per request
  },
});

export default upload;
```

Two limits, two different Multer errors:

| Limit | If exceeded | Error code Multer throws |
|---|---|---|
| `fileSize` | A single file is over 5 MB | `LIMIT_FILE_SIZE` |
| `files` | The user sends more than 5 files | `LIMIT_FILE_COUNT` |

We will branch on both of these in the global error handler (section 22.19) so the user gets a helpful message instead of the raw Multer text.

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
  isAvailable: boolean;
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
    isAvailable: {
      type: Boolean,
      default: true,
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
- `isAvailable` defaults to `true` so newly created rooms are bookable; the owner can toggle it later, and Lesson 25 will use it when checking whether a booking can be made
- `timestamps: true` gives us `createdAt` and `updatedAt` for free

---

## 22.7 Creating the Uploads Directory

Multer will not create the destination directory for us -- if `uploads/rooms/` does not exist when a request arrives, the upload fails. We already computed the absolute path at the top of `upload.ts` (section 22.3). Right below that variable, add three lines that create the directory on boot if it is missing:

```typescript
// backend/src/middleware/upload.ts (the fs check under the uploadDir variable)
const uploadDir: string = path.join(__dirname, "..", "..", "uploads", "rooms");

// Make sure the directory exists on boot (Multer will not create it)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
```

**Why put this in `upload.ts` and not `index.ts`?** The directory only exists because Multer needs it. Keeping the "make sure this folder exists" line next to the "here is where Multer writes files" line means anyone reading `upload.ts` sees the full lifecycle in one place. There is nothing for `index.ts` to know about it.

The `{ recursive: true }` option creates parent directories too, so if neither `uploads/` nor `uploads/rooms/` exists, both are created in one call.

> **Add `uploads/` to your `.gitignore`.** These are user-generated files -- they should never end up in the repo.

---

## 22.8 Serving Static Files

When the frontend needs to display a room image, it requests the file from the backend. Express can serve files from a directory using `express.static`. Add these lines to `index.ts` -- alongside the other middleware, before the route mounts:

```typescript
// backend/src/index.ts
import path from "path";
import express from "express";

// ... other setup ...

// Serve uploaded room images at /uploads/rooms/<filename>
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);
```

Now a file saved as `uploads/rooms/1782958518067-cosy-apartment.jpg` is accessible at:

```
http://localhost:4001/uploads/rooms/1782958518067-cosy-apartment.jpg
```

> Notice we point `express.static` at the parent `uploads/` folder (not `uploads/rooms/`). This lets us add more upload folders later (e.g. `uploads/avatars/`) without changing this line.

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

// DELETE /api/rooms/:id/images/:imageName -- validate ID + safe filename
export const roomImageDeleteValidator = [
  roomIdParam,
  param("imageName")
    .isString()
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage("Invalid image name format"),
];

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

This is the most complex endpoint -- it handles both text fields and file uploads in a single request. We use an explicit `try/catch` block (matching Lessons 16 and 20) so any database error returns a clean 500 response with a descriptive message.

The response follows the project-wide envelope: **`{ data: room }`**.

```typescript
// backend/src/controllers/roomController.ts
import { Request, Response } from "express";
import Room, { IRoom } from "../models/Room";

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

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error: unknown) {
    console.error("createRoom error:", error);
    res.status(500).json({ message: "Failed to create room" });
  }
};
```

**Why no manual `Number(price)`?** The `createRoomValidator` runs `.toFloat()` on `price` and `.toInt()` on `capacity`, so the values are already real numbers by the time the controller receives them.

**Why `req.user!.userId`?** The auth middleware (Lesson 20) attaches `{ userId, role }` to `req.user`. The `!` is TypeScript's non-null assertion -- it is safe here because the route is protected by `requireAuth`, so `req.user` is guaranteed to be set.

---

## 22.11 The Room Routes

Each upload-handling route flows through **upload → validator → validateResult → controller**. Multer parses the multipart form first (so `req.body` is populated for `createRoom`), then `express-validator` checks the values, then `validateResult` either responds with 400 or passes the request to the controller.

PUT and DELETE routes are pure JSON / pure URL params -- no Multer in front of them.

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
  addRoomImages,
  deleteRoomImage,
} from "../controllers/roomController";
import {
  createRoomValidator,
  updateRoomValidator,
  roomIdValidator,
  roomImageDeleteValidator,
  listRoomsValidator,
} from "../validators/room.validator";

const router: Router = Router();

// Public routes -- anyone can browse rooms
router.get("/", listRoomsValidator, validateResult, getRooms);
router.get("/:id", roomIdValidator, validateResult, getRoomById);

// Owner-only routes
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

// Image management -- separate, focused endpoints
router.post(
  "/:id/images",
  requireAuth,
  requireRole("owner"),
  upload.array("images", 5),
  roomIdValidator,
  validateResult,
  addRoomImages
);
router.delete(
  "/:id/images/:imageName",
  requireAuth,
  requireRole("owner"),
  roomImageDeleteValidator,
  validateResult,
  deleteRoomImage
);

export default router;
```

**`upload.array("images", 5)`** tells Multer to expect up to 5 files in a field called `images`. Multer must run **before** the validators on the routes that use it -- otherwise `req.body` would be empty when the validators check it.

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

export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error: unknown) {
    console.error("getRooms error:", error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};
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

export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const room: IRoom | null = await Room.findById(req.params.id)
      .populate("owner", "name email");

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    res.json({ data: room });
  } catch (error: unknown) {
    console.error("getRoomById error:", error);
    res.status(500).json({ message: "Failed to fetch room" });
  }
};
```

---

## 22.14 PUT /api/rooms/:id -- Update Text Fields (Owner Only)

PUT is **text-only**: title, description, price, location, capacity, amenities. **No image handling here.** Image management lives in its own dedicated endpoints (sections 22.15 and 22.16) -- this keeps each endpoint focused on one job and makes the Edit Room screen cleaner on the frontend.

- The user wants to fix a typo? Just send the changed text fields as plain JSON. No FormData, no Multer.
- The user wants to add a photo? Hit `POST /api/rooms/:id/images`.
- The user wants to remove a photo? Hit `DELETE /api/rooms/:id/images/:imageName`.

```typescript
// backend/src/controllers/roomController.ts (continued)

export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const updatedRoom: IRoom = await room.save();

    res.json({ data: updatedRoom });
  } catch (error: unknown) {
    console.error("updateRoom error:", error);
    res.status(500).json({ message: "Failed to update room" });
  }
};
```

> **Why no images in PUT?** "PUT" in HTTP means "replace this resource." If PUT both *replaced* the text fields and *appended* images, the behaviour would be inconsistent. By splitting them, every endpoint has exactly one job and the frontend can wire up "Save" and the image gallery's "Upload" / "Delete" buttons to different actions.

---

## 22.15 POST /api/rooms/:id/images -- Add Images (Owner Only)

Append new images to an existing room. Multer parses up to 5 files, we validate ownership, then push the filenames onto the room's `images` array.

```typescript
// backend/src/controllers/roomController.ts (continued)

export const addRoomImages = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length === 0) {
      res.status(400).json({ message: "No images provided" });
      return;
    }

    // Append new image filenames to the existing list
    const newFilenames: string[] = files.map((file) => file.filename);
    room.images = [...room.images, ...newFilenames];

    const updatedRoom: IRoom = await room.save();

    res.status(200).json({ data: updatedRoom });
  } catch (error: unknown) {
    console.error("addRoomImages error:", error);
    res.status(500).json({ message: "Failed to add images" });
  }
};
```

**Why return the updated room?** The frontend needs to know what the new gallery looks like to re-render it. Returning the full room (instead of just the new filenames) means the React Query cache gets refreshed in one shot.

---

## 22.16 DELETE /api/rooms/:id/images/:imageName -- Remove One Image (Owner Only)

Remove a single image from a room: delete the file from disk and remove the filename from the `images` array.

```typescript
// backend/src/controllers/roomController.ts (continued)
import fs from "fs";
import path from "path";

export const deleteRoomImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, imageName } = req.params;

    const room: IRoom | null = await Room.findById(id);

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    // Check ownership
    if (room.owner.toString() !== req.user!.userId) {
      res.status(403).json({ message: "You can only edit your own rooms" });
      return;
    }

    // Make sure the image actually belongs to this room.
    // This also blocks an attacker trying to delete arbitrary files via
    // a crafted filename -- we only ever delete files in the room's own list.
    if (!room.images.includes(imageName)) {
      res.status(404).json({ message: "Image not found on this room" });
      return;
    }

    // Delete the file from disk if it still exists
    const imagePath: string = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      "rooms",
      imageName
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Remove the filename from the room's images array
    room.images = room.images.filter((name) => name !== imageName);
    await room.save();

    res.status(204).send();
  } catch (error: unknown) {
    console.error("deleteRoomImage error:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};
```

**Security note:** Checking `room.images.includes(imageName)` before touching the filesystem is a critical guard. Without it, a malicious user could send `imageName = "../../../etc/passwd"` and try to delete arbitrary files. Since the database only stores filenames Multer chose, the includes check restricts deletes to files we know we created.

---

## 22.17 DELETE /api/rooms/:id -- Delete Room (Owner Only)

When a room is deleted, we must also delete its image files from disk. The response uses status `204 No Content` -- there is nothing meaningful to return for a successful delete (matching the Todo API in Lesson 16).

```typescript
// backend/src/controllers/roomController.ts (continued)

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
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
  } catch (error: unknown) {
    console.error("deleteRoom error:", error);
    res.status(500).json({ message: "Failed to delete room" });
  }
};
```

---

## 22.18 Registering the Routes

Add the room routes to your main Express app alongside the auth routes from Lesson 20. The full "middleware + routes" section of `index.ts` now looks like this:

```typescript
// backend/src/index.ts (relevant middleware + route mounts)
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";

app.use(cors({ /* ... */ }));
app.use(express.json());

// Serve uploaded images from /uploads (added in section 22.8)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// ... the global error handler comes last (section 22.19) ...
```

**Order matters:**
- `express.json()` and `cors()` must run before the routes so `req.body` is parsed and CORS headers are set
- `express.static("/uploads")` must be mounted before the route handlers so `/uploads/rooms/foo.jpg` is served as a file, not treated as an API path
- The global error handler is the **last** `app.use()` call so it catches errors from any earlier middleware or route

---

## 22.19 Extending the Global Error Handler for Multer

In Lesson 20 we added a global error handler at the bottom of `index.ts`. Multer-specific errors (file too large, too many files, wrong file type) need their own branches so we can return clear 400 responses. We **replace** that Lesson 20 handler with the fuller version below -- no separate `errorHandler.ts` file needed.

```typescript
// backend/src/index.ts (replace the existing global error handler)
import multer from "multer";

app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Unhandled error:", err);

    // Multer errors (file size / count / unexpected field)
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res
          .status(400)
          .json({ message: "Each image must be under 5 MB" });
        return;
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        res
          .status(400)
          .json({ message: "You can upload up to 5 images at a time" });
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
  }
);
```

> **`LIMIT_FILE_COUNT` vs `LIMIT_UNEXPECTED_FILE`** -- Multer has both, but they mean different things. `LIMIT_FILE_COUNT` fires when the client sends more files than the `files` limit we set in `multer({ limits: { files: 5 } })`. `LIMIT_UNEXPECTED_FILE` fires when the field name in the form does not match the field name in `upload.array("images", 5)`. Because we configured `files: 5` in `upload.ts`, the code we care about is `LIMIT_FILE_COUNT`.

**The full error-handling pattern in this project:**
- **`express-validator`** catches bad input (400) before the controller runs
- **Multer** rejects oversized files and disallowed types (Multer itself calls `next(err)`, so these errors reach the global handler below)
- **`try/catch`** in each controller catches Mongoose/file-system errors and returns a clean 500 with a descriptive message
- **Global error handler** is the safety net for Multer errors and anything else that slips through (Mongoose `ValidationError`, `CastError`, etc.)

---

## 22.20 Testing with Postman or Thunder Client

### Creating a Room (POST)

1. Set method to **POST** and URL to `http://localhost:4001/api/rooms`
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
GET http://localhost:4001/api/rooms?page=1&limit=5&location=London&minPrice=50&maxPrice=200
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

### Updating Room Text Fields (PUT)

Pure JSON, no Multer.

1. Method: **PUT**, URL: `http://localhost:4001/api/rooms/<roomId>`
2. Header: `Authorization: Bearer <your-jwt-token>`
3. Header: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   { "title": "Updated room title", "price": 95 }
   ```
5. Send

**Expected response (200):** `{ "data": { ...updated room... } }`

### Adding More Images (POST /:id/images)

1. Method: **POST**, URL: `http://localhost:4001/api/rooms/<roomId>/images`
2. Header: `Authorization: Bearer <your-jwt-token>`
3. Body: **form-data**, key `images`, attach up to 5 image files
4. Send

**Expected response (200):**
```json
{
  "data": {
    "_id": "65abc...",
    "images": [
      "1700000000000-room1.jpg",
      "1700000000001-room2.jpg",
      "1700001234567-new-photo.jpg"
    ],
    "...": "..."
  }
}
```

The new filenames are **appended** to the existing array, not replacing it.

### Removing a Single Image (DELETE /:id/images/:imageName)

1. Method: **DELETE**, URL: `http://localhost:4001/api/rooms/<roomId>/images/1700001234567-new-photo.jpg`
2. Header: `Authorization: Bearer <your-jwt-token>`
3. Send

**Expected response: 204 No Content.** The file is removed from `uploads/rooms/` and pulled out of the room's `images` array.

If the filename does not belong to that room you get `404 { "message": "Image not found on this room" }`. If someone tries a traversal attack (`../../etc/passwd`) the validator rejects it as a 400.

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
http://localhost:4001/uploads/rooms/1700000000000-room1.jpg
```

You should see the uploaded image displayed directly.

---

## 22.21 Complete File Summary

```
backend/
├── src/
│   ├── controllers/
│   │   └── roomController.ts      # CRUD logic with explicit try/catch in each handler
│   ├── middleware/
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
4. Implement all five endpoints (each with its own `try/catch`): POST, GET (list), GET (single), PUT, DELETE
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
8. **Explicit `try/catch`** in every controller catches Mongoose and file-system errors and returns a clean 500 with a descriptive message -- the same pattern used in Lessons 16 and 20
9. **Response envelope** -- `{ data: room }` for single items and `{ data: [...], meta: {...} }` for paginated lists, identical to the Todo API
10. **`express.static`** serves files from a directory, making uploads accessible via URL
11. **Ownership checks** (`room.owner.toString() === req.user!.userId`) ensure only the creator can edit or delete
12. **Pagination** uses `skip` and `limit` to return results in pages: `skip = (page - 1) * limit` -- always combined with `.sort()`
13. **`Promise.all`** runs `find()` and `countDocuments()` in parallel for fewer round trips
14. **MongoDB `$regex`** enables case-insensitive search across text fields
15. **PUT updates text only** -- image management lives in its own endpoints (`POST /:id/images` to add, `DELETE /:id/images/:imageName` to remove). Each endpoint has one job, the frontend wiring stays clean.
16. **Validate filenames before touching disk** -- `room.images.includes(imageName)` plus a `[a-zA-Z0-9._-]+` regex blocks path-traversal attacks like `../../etc/passwd`
17. **Always delete files from disk** when deleting a room or a single image -- otherwise orphaned files accumulate
18. **Global error handler** branches on Multer errors, Mongoose validation, and CastError to keep responses structured
