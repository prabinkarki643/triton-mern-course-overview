// src/models/Booking.ts
// Matches Lesson 25 section 25.2. Only one payment method is supported in
// L25 (COD). Lesson 26 will widen the enum to ["cod", "esewa"] and add
// paymentStatus + transactionId sibling fields.
import mongoose, { Schema, Document } from "mongoose";

export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentMethod = "cod" | "esewa";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface IBooking extends Document {
  room: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  cancellationReason?: string;
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
      enum: ["cod", "esewa"],
      required: [true, "Payment method is required"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    transactionId: {
      type: String,
      default: undefined,
    },
    cancellationReason: {
      type: String,
      default: undefined,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;
