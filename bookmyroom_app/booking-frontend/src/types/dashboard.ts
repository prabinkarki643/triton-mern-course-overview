// src/types/dashboard.ts
// Matches Lesson 27 §27.4 Step 1. Everything the dashboard endpoints
// return, typed once so components, hooks and services all agree.

export interface OwnerStats {
  totalRooms: number;
  totalBookings: number;
  totalRevenue: number;
  confirmedBookings: number;
  pendingBookings: number;
  paidBookings: number;
}

export interface UserStats {
  totalBookings: number;
  totalSpent: number;
  upcomingBookings: number;
}

// Shape of the rows returned by /api/dashboard/owner/recent-bookings.
// Populated `user` and `room` fields are trimmed to what the table
// actually needs -- we don't want the full room document on every row.
export interface DashboardBooking {
  _id: string;
  user: { name: string; email: string };
  room: { title: string };
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod: "cod" | "esewa";
  createdAt: string;
}
