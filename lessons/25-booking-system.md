# Lesson 25: Booking System

## What You Will Learn
- Designing a booking model with date ranges, status flow and a chosen payment method
- Validating booking input with **`express-validator`** (route layer) and Mongoose schema rules
- Wrapping controllers in **`asyncHandler`** to drop the `try/catch` boilerplate
- Returning a consistent **`{ data }` / `{ data, meta }` envelope** -- never `{ success: true, ... }`
- Detecting overlapping date ranges with a single MongoDB query
- Calculating total price on the server using check-in / check-out dates
- **Paginating** "My Bookings" and "Booking Requests" with `Promise.all([find, countDocuments])`
- Using Mongoose **`populate`** to inline room and user data on the response
- Building a typed **`bookingApi`** service layer + **React Query hooks** with a query keys factory
- A real-time price preview powered by `form.watch()`
- Building the booking creation form with **shadcn `Form` + Zod** (`Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`)
- Reusing the generic **`<DataTable>`** from Lesson 17.1 for "My Bookings" and the owner's "Booking Requests" view, complete with status filters, URL-driven pagination and row actions
- Wiring **Sonner toasts** into every mutation so users always know what happened

---

## 25.1 The Big Picture

The booking system connects guests to rooms. A guest picks dates, a guest count and a payment method, then sends a booking request. The room owner reviews it and either confirms or cancels. Here is the complete flow:

```
Guest                              Express API                       MongoDB
  |                                     |                                |
  |-- POST /api/bookings -------------> |                                |
  |   { room, checkIn, checkOut,        |-- express-validator ---------> |
  |     guests, paymentMethod }         |   asyncHandler                 |
  |                                     |   Check date conflicts -->     |
  |                                     |   Calculate total price        |
  |                                     |   Save booking (pending) ----> |
  |                                     |                                |
  |<-- { data: booking } ---------------|                                |
  |                                     |                                |
Owner                                   |                                |
  |-- PATCH /api/bookings/:id/status -> |-- Verify owner --------------> |
  |   { status: "confirmed" }           |-- Update status -------------> |
  |                                     |                                |
  |<-- { data: booking } ---------------|                                |
```

### Status Flow

```
pending ──(owner confirms)──> confirmed
   │
   ├──(owner cancels)────────> cancelled
   │
   └──(user cancels while pending)──> cancelled

confirmed ──(owner cancels)──> cancelled
```

A booking starts as **pending** when the guest creates it. The owner either **confirms** or **cancels** it. While still pending, the guest may also cancel their own request. A confirmed booking can be cancelled by the owner. A cancelled booking is final.

---

## 25.2 The Booking Model

We continue with the same patterns we used in the Todo API (Lesson 16) and the auth API (Lesson 20): typed Mongoose interfaces, schema-level rules and an `enum` for status.

```ts
// backend/src/models/Booking.ts
import mongoose, { Schema, Document } from "mongoose";

export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentMethod = "esewa" | "cod";

export interface IBooking extends Document {
  room: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
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
      min: [1, "At least 1 guest is required"],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"],
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
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;
```

We will start the payment integration properly in **Lesson 26**. For now, the booking simply records which method the guest selected (`esewa` for the gateway flow or `cod` for cash on arrival).

---

## 25.3 Booking Validators with express-validator

Just like Lessons 16 and 20, we keep validation rules out of the controllers. They live in their own file as reusable validator chains:

```ts
// backend/src/validators/booking.validator.ts
import { body, param, query } from "express-validator";

const bookingIdParam = param("id")
  .isMongoId()
  .withMessage("Invalid booking ID format");

// POST /api/bookings
export const createBookingValidator = [
  body("room")
    .exists({ checkFalsy: true })
    .withMessage("Room is required")
    .bail()
    .isMongoId()
    .withMessage("Valid room ID required"),

  body("checkIn")
    .exists({ checkFalsy: true })
    .withMessage("Check-in is required")
    .bail()
    .isISO8601()
    .withMessage("Valid check-in date required")
    .toDate(),

  body("checkOut")
    .exists({ checkFalsy: true })
    .withMessage("Check-out is required")
    .bail()
    .isISO8601()
    .withMessage("Valid check-out date required")
    .toDate(),

  body("guests")
    .exists({ checkFalsy: true })
    .withMessage("Guest count is required")
    .bail()
    .isInt({ min: 1 })
    .withMessage("Guests must be at least 1")
    .toInt(),

  body("paymentMethod")
    .exists({ checkFalsy: true })
    .withMessage("Payment method is required")
    .bail()
    .isIn(["esewa", "cod"])
    .withMessage("Payment method must be esewa or cod"),
];

// PATCH /api/bookings/:id/status
export const updateBookingStatusValidator = [
  bookingIdParam,

  body("status")
    .exists({ checkFalsy: true })
    .withMessage("Status is required")
    .bail()
    .isIn(["confirmed", "cancelled"])
    .withMessage("Status must be 'confirmed' or 'cancelled'"),
];

// GET /api/bookings/my and GET /api/bookings/owner
export const listBookingsValidator = [
  query("status")
    .optional()
    .isIn(["pending", "confirmed", "cancelled"])
    .withMessage("status must be pending, confirmed, or cancelled"),

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

// GET /api/bookings/:id, etc.
export const bookingIdValidator = [bookingIdParam];
```

