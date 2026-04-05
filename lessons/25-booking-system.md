# Lesson 25: Booking System

## What You Will Learn
- Creating booking endpoints with date validation and conflict detection
- Detecting overlapping bookings with MongoDB date range queries
- Calculating total price from check-in/check-out dates
- Using Mongoose `populate` to include related data in responses
- Building a booking form with date inputs and price preview
- Displaying bookings with status badges for users and owners
- Implementing a booking status flow: pending, confirmed, cancelled

---

## 25.1 The Big Picture

The booking system connects guests to rooms. A guest selects dates and requests a booking. The room owner reviews and confirms or cancels it. Here is the complete flow:

```
Guest                         Express API                    MongoDB
  |                                |                            |
  |-- POST /api/bookings --------> |                            |
  |   { room, checkIn, checkOut }  |-- Check date conflicts --> |
  |                                |   (any overlapping         |
  |                                |    non-cancelled bookings?)|
  |                                |                            |
  |                                |-- No conflicts:            |
  |                                |   Calculate total price    |
  |                                |   Save booking (pending)   |
  |                                |                            |
  |<-- { booking: pending } -------|                            |
  |                                |                            |
Owner                              |                            |
  |-- PATCH /api/bookings/:id/     |                            |
  |   status { status: confirmed } |-- Update status ---------->|
  |                                |                            |
  |<-- { booking: confirmed } -----|                            |
```

### Status Flow

```
pending ──────> confirmed
   │
   └──────────> cancelled

confirmed ────> cancelled (owner can cancel a confirmed booking)
```

A booking starts as **pending** when the guest creates it. The owner then either **confirms** or **cancels** it. A confirmed booking can also be cancelled later.

---

## 25.2 The Booking Model

```typescript
// backend/src/models/Booking.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  room: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
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
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;
```

---

## 25.3 POST /api/bookings -- Create a Booking

This is the most complex endpoint. It must:
1. Validate that check-in is before check-out and both are in the future
2. Verify the room exists and the guest count does not exceed capacity
3. Check for conflicting bookings (overlapping dates)
4. Calculate the total price (number of nights multiplied by the room price)

```typescript
// backend/src/controllers/bookingController.ts
import { Request, Response } from "express";
import Booking, { IBooking } from "../models/Booking";
import Room, { IRoom } from "../models/Room";
import { AuthRequest } from "../middleware/auth";

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { room: roomId, checkIn, checkOut, guests } = req.body;

    const checkInDate: Date = new Date(checkIn);
    const checkOutDate: Date = new Date(checkOut);
    const now: Date = new Date();

    // Validation 1: Dates must be in the future
    if (checkInDate <= now) {
      res.status(400).json({
        success: false,
        error: "Check-in date must be in the future",
      });
      return;
    }

    // Validation 2: Check-out must be after check-in
    if (checkOutDate <= checkInDate) {
      res.status(400).json({
        success: false,
        error: "Check-out date must be after check-in date",
      });
      return;
    }

    // Validation 3: Room must exist
    const room: IRoom | null = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }

    // Validation 4: Guest count must not exceed room capacity
    if (guests > room.capacity) {
      res.status(400).json({
        success: false,
        error: `This room has a maximum capacity of ${room.capacity} guests`,
      });
      return;
    }

    // Validation 5: Check for date conflicts
    const conflictingBooking: IBooking | null = await Booking.findOne({
      room: roomId,
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
      status: { $ne: "cancelled" },
    });

    if (conflictingBooking) {
      res.status(409).json({
        success: false,
        error: "This room is already booked for the selected dates",
      });
      return;
    }

    // Calculate total price
    const millisecondsPerDay: number = 1000 * 60 * 60 * 24;
    const nights: number = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / millisecondsPerDay
    );
    const totalPrice: number = nights * room.price;

    // Create the booking
    const booking: IBooking = await Booking.create({
      room: roomId,
      user: req.user!._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalPrice,
      status: "pending",
    });

    // Populate room and user details in the response
    const populatedBooking = await Booking.findById(booking._id)
      .populate("room", "title location price images")
      .populate("user", "name email");

    res.status(201).json({ success: true, data: populatedBooking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create booking";
    res.status(400).json({ success: false, error: message });
  }
};
```

