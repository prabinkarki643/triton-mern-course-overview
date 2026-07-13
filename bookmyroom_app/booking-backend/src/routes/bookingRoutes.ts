// src/routes/bookingRoutes.ts
// Matches Lesson 25 section 25.7.
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
