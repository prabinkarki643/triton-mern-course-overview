// src/validators/booking.validator.ts
// Matches Lesson 25 section 25.3. Sanitisers (.toDate, .toInt) so the
// controller receives real Date and number values, not strings.
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
    .isIn(["cod", "esewa"])
    .withMessage("Payment method must be cod or esewa"),
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

export const bookingIdValidator = [bookingIdParam];