---

## 25.4 How Date Conflict Detection Works

This is the most important query in the booking system. It finds any existing booking that overlaps with the requested dates:

```typescript
const conflictingBooking = await Booking.findOne({
  room: roomId,
  checkIn: { $lt: checkOutDate },   // Existing check-in is BEFORE new check-out
  checkOut: { $gt: checkInDate },    // Existing check-out is AFTER new check-in
  status: { $ne: "cancelled" },      // Ignore cancelled bookings
});
```

**Why does this work?** Two date ranges overlap if and only if one starts before the other ends AND the other starts before the first ends. Let us visualise:

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

**`$ne: "cancelled"`** ensures we ignore cancelled bookings. If a previous booking for those dates was cancelled, the dates should be available again.

---

## 25.5 GET /api/bookings/my -- User's Bookings

A guest can view all their bookings with room details:

```typescript
// backend/src/controllers/bookingController.ts (continued)

export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings: IBooking[] = await Booking.find({ user: req.user!._id })
      .populate("room", "title location price images")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bookings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch bookings";
    res.status(500).json({ success: false, error: message });
  }
};
```

**`populate("room", "title location price images")`** replaces the room ObjectId with the actual room data. Without populate, you would only get:
```json
{ "room": "65abc123..." }
```

With populate, you get:
```json
{ "room": { "_id": "65abc123...", "title": "Spacious Meeting Room", "location": "London", "price": 75, "images": ["room1.jpg"] } }
```

---

## 25.6 GET /api/bookings/owner -- Owner's Incoming Bookings

Room owners need to see bookings made for their rooms:

```typescript
// backend/src/controllers/bookingController.ts (continued)

export const getOwnerBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // First, find all rooms owned by this user
    const ownerRooms: IRoom[] = await Room.find({ owner: req.user!._id });
    const roomIds: mongoose.Types.ObjectId[] = ownerRooms.map(
      (room: IRoom) => room._id as mongoose.Types.ObjectId
    );

    // Then find all bookings for those rooms
    const bookings: IBooking[] = await Booking.find({ room: { $in: roomIds } })
      .populate("room", "title location price images")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bookings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch bookings";
    res.status(500).json({ success: false, error: message });
  }
};
```

**`$in: roomIds`** matches any booking where the room field is one of the owner's room IDs. This is like saying "find bookings for room A, room B, or room C" in a single query.

---

## 25.7 PATCH /api/bookings/:id/status -- Confirm or Cancel

Only the room owner can change a booking's status:

```typescript
// backend/src/controllers/bookingController.ts (continued)

export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    // Validate the new status
    if (!["confirmed", "cancelled"].includes(status)) {
      res.status(400).json({
        success: false,
        error: "Status must be 'confirmed' or 'cancelled'",
      });
      return;
    }

    const booking: IBooking | null = await Booking.findById(req.params.id)
      .populate("room");

    if (!booking) {
      res.status(404).json({ success: false, error: "Booking not found" });
      return;
    }

    // Verify the current user owns the room
    const room = booking.room as unknown as IRoom;
    if (room.owner.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        success: false,
        error: "Only the room owner can update booking status",
      });
      return;
    }

    // Validate status transitions
    if (booking.status === "cancelled") {
      res.status(400).json({
        success: false,
        error: "Cannot update a cancelled booking",
      });
      return;
    }

    if (booking.status === "confirmed" && status === "confirmed") {
      res.status(400).json({
        success: false,
        error: "Booking is already confirmed",
      });
      return;
    }

    // Update status
    booking.status = status;
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate("room", "title location price images")
      .populate("user", "name email");

    res.json({ success: true, data: updatedBooking });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update booking";
    res.status(400).json({ success: false, error: message });
  }
};
```

