# Lesson 25: Booking System

## What You Will Learn
- Designing a booking model with date ranges, a status flow, and a `paymentMethod` field seeded with a single option -- `"cod"` (Cash on Arrival). Lesson 26 will extend the enum to add `"esewa"` and introduce `paymentStatus` + `transactionId`.
- Validating booking input with **`express-validator`** (route layer) and Mongoose schema rules
- Writing controllers with explicit **`try/catch`** blocks (same pattern as Lesson 16) so the error path is obvious
- Returning a consistent **`{ data }` / `{ data, meta }` envelope** -- never `{ success: true, ... }`
- Detecting overlapping date ranges with a single MongoDB query
- Calculating total price on the server using check-in / check-out dates
- **Emailing the room owner** through the mail service from Lesson 21.1 as soon as a new booking arrives, so they can review it in their portal
- **Paginating** "My Bookings" and "Booking Requests" with `Promise.all([find, countDocuments])`
- Using Mongoose **`populate`** to inline room and user data on the response
- Building a typed **`bookingApi`** service layer + **React Query hooks** with a query keys factory
- A real-time price preview powered by `form.watch()`
- Building the booking creation form with the **shadcn `Field` family + Zod** (`Field` / `FieldLabel` / `FieldError` / `FieldDescription` / `FieldGroup`) driven by React Hook Form `Controller`
- Reusing the generic **`<DataTable>`** from Lesson 17.1 for "My Bookings" and the owner's "Booking Requests" view, complete with status filters, URL-driven pagination and row actions
- Wiring **Sonner toasts** into every mutation so users always know what happened

---

## 25.1 The Big Picture

The booking system connects guests to rooms. A guest picks dates, a guest count and a payment method, then sends a booking request. The API also emails the room owner so they know to head over to their Owner Portal and confirm (or cancel). Only one payment method is available in Lesson 25 -- **Cash on Arrival (`"cod"`)** -- so the client always sends `paymentMethod: "cod"`. Lesson 26 adds `"esewa"` alongside it (plus `paymentStatus` and `transactionId`), and the online gateway flow.

```
Guest                              Express API                       MongoDB
  |                                     |                                |
  |-- POST /api/bookings -------------> |                                |
  |   { room, checkIn, checkOut,        |-- express-validator ---------> |
  |     guests, paymentMethod: "cod" }  |   try/catch                    |
  |                                     |   Check date conflicts -->     |
  |                                     |   Calculate total price        |
  |                                     |   Save booking (pending) ----> |
  |                                     |                                |
  |                                     |-- sendMail(owner) -------> SMTP (Mailtrap)
  |                                     |   (best-effort; failure logs   |
  |                                     |    but doesn't fail the booking)|
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

// Only one method is supported in Lesson 25. Lesson 26 will extend this
// union to `"cod" | "esewa"` and add the gateway flow.
export type PaymentMethod = "cod";

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
      // Lesson 26 will grow this enum to ["cod", "esewa"] and add
      // paymentStatus + transactionId sibling fields.
      enum: ["cod"],
      required: [true, "Payment method is required"],
      default: "cod",
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;
```

We ship `paymentMethod` from the very first commit so the client / server contract is stable and Lesson 26 becomes a **one-line enum extension** plus the eSewa service, not a database migration. `default: "cod"` means the field is safe even if a client forgets to send it -- but the validator (next section) still asks for it explicitly.

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

  // Cash on Arrival is the only option in Lesson 25. Lesson 26 will
  // extend the enum here to ["cod", "esewa"] alongside the model.
  body("paymentMethod")
    .exists({ checkFalsy: true })
    .withMessage("Payment method is required")
    .bail()
    .isIn(["cod"])
    .withMessage("Payment method must be cod"),
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

`.toDate()` and `.toInt()` *sanitise* the value -- the controller receives a real `Date` and a real `number`, not strings. By the time the controller runs we already know that `room` is a valid Mongo ID, `checkIn`/`checkOut` parse to dates, `guests >= 1` and `paymentMethod === "cod"`.

The `validateResult` middleware from Lesson 16 turns any failures into a 400 with a structured `details` array -- no extra work needed.

---

