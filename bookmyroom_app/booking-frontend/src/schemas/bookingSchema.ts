// src/schemas/bookingSchema.ts
// Matches Lesson 25 section 25.12. Cross-field rule (`checkOut > checkIn`)
// via `refine` since single-field Zod rules can't compare two values.
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
    paymentMethod: z.enum(["cod", "esewa"], {
      errorMap: () => ({ message: "Please select a payment method" }),
    }),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type BookingFormData = z.infer<typeof bookingSchema>;