---

## 25.8 Booking Routes

```typescript
// backend/src/routes/bookingRoutes.ts
import { Router } from "express";
import { protect } from "../middleware/auth";
import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  updateBookingStatus,
} from "../controllers/bookingController";

const router: Router = Router();

// All booking routes require authentication
router.post("/", protect, createBooking);
router.get("/my", protect, getMyBookings);
router.get("/owner", protect, getOwnerBookings);
router.patch("/:id/status", protect, updateBookingStatus);

export default router;
```

Register in the main app:

```typescript
// backend/src/index.ts
import bookingRoutes from "./routes/bookingRoutes";

app.use("/api/bookings", bookingRoutes);
```

---

## 25.9 Frontend Types for Bookings

```typescript
// webapp/src/types/booking.ts
import { Room } from "./room";

export interface Booking {
  _id: string;
  room: Room;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface BookingsResponse {
  success: boolean;
  data: Booking[];
}

export interface BookingResponse {
  success: boolean;
  data: Booking;
}
```

---

## 25.10 Booking API Service

```typescript
// webapp/src/services/bookingApi.ts
import api from "./api";
import {
  BookingsResponse,
  BookingResponse,
  CreateBookingData,
} from "@/types/booking";

export const bookingApi = {
  create: async (data: CreateBookingData): Promise<BookingResponse> => {
    const response = await api.post<BookingResponse>("/bookings", data);
    return response.data;
  },

  getMyBookings: async (): Promise<BookingsResponse> => {
    const response = await api.get<BookingsResponse>("/bookings/my");
    return response.data;
  },

  getOwnerBookings: async (): Promise<BookingsResponse> => {
    const response = await api.get<BookingsResponse>("/bookings/owner");
    return response.data;
  },

  updateStatus: async (
    id: string,
    status: "confirmed" | "cancelled"
  ): Promise<BookingResponse> => {
    const response = await api.patch<BookingResponse>(`/bookings/${id}/status`, {
      status,
    });
    return response.data;
  },
};
```

---

## 25.11 Booking Form on Room Detail Page

The booking form sits on the room detail page (from Lesson 24). It lets the guest pick dates, enter guest count, and see a price preview:

