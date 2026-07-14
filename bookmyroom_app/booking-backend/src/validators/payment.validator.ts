// src/validators/payment.validator.ts
// Matches Lesson 26 section 26.6. No verify validator -- the callbacks
// read their id from the signed field inside eSewa's payload, not from
// client input.
import { body } from "express-validator";

export const initiatePaymentValidator = [
  body("bookingId")
    .exists({ checkFalsy: true })
    .withMessage("Booking ID is required")
    .bail()
    .isMongoId()
    .withMessage("Valid booking ID required"),
];
