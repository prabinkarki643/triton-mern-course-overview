# Lesson 22: Room Management Backend & File Uploads

## What You Will Learn
- Creating CRUD endpoints for room management with owner-based access control
- Setting up Multer for handling file uploads in Express
- Filtering uploaded files to accept only specific image formats
- Handling multipart form data with multiple file uploads
- Serving static files (uploaded images) from Express
- Building paginated, filterable, and searchable GET endpoints
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

## 22.9 POST /api/rooms -- Create a Room with Images

This is the most complex endpoint. It handles both text fields and file uploads in a single request:

```typescript
// backend/src/controllers/roomController.ts
import { Request, Response } from "express";
import Room, { IRoom } from "../models/Room";
import { AuthRequest } from "../middleware/auth";

export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, location, price, capacity, amenities } = req.body;

    // Parse amenities -- frontend sends as JSON string or comma-separated
    let parsedAmenities: string[] = [];
    if (typeof amenities === "string") {
      try {
        parsedAmenities = JSON.parse(amenities);
      } catch {
        parsedAmenities = amenities.split(",").map((a: string) => a.trim());
      }
    } else if (Array.isArray(amenities)) {
      parsedAmenities = amenities;
    }

    // Get uploaded file names from Multer
    const files = req.files as Express.Multer.File[];
    const imageFilenames: string[] = files
      ? files.map((file: Express.Multer.File) => file.filename)
      : [];

    const room: IRoom = await Room.create({
      title,
      description,
      location,
      price: Number(price),
      capacity: Number(capacity),
      amenities: parsedAmenities,
      images: imageFilenames,
      owner: req.user!._id,
    });

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create room";
    res.status(400).json({ success: false, error: message });
  }
};
```

**Why `Number(price)`?** When data arrives via `multipart/form-data`, all fields come as strings. We must convert numeric fields manually.

---

## 22.10 The Room Routes

```typescript
// backend/src/routes/roomRoutes.ts
import { Router } from "express";
import { protect } from "../middleware/auth";
import upload from "../middleware/upload";
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} from "../controllers/roomController";

const router: Router = Router();

// Public routes -- anyone can browse rooms
router.get("/", getRooms);
router.get("/:id", getRoomById);

// Protected routes -- only authenticated owners
router.post("/", protect, upload.array("images", 5), createRoom);
router.put("/:id", protect, upload.array("images", 5), updateRoom);
router.delete("/:id", protect, deleteRoom);

export default router;
```

**`upload.array("images", 5)`** tells Multer to expect up to 5 files in a field called `images`. The middleware runs before the controller, so by the time `createRoom` executes, `req.files` is already populated.

---

## 22.11 GET /api/rooms -- Pagination, Filtering, and Search

