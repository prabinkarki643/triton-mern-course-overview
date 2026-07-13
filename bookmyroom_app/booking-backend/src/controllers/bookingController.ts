// src/controllers/bookingController.ts
// Matches Lesson 25 sections 25.4 + 25.4.1. Every handler wraps its DB
// work in an explicit try/catch, returns { data } / { data, meta }, and
// uses { message } on error responses so the frontend Axios interceptor
// can surface the friendly text via Sonner.
import { Request, Response } from "express";
import mongoose from "mongoose";
import Booking, { IBooking } from "../models/Booking";
import Room, { IRoom } from "../models/Room";
import User, { IUser } from "../models/User";
import {
  sendMail,
  bookingCreatedOwnerEmail,
  bookingStatusUpdatedGuestEmail,
} from "../services/mailService";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// POST /api/bookings -- guest creates a booking request
export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { room: roomId, checkIn, checkOut, guests, paymentMethod } = req.body;

    // Validators sanitised these to Date + number already.
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

    // Conflict detection: two ranges overlap iff each starts before the
    // other ends. Ignore cancelled bookings.
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
      paymentMethod,
    });

    const populated = await Booking.findById(booking._id)
      .populate("room", "title location price images owner")
      .populate("user", "name email");

    // Fire-and-forget owner notification. SMTP outage never fails the booking.
    void notifyOwnerOfNewBooking(populated).catch((err) => {
      console.error("Booking email notification failed:", err);
    });

    res.status(201).json({ data: populated });
  } catch (error: unknown) {
    console.error("createBooking error:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
};

async function notifyOwnerOfNewBooking(
  populated: IBooking | null
): Promise<void> {
  if (!populated) return;

  const room = populated.room as unknown as IRoom;
  const owner: IUser | null = await User.findById(room.owner);
  if (!owner) return;

  const guest = populated.user as unknown as { name: string; email: string };
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

// GET /api/bookings/:id -- fetch one booking (guest OR room owner)
// Anyone else gets a 404 so we don't leak existence.
export const getBookingById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("room", "title location price images owner")
      .populate("user", "name email");

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    const room = booking.room as unknown as IRoom;
    const guest = booking.user as unknown as { _id: mongoose.Types.ObjectId };
    const currentUserId = req.user!.userId;
    const isOwner = room.owner.toString() === currentUserId;
    const isGuest = guest._id.toString() === currentUserId;

    if (!isOwner && !isGuest) {
      // Same 404 for "not yours" as "not found" -- never confirm existence.
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    res.json({ data: booking });
  } catch (error: unknown) {
    console.error("getBookingById error:", error);
    res.status(500).json({ message: "Failed to fetch booking" });
  }
};

// GET /api/bookings/my -- paginated list of the current user's bookings
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

// GET /api/bookings/owner -- paginated incoming bookings for the owner's rooms
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

    const ownerRooms: IRoom[] = await Room.find({
      owner: req.user!.userId,
    }).select("_id");
    const roomIds: mongoose.Types.ObjectId[] = ownerRooms.map(
      (r) => r._id as mongoose.Types.ObjectId
    );

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

// PATCH /api/bookings/:id/status -- owner confirms/cancels, guest cancels own pending
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

    // Permissions
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
      .populate("room", "title location price images owner")
      .populate("user", "name email");

    // Notify the guest ONLY when the owner is the actor. A guest cancelling
    // their own pending booking already knows -- self-emails are noise.
    if (isOwner && !isGuest) {
      void notifyGuestOfStatusChange(updated, status).catch((err) => {
        console.error("Guest email notification failed:", err);
      });
    }

    res.json({ data: updated });
  } catch (error: unknown) {
    console.error("updateBookingStatus error:", error);
    res.status(500).json({ message: "Failed to update booking status" });
  }
};

async function notifyGuestOfStatusChange(
  updated: IBooking | null,
  status: "confirmed" | "cancelled"
): Promise<void> {
  if (!updated) return;

  const guest = updated.user as unknown as { name: string; email: string };
  const room = updated.room as unknown as IRoom;
  const owner: IUser | null = await User.findById(room.owner);

  const { subject, html } = bookingStatusUpdatedGuestEmail({
    guestName: guest.name,
    ownerName: owner?.name ?? "the host",
    roomTitle: room.title,
    checkIn: updated.checkIn,
    checkOut: updated.checkOut,
    status,
    bookingId: String(updated._id),
  });
  await sendMail({ to: guest.email, subject, html });
}