```tsx
// webapp/src/components/booking/BookingForm.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { bookingApi } from "@/services/bookingApi";
import { Room } from "@/types/room";

const bookingSchema = z.object({
  checkIn: z.string().min(1, "Check-in date is required"),
  checkOut: z.string().min(1, "Check-out date is required"),
  guests: z
    .number({ invalid_type_error: "Guest count is required" })
    .min(1, "At least 1 guest is required"),
}).refine(
  (data) => new Date(data.checkOut) > new Date(data.checkIn),
  { message: "Check-out must be after check-in", path: ["checkOut"] }
);

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  room: Room;
}

function BookingForm({ room }: BookingFormProps): JSX.Element {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      checkIn: "",
      checkOut: "",
      guests: 1,
    },
  });

  // Watch dates for price calculation
  const checkIn: string = watch("checkIn");
  const checkOut: string = watch("checkOut");

  // Calculate nights and total price
  const calculateNights = (): number => {
    if (!checkIn || !checkOut) return 0;
    const start: Date = new Date(checkIn);
    const end: Date = new Date(checkOut);
    if (end <= start) return 0;
    const millisecondsPerDay: number = 1000 * 60 * 60 * 24;
    return Math.ceil((end.getTime() - start.getTime()) / millisecondsPerDay);
  };

  const nights: number = calculateNights();
  const totalPrice: number = nights * room.price;

  // Today's date as minimum for date inputs
  const today: string = new Date().toISOString().split("T")[0];

  const bookingMutation = useMutation({
    mutationFn: (data: BookingFormValues) =>
      bookingApi.create({
        room: room._id,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
      }),
    onSuccess: () => {
      navigate("/bookings");
    },
    onError: (error: any) => {
      const message: string =
        error.response?.data?.error || "Failed to create booking";
      setServerError(message);
    },
  });

  const onSubmit = (data: BookingFormValues): void => {
    setServerError("");
    bookingMutation.mutate(data);
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-baseline gap-1">
          <span className="text-2xl">&pound;{room.price}</span>
          <span className="text-sm font-normal text-muted-foreground">/night</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Check-in date */}
          <div className="space-y-1">
            <Label htmlFor="checkIn">Check-in</Label>
            <Input id="checkIn" type="date" min={today} {...register("checkIn")} />
            {errors.checkIn && (
              <p className="text-xs text-destructive">{errors.checkIn.message}</p>
            )}
          </div>

          {/* Check-out date */}
          <div className="space-y-1">
            <Label htmlFor="checkOut">Check-out</Label>
            <Input
              id="checkOut"
              type="date"
              min={checkIn || today}
              {...register("checkOut")}
            />
            {errors.checkOut && (
              <p className="text-xs text-destructive">{errors.checkOut.message}</p>
            )}
          </div>

          {/* Guest count */}
          <div className="space-y-1">
            <Label htmlFor="guests">Guests</Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={room.capacity}
              {...register("guests", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Maximum {room.capacity} guests
            </p>
            {errors.guests && (
              <p className="text-xs text-destructive">{errors.guests.message}</p>
            )}
          </div>

          {/* Price preview */}
          {nights > 0 && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>
                    &pound;{room.price} &times; {nights} night{nights !== 1 ? "s" : ""}
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

          {/* Server error */}
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={bookingMutation.isPending}
          >
            {bookingMutation.isPending ? "Booking..." : "Book Now"}
          </Button>

          <p className="text-xs text-centre text-muted-foreground">
            Your booking will be sent to the owner for confirmation.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default BookingForm;
```

### How the Price Preview Works

We use `watch()` to observe the check-in and check-out date fields in real time. Every time either date changes, the component re-renders and recalculates:

```typescript
const nights: number = calculateNights();   // e.g., 3
const totalPrice: number = nights * room.price;  // e.g., 3 * 75 = 225
```

The user sees the breakdown immediately, before submitting the form.

### Zod `refine` for Cross-Field Validation

Standard Zod validation works on individual fields. But "check-out must be after check-in" depends on two fields. The `refine` method handles this:

```typescript
.refine(
  (data) => new Date(data.checkOut) > new Date(data.checkIn),
  { message: "Check-out must be after check-in", path: ["checkOut"] }
);
```

The `path: ["checkOut"]` tells React Hook Form to display the error under the check-out field.

---

## 25.12 My Bookings Page (Guest View)

Guests see their bookings with status badges:

```tsx
// webapp/src/pages/MyBookings.tsx
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bookingApi } from "@/services/bookingApi";
import { Booking, BookingsResponse } from "@/types/booking";
import { API_URL } from "@/services/api";

function MyBookings(): JSX.Element {
  const { data, isLoading } = useQuery<BookingsResponse>({
    queryKey: ["myBookings"],
    queryFn: bookingApi.getMyBookings,
  });

  const bookings: Booking[] = data?.data || [];
  const baseUrl: string = API_URL.replace("/api", "");

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-centre">Loading your bookings...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-centre text-muted-foreground py-8">
          You have not made any bookings yet.
        </p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: Booking) => (
            <Card key={booking._id}>
              <CardContent className="flex gap-4 p-4">
                {/* Room image thumbnail */}
                {booking.room.images?.length > 0 && (
                  <div className="w-24 h-24 shrink-0 overflow-hidden rounded-md">
                    <img
                      src={`${baseUrl}/uploads/rooms/${booking.room.images[0]}`}
                      alt={booking.room.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Booking details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{booking.room.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {booking.room.location}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>

                  <div className="mt-2 text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Check-in:</span>{" "}
                      {formatDate(booking.checkIn)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Check-out:</span>{" "}
                      {formatDate(booking.checkOut)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Guests:</span>{" "}
                      {booking.guests}
                    </p>
                    <p className="font-semibold">
                      Total: &pound;{booking.totalPrice}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable status badge component
function StatusBadge({ status }: { status: Booking["status"] }): JSX.Element {
  const variants: Record<Booking["status"], "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    confirmed: "default",
    cancelled: "destructive",
  };

  const labels: Record<Booking["status"], string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
  };

  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

// Format ISO date string to readable format
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export { StatusBadge, formatDate };
export default MyBookings;
```