## 25.4 The Booking Controller (try/catch + `{ data }`)

Controllers stay tight and focused: the validators have already done the input checking and each handler wraps its database work in **`try/catch`** -- exactly the same pattern we used for the Todo API in Lesson 16. Every successful response uses the **`{ data }`** envelope, and list endpoints add **`{ data, meta }`** for pagination -- exactly matching the rest of the API.

```ts
// backend/src/controllers/bookingController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import Booking, { IBooking } from "../models/Booking";
import Room, { IRoom } from "../models/Room";
import User, { IUser } from "../models/User";
import { sendMail, bookingCreatedOwnerEmail } from "../services/mailService";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// POST /api/bookings  -- guest creates a booking request
export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { room: roomId, checkIn, checkOut, guests, paymentMethod } = req.body;

    // Validation chain already guarantees these exist + correct types.
    // The remaining checks are business rules.

    const checkInDate: Date = checkIn;
    const checkOutDate: Date = checkOut;
    const now = new Date();

    if (checkInDate <= now) {
      res.status(400).json({ message: "Check-in date must be in the future" });
      return;
    }

    if (checkOutDate <= checkInDate) {
      res.status(400).json({ message: "Check-out must be after check-in" });
      return;
    }

    const room: IRoom | null = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (guests > room.capacity) {
      res.status(400).json({
        message: `This room has a maximum capacity of ${room.capacity} guests`,
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
        message: "This room is already booked for the selected dates",
      });
      return;
    }

    const nights: number = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / MS_PER_DAY
    );
    const totalPrice: number = nights * room.price;

    const booking: IBooking = await Booking.create({
      room: roomId,
      user: req.user!.userId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalPrice,
      status: "pending",
      paymentMethod, // "cod" only in L25; L26 adds "esewa"
    });

    const populated = await Booking.findById(booking._id)
      .populate("room", "title location price images owner")
      .populate("user", "name email");

    // Notify the owner. We use the mail service we built in Lesson 21.1.
    // Wrapped in its own try/catch so an SMTP hiccup does NOT fail the
    // booking -- from the guest's point of view the reservation is
    // recorded successfully; the notification is best-effort.
    void notifyOwnerOfNewBooking(populated).catch((err) => {
      console.error("Booking email notification failed:", err);
    });

    res.status(201).json({ data: populated });
  } catch (error: unknown) {
    console.error("createBooking error:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
};

// Sends the "new booking request" email to the room owner. Splits out of
// createBooking so the happy path stays skimmable and the mail lookup
// (which does a second DB read for the owner) doesn't slow the API response.
async function notifyOwnerOfNewBooking(
  populated: IBooking | null
): Promise<void> {
  if (!populated) return;

  // `populate("room", "... owner")` gave us the owner ObjectId, but not
  // the owner's email/name -- so we do a small lookup here.
  const room = populated.room as unknown as IRoom;
  const owner: IUser | null = await User.findById(room.owner);
  if (!owner) return;

  const guest = populated.user as unknown as {
    name: string;
    email: string;
  };
  const { subject, html } = bookingCreatedOwnerEmail({
    ownerName: owner.name,
    guestName: guest.name,
    guestEmail: guest.email,
    roomTitle: room.title,
    checkIn: populated.checkIn,
    checkOut: populated.checkOut,
    guests: populated.guests,
    totalPrice: populated.totalPrice,
    bookingId: String(populated._id),
  });
  await sendMail({ to: owner.email, subject, html });
}

// GET /api/bookings/my  -- paginated list of the current user's bookings
export const getMyBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, page, limit } = req.query as {
      status?: string;
      page?: number;
      limit?: number;
    };

    const filter: Record<string, unknown> = { user: req.user!.userId };
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
  } catch (error: unknown) {
    console.error("getMyBookings error:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

// GET /api/bookings/owner  -- paginated list of incoming bookings for the owner's rooms
export const getOwnerBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, page, limit } = req.query as {
      status?: string;
      page?: number;
      limit?: number;
    };

    // 1) Find every room owned by the current user
    const ownerRooms: IRoom[] = await Room.find({
      owner: req.user!.userId,
    }).select("_id");
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
  } catch (error: unknown) {
    console.error("getOwnerBookings error:", error);
    res.status(500).json({ message: "Failed to fetch booking requests" });
  }
};

// PATCH /api/bookings/:id/status  -- owner confirms/cancels, guest cancels own pending
export const updateBookingStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.body as { status: "confirmed" | "cancelled" };

    const booking = await Booking.findById(req.params.id).populate("room");
    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    const room = booking.room as unknown as IRoom;
    const currentUserId = req.user!.userId;
    const isOwner = room.owner.toString() === currentUserId;
    const isGuest = booking.user.toString() === currentUserId;

    // Permissions: owner can confirm or cancel. The guest may only cancel their
    // own booking while it is still pending.
    if (status === "confirmed" && !isOwner) {
      res
        .status(403)
        .json({ message: "Only the room owner can confirm a booking" });
      return;
    }

    if (status === "cancelled" && !isOwner && !isGuest) {
      res.status(403).json({
        message: "You do not have permission to cancel this booking",
      });
      return;
    }

    if (
      status === "cancelled" &&
      isGuest &&
      !isOwner &&
      booking.status !== "pending"
    ) {
      res.status(400).json({
        message: "Guests can only cancel a booking while it is still pending",
      });
      return;
    }

    // Status transition rules
    if (booking.status === "cancelled") {
      res.status(400).json({ message: "Cannot update a cancelled booking" });
      return;
    }
    if (booking.status === "confirmed" && status === "confirmed") {
      res.status(400).json({ message: "Booking is already confirmed" });
      return;
    }

    booking.status = status;
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate("room", "title location price images")
      .populate("user", "name email");

    res.json({ data: updated });
  } catch (error: unknown) {
    console.error("updateBookingStatus error:", error);
    res.status(500).json({ message: "Failed to update booking status" });
  }
};
```