`.toDate()` and `.toInt()` *sanitise* the value -- the controller receives a real `Date` and a real `number`, not strings. By the time the controller runs we already know that `room` is a valid Mongo ID, `checkIn`/`checkOut` parse to dates, `guests >= 1` and `paymentMethod` is one of the allowed enum values.

The `validateResult` middleware from Lesson 16 turns any failures into a 400 with a structured `details` array -- no extra work needed.

---

## 25.4 The Booking Controller (asyncHandler + `{ data }`)

Controllers stay tight and focused: the validators have already done the input checking and `asyncHandler` forwards thrown errors to the global handler. Every successful response uses the **`{ data }`** envelope, and list endpoints add **`{ data, meta }`** for pagination -- exactly matching the rest of the API.

```ts
// backend/src/controllers/bookingController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import Booking, { IBooking } from "../models/Booking";
import Room, { IRoom } from "../models/Room";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// POST /api/bookings  -- guest creates a booking request
export const createBooking = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { room: roomId, checkIn, checkOut, guests, paymentMethod } = req.body;

    // Validation chain already guarantees these exist + correct types.
    // The remaining checks are business rules.

    const checkInDate: Date = checkIn;
    const checkOutDate: Date = checkOut;
    const now = new Date();

    if (checkInDate <= now) {
      res.status(400).json({ error: "Check-in date must be in the future" });
      return;
    }

    if (checkOutDate <= checkInDate) {
      res.status(400).json({ error: "Check-out must be after check-in" });
      return;
    }

    const room: IRoom | null = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    if (guests > room.capacity) {
      res.status(400).json({
        error: `This room has a maximum capacity of ${room.capacity} guests`,
      });
      return;
    }

    // Conflict detection -- see 25.5 for the full explanation
    const conflictingBooking: IBooking | null = await Booking.findOne({
      room: roomId,
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
      status: { $ne: "cancelled" },
    });

    if (conflictingBooking) {
      res.status(409).json({
        error: "This room is already booked for the selected dates",
      });
      return;
    }

    const nights: number = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / MS_PER_DAY
    );
    const totalPrice: number = nights * room.price;

    const booking: IBooking = await Booking.create({
      room: roomId,
      user: req.user!._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalPrice,
      status: "pending",
      paymentMethod,
    });

    const populated = await Booking.findById(booking._id)
      .populate("room", "title location price images")
      .populate("user", "name email");

    res.status(201).json({ data: populated });
  }
);

// GET /api/bookings/my  -- paginated list of the current user's bookings
export const getMyBookings = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, page, limit } = req.query as {
      status?: string;
      page?: number;
      limit?: number;
    };

    const filter: Record<string, unknown> = { user: req.user!._id };
    if (status) filter.status = status;

    const pageNum: number = page ? Number(page) : 1;
    const limitNum: number = limit ? Number(limit) : 10;
    const skip: number = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("room", "title images location price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    const totalPages: number = Math.ceil(total / limitNum);

    res.json({
      data: bookings,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  }
);

// GET /api/bookings/owner  -- paginated list of incoming bookings for the owner's rooms
export const getOwnerBookings = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, page, limit } = req.query as {
      status?: string;
      page?: number;
      limit?: number;
    };

    // 1) Find every room owned by the current user
    const ownerRooms: IRoom[] = await Room.find({ owner: req.user!._id }).select("_id");
    const roomIds: mongoose.Types.ObjectId[] = ownerRooms.map(
      (r) => r._id as mongoose.Types.ObjectId
    );

    // 2) Build the booking filter
    const filter: Record<string, unknown> = { room: { $in: roomIds } };
    if (status) filter.status = status;

    const pageNum: number = page ? Number(page) : 1;
    const limitNum: number = limit ? Number(limit) : 10;
    const skip: number = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("room", "title images location price")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter),
    ]);

    const totalPages: number = Math.ceil(total / limitNum);

    res.json({
      data: bookings,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  }
);

// PATCH /api/bookings/:id/status  -- owner confirms/cancels, guest cancels own pending
export const updateBookingStatus = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status } = req.body as { status: "confirmed" | "cancelled" };

    const booking = await Booking.findById(req.params.id).populate("room");
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const room = booking.room as unknown as IRoom;
    const isOwner = room.owner.toString() === req.user!._id.toString();
    const isGuest = booking.user.toString() === req.user!._id.toString();

    // Permissions: owner can confirm or cancel. The guest may only cancel their
    // own booking while it is still pending.
    if (status === "confirmed" && !isOwner) {
      res.status(403).json({ error: "Only the room owner can confirm a booking" });
      return;
    }

    if (status === "cancelled" && !isOwner && !isGuest) {
      res.status(403).json({ error: "You do not have permission to cancel this booking" });
      return;
    }

    if (status === "cancelled" && isGuest && !isOwner && booking.status !== "pending") {
      res.status(400).json({ error: "Guests can only cancel a booking while it is still pending" });
      return;
    }

    // Status transition rules
    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Cannot update a cancelled booking" });
      return;
    }
    if (booking.status === "confirmed" && status === "confirmed") {
      res.status(400).json({ error: "Booking is already confirmed" });
      return;
    }

    booking.status = status;
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate("room", "title location price images")
      .populate("user", "name email");

    res.json({ data: updated });
  }
);
```

