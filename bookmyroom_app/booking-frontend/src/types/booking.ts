// src/types/booking.ts
// Matches Lesson 25 section 25.8.
import type { PaginationMeta, Room } from "./room";

export type BookingStatus = "pending" | "confirmed" | "cancelled";
// Only "cod" for Lesson 25. Lesson 26 will widen this to `"cod" | "esewa"`.
export type PaymentMethod = "cod";

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