**Things worth pointing out to students:**

- Every handler uses an explicit **`try/catch`** -- the same pattern as the Todo controller in Lesson 16. You can see exactly where errors are caught and what response goes back.
- Each `catch` logs the error and returns a **`{ message }`** response (matching the auth and rooms controllers). The frontend's Axios interceptor (`src/services/api.ts`) unwraps `error.response.data.message`, so a Sonner toast shows "This room is already booked for the selected dates" instead of "Request failed with status code 409".
- Early exits inside the `try` use `res.status(...).json(...); return;` so the rest of the block does not run.
- Every success response uses `{ data }` (single resource) or `{ data, meta }` (paginated list). No `{ success: true }` flag is ever returned -- the HTTP status code already signals success or failure.
- Validation has already run. We never write `if (!checkIn)` checks in the controller.
- We populate room and user so the frontend can render rich rows without a second request. Notice we ask for `owner` on the room's populate so the notification email helper can find the owner without an extra query.
- `req.user!.userId` is the id embedded in the JWT (see Lesson 20's `requireAuth` middleware). `req.user!._id` would be `undefined` -- watch for this if you paste code from other frameworks.
- The email is fired via `void notifyOwnerOfNewBooking(...).catch(...)` -- a **fire-and-forget** pattern with its own try/catch so a Mailtrap outage cannot fail the booking. The guest still gets a `201` even if the email never arrives; the failure is logged for the developer.

---

### 25.4.1 Extending `mailService` with a Booking Template

We already have a mail service from **Lesson 21.1** with a `sendMail` helper and an `otpEmail` template. We add one more named template alongside it -- same shape, same XSS-safe `escape()` helper -- so the booking controller stays out of MIME-body business:

```ts
// backend/src/services/mailService.ts   (append below otpEmail)

interface BookingCreatedOwnerParams {
  ownerName: string;
  guestName: string;
  guestEmail: string;
  roomTitle: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  bookingId: string;
}

export function bookingCreatedOwnerEmail(
  params: BookingCreatedOwnerParams
): { subject: string; html: string } {
  const subject = `New booking request for ${params.roomTitle}`;
  const fmt = (d: Date): string =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">You've got a new booking request</h2>
      <p>Hi ${escape(params.ownerName)},</p>
      <p>
        <strong>${escape(params.guestName)}</strong>
        (${escape(params.guestEmail)}) has requested to book
        <strong>${escape(params.roomTitle)}</strong>.
      </p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 6px 0; color:#666;">Check-in</td>
          <td style="padding: 6px 0;">${fmt(params.checkIn)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color:#666;">Check-out</td>
          <td style="padding: 6px 0;">${fmt(params.checkOut)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color:#666;">Guests</td>
          <td style="padding: 6px 0;">${params.guests}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color:#666;">Total (Rs)</td>
          <td style="padding: 6px 0;"><strong>Rs ${params.totalPrice}</strong></td>
        </tr>
      </table>
      <p>
        Please head to your Owner Portal to review and either confirm or reject
        the request. Booking id: <code>${params.bookingId}</code>.
      </p>
      <p style="color:#666; font-size: 13px;">Payment is Cash on Arrival for now -- Lesson 26 will add eSewa.</p>
    </div>
  `;
  return { subject, html };
}
```

Add the export in the same barrel of exports the OTP flow already uses. That is the entire integration -- the controller imports `sendMail` and `bookingCreatedOwnerEmail`, populates the room + guest, then fires the email inside a fire-and-forget wrapper.

**Why fire-and-forget?** Bookings must not fail because SMTP is slow or offline. If Mailtrap returns an error, we log it and move on. In production this would be a queued job (BullMQ, SQS...) so a burst of bookings doesn't back up the API; for our teaching stack, `void ...catch()` is honest and simple.

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
import { requireAuth } from "../middleware/auth";
import { validateResult } from "../middleware/validate";
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

router.post(
  "/",
  requireAuth,
  createBookingValidator,
  validateResult,
  createBooking
);
router.get(
  "/my",
  requireAuth,
  listBookingsValidator,
  validateResult,
  getMyBookings
);
router.get(
  "/owner",
  requireAuth,
  listBookingsValidator,
  validateResult,
  getOwnerBookings
);
router.patch(
  "/:id/status",
  requireAuth,
  updateBookingStatusValidator,
  validateResult,
  updateBookingStatus
);

export default router;
```

