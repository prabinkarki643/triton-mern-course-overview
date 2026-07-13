// src/routes/bookingRoutes.ts
// Matches Lesson 25 section 25.7.
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateResult } from "../middleware/validate";
import {
  createBooking,
  getBookingById,
  getMyBookings,
  getOwnerBookings,
  updateBookingStatus,
} from "../controllers/bookingController";
import {
  bookingIdValidator,
  createBookingValidator,
  listBookingsValidator,
  updateBookingStatusValidator,
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

// /:id must be AFTER /my and /owner so those literals aren't parsed as ids.
router.get(
  "/:id",
  requireAuth,
  bookingIdValidator,
  validateResult,
  getBookingById
);

export default router;