**Things worth pointing out to students:**

- There is **no `try/catch`** anywhere -- `asyncHandler` catches thrown errors and forwards them to the global handler from Lesson 20.
- Every success response uses `{ data }` (single resource) or `{ data, meta }` (paginated list). No `{ success: true }` flag is ever returned -- the HTTP status code already signals success or failure.
- Validation has already run. We never write `if (!checkIn)` checks in the controller.
- We populate room and user so the frontend can render rich rows without a second request.

---

## 25.5 How Date Conflict Detection Works

This is the most important query in the booking system. It finds any existing booking whose date range overlaps with the new one:

```ts
const conflictingBooking = await Booking.findOne({
  room: roomId,
  checkIn: { $lt: checkOutDate },  // existing check-in is BEFORE new check-out
  checkOut: { $gt: checkInDate },  // existing check-out is AFTER new check-in
  status: { $ne: "cancelled" },    // ignore cancelled bookings
});
```

**Why does this work?** Two date ranges overlap if and only if each one starts before the other ends. Let us visualise:

```
Scenario 1: Overlap (conflict)
Existing:   |----5th----|----10th----|
New:              |----8th----|----13th----|
              checkIn < checkOut ✓  AND  checkOut > checkIn ✓  →  CONFLICT

Scenario 2: Overlap (conflict)
Existing:        |----8th----|----13th----|
New:        |----5th----|----10th----|
              checkIn < checkOut ✓  AND  checkOut > checkIn ✓  →  CONFLICT

Scenario 3: No overlap (safe)
Existing:   |----5th----|----10th----|
New:                                     |----12th----|----15th----|
              checkIn < checkOut ✓  BUT  checkOut > checkIn ✗  →  NO CONFLICT

Scenario 4: Adjacent dates (safe)
Existing:   |----5th----|----10th----|
New:                                |----10th----|----13th----|
              checkIn < checkOut ✗  →  NO CONFLICT (check-out day = new check-in day is fine)
```

**`$ne: "cancelled"`** ensures we ignore cancelled bookings. If a previous booking for those dates was cancelled, the dates should be free again.

---

## 25.6 Mongoose populate

Mongoose `populate` swaps an ObjectId reference for the actual document. Without `populate`, a booking response would only contain the IDs:

```json
{ "room": "65abc123...", "user": "65def456..." }
```

With populate (selecting only the fields the UI needs), we get fully usable data in a single round trip:

```json
{
  "room": {
    "_id": "65abc123...",
    "title": "Spacious Meeting Room",
    "location": "London",
    "price": 75,
    "images": ["room1.jpg"]
  },
  "user": { "_id": "65def456...", "name": "Alice", "email": "alice@example.com" }
}
```

The `$in: roomIds` query in the owner endpoint is the parallel idea on the booking side -- "find any booking whose `room` is one of *these* IDs" -- so the owner sees all bookings for all their rooms in one query.

---

## 25.7 Booking Routes

Mirroring the route style from Lessons 16 and 20 -- each route runs the **validator → `validateResult` → controller** chain:

```ts
// backend/src/routes/bookingRoutes.ts
import { Router } from "express";
import { protect } from "../middleware/auth";
import { validateResult } from "../middleware/validate-result.middleware";
import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  updateBookingStatus,
} from "../controllers/bookingController";
import {
  createBookingValidator,
  updateBookingStatusValidator,
  listBookingsValidator,
} from "../validators/booking.validator";

const router: Router = Router();

router.post("/", protect, createBookingValidator, validateResult, createBooking);
router.get("/my", protect, listBookingsValidator, validateResult, getMyBookings);
router.get("/owner", protect, listBookingsValidator, validateResult, getOwnerBookings);
router.patch(
  "/:id/status",
  protect,
  updateBookingStatusValidator,
  validateResult,
  updateBookingStatus
);

export default router;
```

Register the routes in the main app:

```ts
// backend/src/index.ts
import bookingRoutes from "./routes/bookingRoutes";

app.use("/api/bookings", bookingRoutes);
```

### Endpoint Summary

| Method | URL | Body / Query | Response | Description |
|--------|-----|--------------|----------|-------------|
| POST | `/api/bookings` | `{ room, checkIn, checkOut, guests, paymentMethod }` | `{ data }` | Create a booking request |
| GET | `/api/bookings/my` | `?status=&page=&limit=` | `{ data, meta }` | Current user's bookings (paginated) |
| GET | `/api/bookings/owner` | `?status=&page=&limit=` | `{ data, meta }` | Bookings for the owner's rooms (paginated) |
| PATCH | `/api/bookings/:id/status` | `{ status }` | `{ data }` | Confirm or cancel a booking |