A real application does not return every room at once. We need pagination (pages of results), filtering (by location, price, capacity), and search (by title or description):

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
    // Pagination
    const page: number = Math.max(1, Number(req.query.page) || 1);
    const limit: number = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip: number = (page - 1) * limit;

    // Build filter object
    const filter: RoomQuery = {};

    // Filter by location (case-insensitive partial match)
    if (req.query.location) {
      filter.location = {
        $regex: req.query.location as string,
        $options: "i",
      };
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) {
        filter.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter.price.$lte = Number(req.query.maxPrice);
      }
    }

    // Filter by minimum capacity
    if (req.query.capacity) {
      filter.capacity = { $gte: Number(req.query.capacity) };
    }

    // Search by title or description
    if (req.query.search) {
      const searchRegex: string = req.query.search as string;
      filter.$or = [
        { title: { $regex: searchRegex, $options: "i" } },
        { description: { $regex: searchRegex, $options: "i" } },
      ];
    }

    // Execute query with pagination
    const [rooms, total]: [IRoom[], number] = await Promise.all([
      Room.find(filter)
        .populate("owner", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Room.countDocuments(filter),
    ]);

    const totalPages: number = Math.ceil(total / limit);

    res.json({
      success: true,
      data: rooms,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch rooms";
    res.status(500).json({ success: false, error: message });
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

---

## 22.12 GET /api/rooms/:id -- Room Details

A simple endpoint that returns a single room with full owner details:

```typescript
// backend/src/controllers/roomController.ts (continued)

export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const room: IRoom | null = await Room.findById(req.params.id)
      .populate("owner", "name email");

    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    res.json({ success: true, data: room });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch room";
    res.status(500).json({ success: false, error: message });
  }
};
```

---

## 22.13 PUT /api/rooms/:id -- Update Room (Owner Only)

Only the room owner should be able to edit their listing. We also handle optional new image uploads:

```typescript
// backend/src/controllers/roomController.ts (continued)
import fs from "fs";
import path from "path";

export const updateRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room: IRoom | null = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    // Check ownership
    if (room.owner.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, error: "You can only edit your own rooms" });
      return;
    }

    // Update text fields
    const { title, description, location, price, capacity, amenities } = req.body;

    if (title) room.title = title;
    if (description) room.description = description;
    if (location) room.location = location;
    if (price) room.price = Number(price);
    if (capacity) room.capacity = Number(capacity);

    if (amenities) {
      if (typeof amenities === "string") {
        try {
          room.amenities = JSON.parse(amenities);
        } catch {
          room.amenities = amenities.split(",").map((a: string) => a.trim());
        }
      } else if (Array.isArray(amenities)) {
        room.amenities = amenities;
      }
    }

    // Handle new images (if uploaded)
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      // Delete old images from disk
      for (const oldImage of room.images) {
        const oldPath: string = path.join(__dirname, "..", "..", "uploads", "rooms", oldImage);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Replace with new image filenames
      room.images = files.map((file: Express.Multer.File) => file.filename);
    }

    const updatedRoom: IRoom = await room.save();

    res.json({ success: true, data: updatedRoom });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update room";
    res.status(400).json({ success: false, error: message });
  }
};
```

**Key detail:** When new images are uploaded, we delete the old files from disk first. Otherwise, orphaned files would pile up in the `uploads/rooms` directory forever.

---

## 22.14 DELETE /api/rooms/:id -- Delete Room (Owner Only)

When a room is deleted, we must also delete its image files from disk:

```typescript
// backend/src/controllers/roomController.ts (continued)

export const deleteRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const room: IRoom | null = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    // Check ownership
    if (room.owner.toString() !== req.user!._id.toString()) {
      res.status(403).json({ success: false, error: "You can only delete your own rooms" });
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

    res.json({ success: true, message: "Room deleted successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete room";
    res.status(500).json({ success: false, error: message });
  }
};
```

---

## 22.15 Registering the Routes

Add the room routes to your main Express app:

```typescript
// backend/src/index.ts
import roomRoutes from "./routes/roomRoutes";

// ... after other middleware
app.use("/api/rooms", roomRoutes);
```

---

## 22.16 Handling Multer Errors

Multer throws specific errors for file size limits and invalid file types. We should catch these gracefully:

```typescript
// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import multer from "multer";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 5 MB.",
      });
      return;
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      res.status(400).json({
        success: false,
        error: "Too many files. Maximum is 5 images.",
      });
      return;
    }
  }

  if (err.message === "Only .jpg, .png, and .webp image files are allowed") {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
};
```

Register this at the very end of your middleware chain:

```typescript
// backend/src/index.ts (at the bottom, after all routes)
import { errorHandler } from "./middleware/errorHandler";

app.use(errorHandler);
```

---

## 22.17 Testing with Postman or Thunder Client

### Creating a Room (POST)

1. Set method to **POST** and URL to `http://localhost:3001/api/rooms`
2. Add header: `Authorization: Bearer <your-jwt-token>`
3. Switch body to **form-data** (not JSON!)
4. Add text fields:
   - `title`: "Spacious Meeting Room"
   - `description`: "A bright room with city views"
   - `location`: "London"
   - `price`: "75"
   - `capacity`: "10"
   - `amenities`: '["WiFi","Projector","Whiteboard"]'
5. Add file fields:
   - `images`: select a .jpg file
   - `images`: select another .jpg file
6. Send the request

**Expected response:**
```json
{
  "success": true,
  "data": {
    "_id": "65abc123...",
    "title": "Spacious Meeting Room",
    "description": "A bright room with city views",
    "location": "London",
    "price": 75,
    "capacity": 10,
    "amenities": ["WiFi", "Projector", "Whiteboard"],
    "images": ["1700000000000-room1.jpg", "1700000000001-room2.jpg"],
    "owner": "65def456...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Browsing Rooms (GET with Filters)

```
GET http://localhost:3001/api/rooms?page=1&limit=5&location=London&minPrice=50&maxPrice=200
```

No authentication needed -- browsing is public.

### Viewing an Image

Open in your browser:
```
http://localhost:3001/uploads/rooms/1700000000000-room1.jpg
```

You should see the uploaded image displayed directly.

---

## 22.18 Complete File Summary

```
backend/
├── src/
│   ├── controllers/
│   │   └── roomController.ts      # CRUD logic with ownership checks
│   ├── middleware/
│   │   ├── auth.ts                # JWT authentication (from previous lesson)
│   │   ├── upload.ts              # Multer storage, filter, limits
│   │   └── errorHandler.ts        # Multer error handling
│   ├── models/
│   │   └── Room.ts                # Mongoose schema with typed interface
│   ├── routes/
│   │   └── roomRoutes.ts          # Public + protected route definitions
│   └── index.ts                   # Static file serving + route registration
├── uploads/
│   └── rooms/                     # Uploaded images stored here
└── package.json
```

---

## Practice Exercises

### Exercise 1: Complete Room API
1. Create the `upload.ts` middleware with storage, filter, and size limit
2. Create the `Room` model with all fields and validation
3. Implement all five endpoints: POST, GET (list), GET (single), PUT, DELETE
4. Ensure the `uploads/rooms` directory is created on server start
5. Test creating a room with images using Postman or Thunder Client

### Exercise 2: Add Amenity Filtering
Extend the GET `/api/rooms` endpoint to filter by amenities:
```
GET /api/rooms?amenities=WiFi,Projector
```
Hint: Use `$all` to require all specified amenities:
```typescript
if (req.query.amenities) {
  const amenityList: string[] = (req.query.amenities as string).split(",");
  filter.amenities = { $all: amenityList };
}
```

### Exercise 3: Sort Options
Add a `sort` query parameter that accepts values like `price_asc`, `price_desc`, `newest`, `oldest`:
```typescript
let sortOption: Record<string, 1 | -1> = { createdAt: -1 }; // default newest

if (req.query.sort === "price_asc") sortOption = { price: 1 };
if (req.query.sort === "price_desc") sortOption = { price: -1 };
if (req.query.sort === "oldest") sortOption = { createdAt: 1 };
```

### Exercise 4: Image Count Validation
Modify the POST endpoint to require at least one image when creating a room. Return a clear error message if no images are provided.

---

## Key Takeaways
1. **Multer** handles `multipart/form-data` -- the encoding used for file uploads in HTTP
2. **`diskStorage`** gives you control over the destination folder and filename for each upload
3. **File filters** should check both MIME type and file extension for security
4. **`upload.array("images", 5)`** accepts up to 5 files in the `images` field of the form
5. **`express.static`** serves files from a directory, making uploads accessible via URL
6. **Ownership checks** (`room.owner === req.user._id`) ensure only the creator can edit or delete
7. **Pagination** uses `skip` and `limit` to return results in pages: `skip = (page - 1) * limit`
8. **MongoDB `$regex`** enables case-insensitive search across text fields
9. **Always delete files from disk** when deleting or replacing room images -- otherwise orphaned files accumulate
10. All form fields arrive as **strings** in multipart requests -- convert numbers with `Number()` and parse arrays with `JSON.parse()`