**`toLocaleDateString("en-GB")`** formats dates in British style: "15 January 2024" rather than the American "January 15, 2024".

---

## 25.13 Owner Booking Requests Page

Room owners see incoming bookings and can confirm or cancel them:

```tsx
// webapp/src/pages/owner/OwnerBookings.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { bookingApi } from "@/services/bookingApi";
import { Booking, BookingsResponse } from "@/types/booking";
import { StatusBadge, formatDate } from "@/pages/MyBookings";

function OwnerBookings(): JSX.Element {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<BookingsResponse>({
    queryKey: ["ownerBookings"],
    queryFn: bookingApi.getOwnerBookings,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "confirmed" | "cancelled" }) =>
      bookingApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownerBookings"] });
    },
  });

  const bookings: Booking[] = data?.data || [];

  if (isLoading) {
    return <div className="text-muted-foreground py-8">Loading booking requests...</div>;
  }

  // Separate bookings by status for easier viewing
  const pendingBookings: Booking[] = bookings.filter(
    (b: Booking) => b.status === "pending"
  );
  const otherBookings: Booking[] = bookings.filter(
    (b: Booking) => b.status !== "pending"
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Booking Requests</h1>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground py-8">No booking requests yet.</p>
      ) : (
        <div className="space-y-8">
          {/* Pending bookings first */}
          {pendingBookings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">
                Pending Requests ({pendingBookings.length})
              </h2>
              <div className="space-y-4">
                {pendingBookings.map((booking: Booking) => (
                  <BookingRequestCard
                    key={booking._id}
                    booking={booking}
                    onConfirm={() =>
                      statusMutation.mutate({
                        id: booking._id,
                        status: "confirmed",
                      })
                    }
                    onCancel={() =>
                      statusMutation.mutate({
                        id: booking._id,
                        status: "cancelled",
                      })
                    }
                    isUpdating={statusMutation.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Confirmed and cancelled bookings */}
          {otherBookings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Previous Bookings</h2>
              <div className="space-y-4">
                {otherBookings.map((booking: Booking) => (
                  <BookingRequestCard
                    key={booking._id}
                    booking={booking}
                    isUpdating={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

interface BookingRequestCardProps {
  booking: Booking;
  onConfirm?: () => void;
  onCancel?: () => void;
  isUpdating: boolean;
}

function BookingRequestCard({
  booking,
  onConfirm,
  onCancel,
  isUpdating,
}: BookingRequestCardProps): JSX.Element {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold">{booking.room.title}</h3>
            <p className="text-sm text-muted-foreground">
              Booked by {booking.user.name} ({booking.user.email})
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground">Check-in</p>
            <p className="font-medium">{formatDate(booking.checkIn)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Check-out</p>
            <p className="font-medium">{formatDate(booking.checkOut)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Guests</p>
            <p className="font-medium">{booking.guests}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-semibold">&pound;{booking.totalPrice}</p>
          </div>
        </div>

        {/* Action buttons (only for pending bookings) */}
        {booking.status === "pending" && onConfirm && onCancel && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={isUpdating}
            >
              <Check className="h-3 w-3 mr-1" />
              {isUpdating ? "Updating..." : "Confirm"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onCancel}
              disabled={isUpdating}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OwnerBookings;
```

---