---

## 25.8 Frontend Types for Bookings

The shape mirrors the API response. Notice we include the **`meta`** object for paginated lists -- exactly like `RoomsResponse` from Lesson 24:

```ts
// booking-frontend/src/types/booking.ts
import type { Room } from "./room";
import type { PaginationMeta } from "./room";

export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentMethod = "esewa" | "cod";

export interface Booking {
  _id: string;
  room: Room;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  checkIn: string;     // ISO date string from the API
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  paymentMethod: PaymentMethod;
}

export interface BookingFilters {
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface BookingsResponse {
  data: Booking[];
  meta: PaginationMeta;
}

export interface BookingResponse {
  data: Booking;
}
```

---

## 25.9 Booking API Service

The service unwraps the response envelopes once -- the rest of the app deals in clean types. This is exactly the same pattern as `todoApi` (Lesson 17.1) and `roomApi` (Lesson 24):

```ts
// booking-frontend/src/services/bookingApi.ts
import api from "./api";
import type {
  Booking,
  BookingsResponse,
  CreateBookingData,
  BookingFilters,
  BookingStatus,
} from "@/types/booking";

export const bookingApi = {
  async create(payload: CreateBookingData): Promise<Booking> {
    const { data } = await api.post<{ data: Booking }>("/bookings", payload);
    return data.data;
  },

  async getMy(filters: BookingFilters = {}): Promise<BookingsResponse> {
    const { data } = await api.get<BookingsResponse>("/bookings/my", { params: filters });
    return data;
  },

  async getOwner(filters: BookingFilters = {}): Promise<BookingsResponse> {
    const { data } = await api.get<BookingsResponse>("/bookings/owner", { params: filters });
    return data;
  },

  async updateStatus(
    id: string,
    status: Extract<BookingStatus, "confirmed" | "cancelled">
  ): Promise<Booking> {
    const { data } = await api.patch<{ data: Booking }>(`/bookings/${id}/status`, { status });
    return data.data;
  },
};
```

---

## 25.10 The `useBookings` Hooks (Query Keys Factory + One Hook per Action)

Following Lesson 17, we define a centralised **query keys factory** and one focused hook per action. Each mutation invalidates the correct subset of the cache and shows a Sonner toast.

```ts
// booking-frontend/src/hooks/useBookings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingApi } from "@/services/bookingApi";
import type { BookingFilters, CreateBookingData, BookingStatus } from "@/types/booking";

// Centralised query keys -- one source of truth for invalidation
export const bookingKeys = {
  all: ["bookings"] as const,
  myLists: () => [...bookingKeys.all, "my"] as const,
  myList: (filters: BookingFilters) => [...bookingKeys.myLists(), filters] as const,
  ownerLists: () => [...bookingKeys.all, "owner"] as const,
  ownerList: (filters: BookingFilters) => [...bookingKeys.ownerLists(), filters] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

// --- Queries ---

export function useMyBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.myList(filters),
    queryFn: () => bookingApi.getMy(filters),
    placeholderData: (previousData) => previousData,
  });
}

export function useOwnerBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.ownerList(filters),
    queryFn: () => bookingApi.getOwner(filters),
    placeholderData: (previousData) => previousData,
  });
}

// --- Mutations ---

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookingData) => bookingApi.create(payload),
    onSuccess: () => {
      toast.success("Booking request sent -- the owner will review it shortly");
      queryClient.invalidateQueries({ queryKey: bookingKeys.myLists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Extract<BookingStatus, "confirmed" | "cancelled">;
    }) => bookingApi.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "confirmed" ? "Booking confirmed" : "Booking cancelled"
      );
      // Invalidate everything booking-related: my, owner and detail caches all
      // need refreshing because the same booking shows in multiple views.
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });
}
```

**Why this layout?**

| Pattern | Benefit |
|---------|---------|
| Hierarchical keys (`bookingKeys.all` → `myLists()` → `myList(filters)`) | Invalidate broadly (`all`) or narrowly (just my-lists) without typos |
| `placeholderData` on lists | Previous page stays on screen while the next page loads -- no flash |
| One hook per action | A component only re-renders when *its* mutation state changes |
| Toasts inside the hooks | Consistent UX across every screen that creates / updates bookings |

---

## 25.11 The URL-Driven Filter Hook

Just like `useTodosFilters` (Lesson 17.1) and `useRoomFilters` (Lesson 24), we store the booking list filters in the URL so they survive a refresh, can be bookmarked and can be shared.

```ts
// booking-frontend/src/hooks/useBookingFilters.ts
import { useSearchParams } from "react-router-dom";
import type { BookingFilters, BookingStatus } from "@/types/booking";

export function useBookingFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: BookingFilters = {
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
    status: (searchParams.get("status") as BookingStatus) || undefined,
  };

  const setFilters = (updates: Partial<BookingFilters>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "" || value === null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    setSearchParams(next, { replace: true });
  };

  const setFilter = <K extends keyof BookingFilters>(
    key: K,
    value: BookingFilters[K]
  ) => {
    // Reset to page 1 whenever a filter changes
    setFilters({ [key]: value, page: 1 } as Partial<BookingFilters>);
  };

  const resetFilters = () =>
    setSearchParams(new URLSearchParams(), { replace: true });

  return { filters, setFilters, setFilter, resetFilters };
}
```

