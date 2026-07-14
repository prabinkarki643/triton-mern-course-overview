// src/types/booking.ts
// Matches Lesson 25 section 25.8.
import type { PaginationMeta, Room } from "./room";

export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentMethod = "cod" | "esewa";
export type PaymentStatus = "pending" | "paid" | "failed";

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
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  cancellationReason?: string;
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