## 25.14 Adding Booking Routes to the Frontend

```tsx
// webapp/src/App.tsx (additional routes)
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

## 25.15 Integrating the Booking Form into Room Detail

Replace the static "Book Now" card from Lesson 24 with the interactive booking form:

```tsx
// webapp/src/pages/RoomDetail.tsx (update the booking card section)
import BookingForm from "@/components/booking/BookingForm";

// In the grid, replace the static Card with:
<div>
  <BookingForm room={room} />
</div>
```

---

## 25.16 Complete File Summary

```
Backend:
backend/src/
├── controllers/
│   └── bookingController.ts       # Create, list, update status
├── models/
│   └── Booking.ts                 # Schema with dates, status, totalPrice
├── routes/
│   └── bookingRoutes.ts           # POST, GET /my, GET /owner, PATCH status
└── index.ts                       # Register booking routes

Frontend:
webapp/src/
├── components/
│   └── booking/
│       └── BookingForm.tsx        # Date inputs, price preview, submit
├── pages/
│   ├── MyBookings.tsx             # Guest's booking list with status badges
│   └── owner/
│       └── OwnerBookings.tsx      # Owner's incoming requests with actions
├── services/
│   └── bookingApi.ts              # Booking API service layer
└── types/
    └── booking.ts                 # Booking interfaces
```

---

## Practice Exercises

### Exercise 1: Complete Backend
1. Create the Booking model with all fields and validation
2. Implement POST `/api/bookings` with all five validations (future dates, date order, room exists, capacity, conflicts)
3. Implement GET `/api/bookings/my` and GET `/api/bookings/owner` with `populate`
4. Implement PATCH `/api/bookings/:id/status` with ownership check and status transition validation
5. Test the conflict detection: create two bookings with overlapping dates for the same room -- the second should be rejected

### Exercise 2: Complete Frontend Booking Form
1. Build the BookingForm component with date inputs, guest count, and price preview
2. Test that the price calculation updates in real time as dates change
3. Test the Zod validation: try submitting with check-out before check-in
4. Test the server error display: try booking dates that conflict with an existing booking
5. Verify successful bookings redirect to the "My Bookings" page

### Exercise 3: Owner Booking Management
1. Build the OwnerBookings page with pending requests separated from past bookings
2. Test confirming a booking -- the status badge should change from "Pending" to "Confirmed"
3. Test cancelling a booking -- the status badge should change to "Cancelled"
4. Verify that after confirming or cancelling, the booking moves from "Pending Requests" to "Previous Bookings"

### Exercise 4: Edge Cases
Test these scenarios to ensure your system handles them correctly:
1. Try booking a room for 0 nights (same check-in and check-out date) -- should be rejected
2. Try booking with more guests than the room's capacity -- should show an error
3. Cancel a confirmed booking, then try booking the same dates again -- should succeed (cancelled bookings free up the dates)
4. Try to confirm an already cancelled booking -- should be rejected

---

## Key Takeaways
1. **Date conflict detection** uses a simple but powerful query: `checkIn < newCheckOut AND checkOut > newCheckIn` finds all overlapping ranges
2. **`$ne: "cancelled"`** excludes cancelled bookings from conflict checks, making those dates available again
3. **Total price calculation** happens on the server (`nights * room.price`) for security -- never trust client-calculated prices
4. **Mongoose `populate`** replaces ObjectId references with actual document data, avoiding multiple queries
5. **`$in: roomIds`** queries across multiple rooms in a single database call
6. **Status transitions** should be validated: a cancelled booking cannot be confirmed again
7. **Zod `refine`** handles cross-field validation (check-out must be after check-in) that single-field rules cannot express
8. **`watch()`** from React Hook Form enables real-time price preview without extra state management
9. **Status badges** (shadcn `Badge`) with colour variants communicate booking state at a glance
10. The **`useMutation` + `invalidateQueries`** pattern keeps the UI in sync after confirming or cancelling a booking