---

## 25.12 The Booking Form (shadcn `Form` + Zod)

The booking form sits on the room detail page (from Lesson 24). We use the official **shadcn `Form`** component family (`Form` / `FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormMessage`) -- the same accessible pattern from Lesson 12.

Install the form component if you have not already:

```bash
npx shadcn@latest add form
```

### The Schema

We use `refine` for cross-field validation ("check-out must be after check-in") because that rule cannot be expressed on a single field:

```ts
// booking-frontend/src/schemas/bookingSchema.ts
import { z } from "zod";

export const bookingSchema = z
  .object({
    checkIn: z.string().min(1, "Check-in date required"),
    checkOut: z.string().min(1, "Check-out date required"),
    guests: z.coerce
      .number()
      .int()
      .min(1, "At least 1 guest")
      .max(20, "Up to 20 guests"),
    paymentMethod: z.enum(["esewa", "cod"], {
      errorMap: () => ({ message: "Please select a payment method" }),
    }),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type BookingFormData = z.infer<typeof bookingSchema>;
```

`z.coerce.number()` converts the string from the `<input type="number">` into a real number before validating.

### The Component

```tsx
// booking-frontend/src/components/booking/BookingForm.tsx
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateBooking } from "@/hooks/useBookings";
import { bookingSchema, type BookingFormData } from "@/schemas/bookingSchema";
import type { Room } from "@/types/room";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (end <= start) return 0;
  return Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
}

interface BookingFormProps {
  room: Room;
}

function BookingForm({ room }: BookingFormProps): JSX.Element {
  const navigate = useNavigate();
  const { mutate: createBooking, isPending } = useCreateBooking();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      checkIn: "",
      checkOut: "",
      guests: 1,
      paymentMethod: "esewa",
    },
  });

  // --- Real-time price preview ---
  const checkIn = form.watch("checkIn");
  const checkOut = form.watch("checkOut");
  const nights = useMemo(() => calcNights(checkIn, checkOut), [checkIn, checkOut]);
  const totalPrice = nights * room.price;

  const today = new Date().toISOString().split("T")[0];

  const onSubmit = (data: BookingFormData) => {
    createBooking(
      {
        room: room._id,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        paymentMethod: data.paymentMethod,
      },
      {
        onSuccess: () => navigate("/bookings"),
      }
    );
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-baseline gap-1">
          <span className="text-2xl">&pound;{room.price}</span>
          <span className="text-sm font-normal text-muted-foreground">
            /night
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="checkIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-in</FormLabel>
                  <FormControl>
                    <Input type="date" min={today} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="checkOut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-out</FormLabel>
                  <FormControl>
                    <Input type="date" min={checkIn || today} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guests</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={room.capacity}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Maximum {room.capacity} guests
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment method</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="esewa">eSewa</SelectItem>
                      <SelectItem value="cod">Cash on arrival</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Real-time price preview */}
            {nights > 0 && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      &pound;{room.price} &times; {nights} night
                      {nights !== 1 ? "s" : ""}
                    </span>
                    <span>&pound;{totalPrice}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>&pound;{totalPrice}</span>
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
            >
              {isPending ? "Booking..." : "Book Now"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your booking will be sent to the owner for confirmation.
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default BookingForm;
```

### Why shadcn `Form`?

The shadcn `Form` family wraps React Hook Form so that:

- `FormField` connects each field to `form.control` and supplies `field` (value/onChange) automatically -- no `Controller` boilerplate
- `FormItem` provides spacing and screen reader landmarks
- `FormLabel` is the accessible label and is wired up via context (no `htmlFor` to manage)
- `FormControl` forwards `aria-invalid` and IDs to whatever input you nest inside
- `FormMessage` renders the validation error from React Hook Form -- one line per field

It is the same pattern we apply to the auth forms in Lesson 21 and the room create/edit forms in Lesson 23 -- consistency makes the codebase predictable for students.

### How the Real-Time Price Preview Works

`form.watch("checkIn")` and `form.watch("checkOut")` re-render the component whenever either date changes. We wrap the calculation in `useMemo` so React only recomputes when the inputs change:

```tsx
const nights = useMemo(() => calcNights(checkIn, checkOut), [checkIn, checkOut]);
const totalPrice = nights * room.price;
```

The breakdown appears under the form as soon as both dates are filled in.

### Cross-Field Validation with `refine`

Individual Zod rules can only check one field at a time. `refine` runs after the per-field rules and lets us compare two values. The `path: ["checkOut"]` argument tells React Hook Form which field to attach the error to -- so the user sees "Check-out must be after check-in" right under the check-out input.

---

## 25.13 "My Bookings" Page (Guest View with `<DataTable>`)

We replace the card list from earlier drafts of the lesson with the **generic `<DataTable>` from Lesson 17.1**. The DataTable handles loading skeletons, empty states, and server-driven pagination -- we just provide columns and the data.

