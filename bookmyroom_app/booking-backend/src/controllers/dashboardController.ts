// src/controllers/dashboardController.ts
// Matches Lesson 27 sections 27.2, 27.3, 27.5. Three endpoints:
//   GET /api/dashboard/owner/stats           -- role: owner
//   GET /api/dashboard/owner/recent-bookings -- role: owner
//   GET /api/dashboard/user/stats            -- any authenticated user
//
// All three use MongoDB aggregation to compute numbers in the database
// rather than pulling every row into Node and counting in JS. Every
// response follows the project's `{ data: ... }` envelope (or
// `{ message }` on error), same as every other controller in this app.
import { Request, Response } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking";
import Room from "../models/Room";

// GET /api/dashboard/owner/stats
export const getOwnerStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user!.userId);

    // Every room belonging to this owner. We match bookings against
    // this id list so a bad actor can't get another owner's numbers.
    const ownerRooms = await Room.find({ owner: ownerId }).select("_id");
    const ownerRoomIds = ownerRooms.map((room) => room._id);
    const totalRooms = ownerRooms.length;

    // Single pipeline computes every counter Mongo-side.
    const stats = await Booking.aggregate([
      { $match: { room: { $in: ownerRoomIds } } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          paidBookings: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] },
          },
        },
      },
    ]);

    // If the owner has no bookings yet, `stats` is []. Substitute zeros
    // so the client never has to null-check every field.
    const bookingStats = stats[0] ?? {
      totalBookings: 0,
      totalRevenue: 0,
      confirmedBookings: 0,
      pendingBookings: 0,
      paidBookings: 0,
    };

    res.json({
      data: {
        totalRooms,
        totalBookings: bookingStats.totalBookings,
        totalRevenue: bookingStats.totalRevenue,
        confirmedBookings: bookingStats.confirmedBookings,
        pendingBookings: bookingStats.pendingBookings,
        paidBookings: bookingStats.paidBookings,
      },
    });
  } catch (error: unknown) {
    console.error("getOwnerStats error:", error);
    res.status(500).json({ message: "Failed to load owner stats" });
  }
};

// GET /api/dashboard/owner/recent-bookings
export const getOwnerRecentBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user!.userId);

    const ownerRooms = await Room.find({ owner: ownerId }).select("_id");
    const ownerRoomIds = ownerRooms.map((room) => room._id);

    const recentBookings = await Booking.find({
      room: { $in: ownerRoomIds },
    })
      .populate("user", "name email")
      .populate("room", "title")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ data: recentBookings });
  } catch (error: unknown) {
    console.error("getOwnerRecentBookings error:", error);
    res.status(500).json({ message: "Failed to load recent bookings" });
  }
};

// GET /api/dashboard/user/stats
export const getUserStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const stats = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: "$totalPrice" },
          upcomingBookings: {
            // $$NOW is the aggregation-pipeline "now" -- avoids clock-skew
            // between Node and Mongo that a `new Date()` in JS would have.
            $sum: { $cond: [{ $gte: ["$checkIn", "$$NOW"] }, 1, 0] },
          },
        },
      },
    ]);

    const userStats = stats[0] ?? {
      totalBookings: 0,
      totalSpent: 0,
      upcomingBookings: 0,
    };

    res.json({
      data: {
        totalBookings: userStats.totalBookings,
        totalSpent: userStats.totalSpent,
        upcomingBookings: userStats.upcomingBookings,
      },
    });
  } catch (error: unknown) {
    console.error("getUserStats error:", error);
    res.status(500).json({ message: "Failed to load user stats" });
  }
};
