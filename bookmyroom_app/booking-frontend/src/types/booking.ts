// booking-frontend/src/types/booking.ts

import type { Room } from "./room";
import type { User } from "./user";

export interface Booking {
  _id: string;
  room: string | Room;
  user: string | User;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentMethod: "esewa" | "cod";
  paymentStatus: "pending" | "paid";
  esewaRefId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingData {
  room: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  paymentMethod: "esewa" | "cod";
}