### Column Definitions

Columns go in a custom hook so the page component stays focused. Cells can be plain text or JSX:

```tsx
// booking-frontend/src/components/booking/my-booking-columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdateBookingStatus } from "@/hooks/useBookings";
import { API_URL } from "@/services/api";
import type { Booking, BookingStatus } from "@/types/booking";

const statusVariant: Record<BookingStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function useMyBookingColumns(): ColumnDef<Booking>[] {
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();
  const baseUrl = API_URL.replace("/api", "");

  return [
    {
      id: "room",
      header: "Room",
      cell: ({ row }) => {
        const { room } = row.original;
        return (
          <div className="flex items-center gap-3">
            {room.images?.[0] && (
              <img
                src={`${baseUrl}/uploads/rooms/${room.images[0]}`}
                alt={room.title}
                className="h-12 w-12 rounded-md object-cover"
              />
            )}
            <div>
              <p className="font-medium leading-tight">{room.title}</p>
              <p className="text-xs text-muted-foreground">{room.location}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(row.original.checkIn)} &rarr;{" "}
          {formatDate(row.original.checkOut)}
        </span>
      ),
    },
    {
      accessorKey: "guests",
      header: "Guests",
      cell: ({ row }) => row.original.guests,
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold">&pound;{row.original.totalPrice}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status]} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment",
      cell: ({ row }) => (
        <span className="text-sm capitalize">
          {row.original.paymentMethod === "cod" ? "Cash on arrival" : "eSewa"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        // A guest may cancel their own booking only while it is still pending
        if (row.original.status !== "pending") return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() =>
              updateStatus({ id: row.original._id, status: "cancelled" })
            }
          >
            Cancel
          </Button>
        );
      },
    },
  ];
}
```

### The Filter Bar

We reuse the URL-driven filter hook. A `<Select>` drives the status filter; changing it resets to page 1:

```tsx
// booking-frontend/src/components/booking/booking-filters.tsx
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookingFilters } from "@/hooks/useBookingFilters";
import type { BookingStatus } from "@/types/booking";

export function BookingFilters() {
  const { filters, setFilter, resetFilters } = useBookingFilters();

  const hasActive = !!filters.status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) =>
          setFilter("status", v === "all" ? undefined : (v as BookingStatus))
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
```

### The Pagination Bar

```tsx
// booking-frontend/src/components/booking/booking-pagination.tsx
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookingFilters } from "@/hooks/useBookingFilters";
import type { PaginationMeta } from "@/types/room";

interface Props {
  meta?: PaginationMeta;
}

export function BookingPagination({ meta }: Props) {
  const { filters, setFilters } = useBookingFilters();
  if (!meta) return null;

  const { page, totalPages, total, hasNextPage, hasPrevPage } = meta;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-2">
      <div className="text-sm text-muted-foreground">
        Showing page {page} of {totalPages} ({total} total)
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(filters.limit ?? 10)}
            onValueChange={(v) => setFilters({ limit: Number(v), page: 1 })}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: 1 })}
            disabled={!hasPrevPage}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: page - 1 })}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: page + 1 })}
            disabled={!hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: totalPages })}
            disabled={!hasNextPage}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### The Page Itself

The page is now tiny -- just the orchestration:

```tsx
// booking-frontend/src/pages/MyBookings.tsx
import { DataTable } from "@/components/ui/data-table";
import { BookingFilters } from "@/components/booking/booking-filters";
import { BookingPagination } from "@/components/booking/booking-pagination";
import { useMyBookingColumns } from "@/components/booking/my-booking-columns";
import { useMyBookings } from "@/hooks/useBookings";
import { useBookingFilters } from "@/hooks/useBookingFilters";

function MyBookings(): JSX.Element {
  const { filters } = useBookingFilters();
  const columns = useMyBookingColumns();
  const { data, isLoading } = useMyBookings(filters);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">My Bookings</h1>

      <BookingFilters />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="You have not made any bookings yet."
        pageCount={data?.meta.totalPages ?? 1}
        pageIndex={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 10}
      />

      <BookingPagination meta={data?.meta} />
    </div>
  );
}

export default MyBookings;
```

---

## 25.14 Owner "Booking Requests" Page (DataTable + Confirm/Cancel Actions)

The owner view uses the **same `<DataTable>`** with different columns. The key addition is a row action component for confirm / cancel, wrapped in shadcn `AlertDialog` confirmations so an accidental click cannot cancel a booking:

```tsx
// booking-frontend/src/components/booking/owner-row-actions.tsx
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUpdateBookingStatus } from "@/hooks/useBookings";
import type { Booking } from "@/types/booking";

interface Props {
  booking: Booking;
}

export function OwnerBookingActions({ booking }: Props) {
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();

  // Only pending bookings have actions
  if (booking.status !== "pending") return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Confirm */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" disabled={isPending}>
            <Check className="h-3 w-3 mr-1" /> Confirm
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              {booking.user.name} will be notified that their booking for "
              {booking.room.title}" is confirmed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatus({ id: booking._id, status: "confirmed" })
              }
            >
              Confirm booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={isPending}>
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will release the dates ({" "}
              {new Date(booking.checkIn).toLocaleDateString("en-GB")} &rarr;{" "}
              {new Date(booking.checkOut).toLocaleDateString("en-GB")}) for other
              guests to book.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatus({ id: booking._id, status: "cancelled" })
              }
            >
              Cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