> The auth middleware is **`requireAuth`** (see Lesson 20). If you paste examples from other projects that use `protect`, you'll get a compile error -- rename it here.

Register the routes in the main app:

```ts
// backend/src/index.ts
import bookingRoutes from "./routes/bookingRoutes";

app.use("/api/bookings", bookingRoutes);
```

### Endpoint Summary

| Method | URL | Body / Query | Response | Description |
|--------|-----|--------------|----------|-------------|
| POST | `/api/bookings` | `{ room, checkIn, checkOut, guests, paymentMethod: "cod" }` | `{ data }` | Create a booking request (emails the owner) |
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
// Only "cod" for Lesson 25. Lesson 26 will widen this to `"cod" | "esewa"`.
export type PaymentMethod = "cod";

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

## 25.12 The Booking Form (shadcn `Field` + Zod)

The booking form sits on the room detail page (from Lesson 24). We use the new **shadcn `Field`** component family (`Field` / `FieldLabel` / `FieldError` / `FieldDescription` / `FieldGroup`) driven by React Hook Form's `Controller` -- the same accessible pattern from Lesson 12.

Install the field component if you have not already:

```bash
npx shadcn@latest add field
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
    // Only "cod" in Lesson 25; Lesson 26 will widen this enum.
    paymentMethod: z.enum(["cod"], {
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
import { Controller, useForm } from "react-hook-form";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
      paymentMethod: "cod",
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
          <span className="text-2xl">Rs{room.price}</span>
          <span className="text-sm font-normal text-muted-foreground">
            /night
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="checkIn"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Check-in</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="date"
                      min={today}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="checkOut"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Check-out</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="date"
                      min={checkIn || today}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="guests"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Guests</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    max={room.capacity}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Maximum {room.capacity} guests.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="paymentMethod"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Payment method</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Choose a payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Only Cash on Arrival for now. Lesson 26 adds
                          <SelectItem value="esewa">eSewa</SelectItem>
                          right here as its main frontend change. */}
                      <SelectItem value="cod">Cash on arrival</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          {/* Real-time price preview */}
          {nights > 0 && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>
                    Rs{room.price} &times; {nights} night
                    {nights !== 1 ? "s" : ""}
                  </span>
                  <span>Rs{totalPrice}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>Rs{totalPrice}</span>
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
      </CardContent>
    </Card>
  );
}

export default BookingForm;
```