### Owner Columns

```tsx
// booking-frontend/src/components/booking/owner-booking-columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { OwnerBookingActions } from "./owner-row-actions";
import type { Booking, BookingStatus } from "@/types/booking";

const statusVariant: Record<BookingStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function useOwnerBookingColumns(): ColumnDef<Booking>[] {
  return [
    {
      id: "guest",
      header: "Guest",
      cell: ({ row }) => (
        <div>
          <p className="font-medium leading-tight">{row.original.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.user.email}
          </p>
        </div>
      ),
    },
    {
      id: "room",
      header: "Room",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.room.title}</span>
      ),
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(row.original.checkIn)} &rarr;{" "}
          {formatDate(row.original.checkOut)}
        </span>
      ),
    },
    {
      accessorKey: "guests",
      header: "Guests",
      cell: ({ row }) => row.original.guests,
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold">&pound;{row.original.totalPrice}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={statusVariant[row.original.status]}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <OwnerBookingActions booking={row.original} />,
    },
  ];
}
```

### The Owner Page

```tsx
// booking-frontend/src/pages/owner/OwnerBookings.tsx
import { DataTable } from "@/components/ui/data-table";
import { BookingFilters } from "@/components/booking/booking-filters";
import { BookingPagination } from "@/components/booking/booking-pagination";
import { useOwnerBookingColumns } from "@/components/booking/owner-booking-columns";
import { useOwnerBookings } from "@/hooks/useBookings";
import { useBookingFilters } from "@/hooks/useBookingFilters";

function OwnerBookings(): JSX.Element {
  const { filters } = useBookingFilters();
  const columns = useOwnerBookingColumns();
  const { data, isLoading } = useOwnerBookings(filters);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Booking Requests</h1>

      <BookingFilters />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No booking requests yet."
        pageCount={data?.meta.totalPages ?? 1}
        pageIndex={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 10}
      />

      <BookingPagination meta={data?.meta} />
    </div>
  );
}

export default OwnerBookings;
```

The page is almost identical to "My Bookings". That is the whole point of the reusable `<DataTable>` -- swap columns and the hook, keep everything else.

---

## 25.15 Adding the Booking Routes to the Frontend

```tsx
// booking-frontend/src/App.tsx (additional routes)
import MyBookings from "./pages/MyBookings";
import OwnerBookings from "./pages/owner/OwnerBookings";

<Routes>
  {/* Public routes */}
  <Route path="/" element={<Home />} />
  <Route path="/rooms" element={<RoomListing />} />
  <Route path="/rooms/:id" element={<RoomDetail />} />

  {/* Guest routes (authenticated) */}
  <Route path="/bookings" element={<MyBookings />} />

  {/* Owner routes */}
  <Route path="/owner" element={<OwnerLayout />}>
    <Route path="rooms" element={<MyRooms />} />
    <Route path="rooms/new" element={<AddRoom />} />
    <Route path="rooms/:id/edit" element={<EditRoom />} />
    <Route path="bookings" element={<OwnerBookings />} />
  </Route>
</Routes>
```

---

## 25.16 Integrating the Booking Form into Room Detail

Replace the static "Book Now" card from Lesson 24 with the interactive booking form:

```tsx
// booking-frontend/src/pages/RoomDetail.tsx (update the booking card section)
import BookingForm from "@/components/booking/BookingForm";

// In the grid, replace the static Card with:
<div>
  <BookingForm room={room} />
</div>
```

---

## 25.17 Complete File Summary

```
Backend (booking-backend/src/):
├── controllers/
│   └── bookingController.ts     # asyncHandler-wrapped, returns { data } / { data, meta }
├── middleware/
│   ├── asyncHandler.ts          # from Lesson 20
│   ├── auth.ts                  # from Lesson 20
│   └── validate-result.middleware.ts   # from Lesson 16
├── validators/
│   └── booking.validator.ts     # express-validator chains
├── models/
│   └── Booking.ts               # Schema + paymentMethod enum
├── routes/
│   └── bookingRoutes.ts         # validator -> validateResult -> controller
└── index.ts                     # register /api/bookings + global error handler

Frontend (booking-frontend/src/):
├── components/
│   └── booking/
│       ├── BookingForm.tsx                # shadcn Form + Zod + price preview
│       ├── booking-filters.tsx            # URL-driven status filter
│       ├── booking-pagination.tsx         # shared pagination bar
│       ├── my-booking-columns.tsx         # ColumnDef[] for guest view
│       ├── owner-booking-columns.tsx      # ColumnDef[] for owner view
│       └── owner-row-actions.tsx          # Confirm/Cancel with AlertDialog
├── pages/
│   ├── MyBookings.tsx                     # Guest's bookings (DataTable)
│   └── owner/
│       └── OwnerBookings.tsx              # Owner's bookings (DataTable)
├── hooks/
│   ├── useBookings.ts                     # query keys + one hook per action + toasts
│   └── useBookingFilters.ts               # URL <-> filter state sync
├── schemas/
│   └── bookingSchema.ts                   # Zod schema + z.infer type
├── services/
│   └── bookingApi.ts                      # axios + unwraps { data } / { data, meta }
└── types/
    └── booking.ts                         # Booking, BookingFilters, BookingsResponse
```

---

## Practice Exercises

### Exercise 1: Backend with express-validator and asyncHandler
1. Create the Booking model including the `paymentMethod` enum
2. Build the validator file with `createBookingValidator`, `updateBookingStatusValidator`, `listBookingsValidator`
3. Implement `createBooking`, `getMyBookings`, `getOwnerBookings`, `updateBookingStatus` -- all wrapped in `asyncHandler`, all returning `{ data }` or `{ data, meta }`
4. Wire each route as `validator -> validateResult -> controller`
5. Test that:
   - Missing fields return a 400 with a structured `details` array (not a generic message)
   - Conflicting dates return a 409
   - `GET /api/bookings/my?status=pending&page=2&limit=5` paginates correctly

### Exercise 2: React Query Hooks + Toasts
1. Build `bookingApi.ts` so it unwraps the response envelopes
2. Create `hooks/useBookings.ts` with the `bookingKeys` factory and `useMyBookings`, `useOwnerBookings`, `useCreateBooking`, `useUpdateBookingStatus`
3. Every mutation should show a Sonner toast on success and on failure
4. Verify `useUpdateBookingStatus` invalidates `bookingKeys.all` so the same booking updates in both the guest and owner views

### Exercise 3: shadcn Form Booking Creation
1. Add the schema in `schemas/bookingSchema.ts` with the `refine` rule for check-out > check-in
2. Build the BookingForm using `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`
3. Add the real-time price preview using `form.watch()`
4. Submit a booking and confirm the toast appears and you are redirected to `/bookings`
5. Try an invalid range (check-out before check-in) -- the error must appear under `checkOut`

### Exercise 4: DataTable Views with URL Filters
1. Implement `useBookingFilters` reading `status`, `page`, `limit` from the URL
2. Build `useMyBookingColumns()` and `useOwnerBookingColumns()` returning `ColumnDef<Booking>[]`
3. Wire both pages to `<DataTable>` with `manualPagination` and `pageCount = data?.meta.totalPages`
4. Confirm that:
   - The status filter updates the URL and resets to page 1
   - The pagination buttons disable correctly at the edges
   - Refreshing the page keeps your filters

### Exercise 5: Confirm / Cancel Flow
1. Add `OwnerBookingActions` with two `AlertDialog` confirmations (Confirm / Cancel)
2. As a guest, cancel a pending booking from "My Bookings"
3. As the owner, confirm the same booking type from "Booking Requests" -- it should move out of the pending list
4. Try to cancel a `confirmed` booking from the guest view -- the action button should not appear

### Exercise 6: Edge Cases
1. Book 0 nights (same check-in and check-out) -- Zod `refine` rejects it
2. Guest count above the room's capacity -- backend returns 400
3. Cancel a confirmed booking, then book the same dates again -- second booking succeeds
4. Try `POST /api/bookings` without a `paymentMethod` -- validator returns 400 with `"Payment method is required"`

---

## Key Takeaways
1. **`express-validator`** enforces input shape and types *before* the controller -- no manual `if (!field)` checks
2. **`asyncHandler`** wraps every controller so errors bubble to the global handler -- no `try/catch` boilerplate
3. The API uses a **single response envelope**: `{ data }` for single resources, `{ data, meta }` for paginated lists -- never `{ success: true, ... }`
4. **`Promise.all([find, countDocuments])`** runs the page query and the total count in parallel for fewer round trips
5. **Date conflict detection** uses one elegant query: `checkIn < newCheckOut AND checkOut > newCheckIn`, excluding `cancelled`
6. **`populate`** inlines room and user data so the frontend can render rich rows without extra requests
7. **`bookingApi` + a query keys factory** keep React Query caches predictable and invalidations type-safe
8. **One hook per action** (`useCreateBooking`, `useUpdateBookingStatus`, ...) keeps re-renders local and toasts consistent
9. The booking form uses the **shadcn `Form` family** (`Form` / `FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormMessage`) -- the same accessible pattern as auth and room forms
10. **`form.watch()` + `useMemo`** drive the real-time price preview without extra state
11. **Zod `refine`** handles cross-field rules (check-out must be after check-in) that single-field rules cannot
12. The **generic `<DataTable>`** from Lesson 17.1 is reused for both "My Bookings" and "Booking Requests" -- swap columns and a hook, keep everything else
13. **`useBookingFilters`** stores status/page/limit in the URL so views are bookmarkable, shareable, and refresh-proof
14. **`AlertDialog` confirmations** prevent accidental confirm/cancel actions on the owner side
15. **Sonner toasts in every mutation** mean the user always knows whether their action succeeded or failed