### Why shadcn `Field`?

The shadcn `Field` family is a small set of layout primitives that pair perfectly with React Hook Form's `Controller`:

- `Controller` (from React Hook Form) connects each input to `form.control` and supplies `field` (value/onChange/name) and `fieldState` (invalid/error)
- `Field` is the wrapper element. We set `data-invalid={fieldState.invalid}` so styling reacts to errors
- `FieldLabel` is the accessible label -- pair it with the input via `htmlFor={field.name}` and `id={field.name}`
- `FieldDescription` renders helper text (e.g. "Maximum 4 guests")
- `FieldError errors={[fieldState.error]}` renders the validation message coming from Zod via React Hook Form
- `FieldGroup` groups several `Field`s together and gives them consistent spacing

It is the same pattern we apply to the auth forms in Lesson 21 and the room create/edit forms in Lesson 23 -- consistency makes the codebase predictable for students.

Every input also receives `aria-invalid={fieldState.invalid}` so screen readers announce the error state, matching the visual styling.

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
        <span className="font-semibold">Rs{row.original.totalPrice}</span>
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
        <span className="text-sm">
          {row.original.paymentMethod === "cod" ? "Cash on arrival" : "-"}
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
        <span className="font-semibold">Rs{row.original.totalPrice}</span>
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

The owner route tree was defined in Lesson 23 (§23.8.7). We keep that shape here -- the only new child route is `bookings`, which the L23 lesson already had as a placeholder page. Nothing else moves.

```tsx
// booking-frontend/src/App.tsx (additional routes)
import { Navigate, Route, Routes } from "react-router-dom";
import MyBookings from "./pages/MyBookings";
import OwnerBookings from "./pages/owner/OwnerBookings";

<Routes>
  {/* Public routes */}
  <Route path="/" element={<Home />} />
  <Route path="/rooms" element={<RoomListing />} />
  <Route path="/rooms/:id" element={<RoomDetail />} />

  {/* Guest routes (authenticated) */}
  <Route path="/bookings" element={<MyBookings />} />

  {/* Owner routes -- same shape as Lesson 23.8.7 */}
  <Route
    path="/owner"
    element={
      <ProtectedRoute requireRole="owner">
        <OwnerLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<OwnerDashboardPage />} />
    <Route path="rooms" element={<MyRooms />} />
    <Route path="rooms/new" element={<AddRoom />} />
    <Route path="rooms/:id/edit" element={<EditRoom />} />
    <Route path="bookings" element={<OwnerBookings />} />
  </Route>
</Routes>
```

> The `bookings` route now points at the real `OwnerBookings` page you build in section 25.14 -- previously it was a "Coming in Lesson 25" placeholder from L23.

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
│   └── bookingController.ts     # try/catch handlers, returns { data } / { data, meta }
├── middleware/
│   ├── auth.ts                  # requireAuth (from Lesson 20)
│   └── validate.ts              # validateResult (from Lesson 16)
├── validators/
│   └── booking.validator.ts     # express-validator chains
├── models/
│   └── Booking.ts               # Schema + paymentMethod enum (cod-only; L26 widens)
├── routes/
│   └── bookingRoutes.ts         # requireAuth -> validator -> validateResult -> controller
├── services/
│   └── mailService.ts           # + bookingCreatedOwnerEmail (extends the L21.1 mailer)
└── index.ts                     # register /api/bookings + global error handler

Frontend (booking-frontend/src/):
├── components/
│   └── booking/
│       ├── BookingForm.tsx                # shadcn Field + Controller + Zod + price preview
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

### Exercise 1: Backend with express-validator and try/catch controllers
1. Create the Booking model including the `paymentMethod` enum (`["cod"]` only for now)
2. Build the validator file with `createBookingValidator`, `updateBookingStatusValidator`, `listBookingsValidator`
3. Implement `createBooking`, `getMyBookings`, `getOwnerBookings`, `updateBookingStatus` -- each wrapped in its own `try/catch`, all returning `{ data }` or `{ data, meta }`
4. Wire each route as `requireAuth -> validator -> validateResult -> controller`
5. Extend `services/mailService.ts` with `bookingCreatedOwnerEmail` and call it from inside `createBooking` behind a `void ...catch()` wrapper
6. Test that:
   - Missing fields return a 400 with a structured `details` array (not a generic message)
   - Conflicting dates return a 409 whose `message` field carries the friendly string
   - `GET /api/bookings/my?status=pending&page=2&limit=5` paginates correctly
   - Creating a booking as a guest lands one message in the Mailtrap inbox addressed to the room's owner
   - Stopping Mailtrap (block the port) and creating a booking still returns `201` -- the failure only appears in the server log

### Exercise 2: React Query Hooks + Toasts
1. Build `bookingApi.ts` so it unwraps the response envelopes
2. Create `hooks/useBookings.ts` with the `bookingKeys` factory and `useMyBookings`, `useOwnerBookings`, `useCreateBooking`, `useUpdateBookingStatus`
3. Every mutation should show a Sonner toast on success and on failure
4. Verify `useUpdateBookingStatus` invalidates `bookingKeys.all` so the same booking updates in both the guest and owner views

### Exercise 3: shadcn Field Booking Creation
1. Add the schema in `schemas/bookingSchema.ts` with the `refine` rule for check-out > check-in
2. Build the BookingForm using `Controller` + `Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup`
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
5. Try `POST /api/bookings` with `paymentMethod: "esewa"` -- validator returns 400 (`"Payment method must be cod"`). Lesson 26 will change this.

---

## Key Takeaways
1. **`express-validator`** enforces input shape and types *before* the controller -- no manual `if (!field)` checks
2. Each controller uses an explicit **`try/catch`** (same pattern as Lesson 16) and the **global error handler** in `index.ts` is the safety net for anything that slips through
3. The API uses a **single response envelope**: `{ data }` for single resources, `{ data, meta }` for paginated lists -- never `{ success: true, ... }`
4. **`Promise.all([find, countDocuments])`** runs the page query and the total count in parallel for fewer round trips
5. **Date conflict detection** uses one elegant query: `checkIn < newCheckOut AND checkOut > newCheckIn`, excluding `cancelled`
6. **`populate`** inlines room and user data so the frontend can render rich rows without extra requests
7. **Owner email notification** is fired inside `createBooking` via `void notifyOwnerOfNewBooking(...).catch(logger)` -- fire-and-forget so an SMTP outage never fails a booking. The template lives in `services/mailService.ts` next to the OTP template from Lesson 21.1.
8. **`{ message }` shape for errors**, matching the auth and rooms controllers -- the frontend's Axios interceptor unwraps `error.response.data.message` into `error.message` so Sonner toasts read the friendly server text
9. **`paymentMethod`** ships in Lesson 25 with the single-option enum `["cod"]`. Lesson 26 widens it to `["cod", "esewa"]` and adds `paymentStatus` + `transactionId` -- widening an enum is a safe migration
10. **`bookingApi` + a query keys factory** keep React Query caches predictable and invalidations type-safe
11. **One hook per action** (`useCreateBooking`, `useUpdateBookingStatus`, ...) keeps re-renders local and toasts consistent
12. The booking form uses the **shadcn `Field` family** (`Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup`) driven by React Hook Form `Controller` -- the same accessible pattern as auth and room forms
13. **`form.watch()` + `useMemo`** drive the real-time price preview without extra state
14. **Zod `refine`** handles cross-field rules (check-out must be after check-in) that single-field rules cannot
15. The **generic `<DataTable>`** from Lesson 17.1 is reused for both "My Bookings" and "Booking Requests" -- swap columns and a hook, keep everything else
16. **`useBookingFilters`** stores status/page/limit in the URL so views are bookmarkable, shareable, and refresh-proof
17. **`AlertDialog` confirmations** prevent accidental confirm/cancel actions on the owner side
18. **Sonner toasts in every mutation** mean the user always knows whether their action succeeded or failed
