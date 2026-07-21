// src/services/dashboardApi.ts
// Matches Lesson 27 §27.4 Step 2. Thin wrapper around the three
// /api/dashboard endpoints. Each method unwraps the `{ data: ... }`
// envelope at the service layer so hook consumers get clean typed
// objects.
import api from "./api";
import type {
  DashboardBooking,
  OwnerStats,
  UserStats,
} from "@/types/dashboard";

export const dashboardApi = {
  async getOwnerStats(): Promise<OwnerStats> {
    const { data } = await api.get<{ data: OwnerStats }>(
      "/dashboard/owner/stats"
    );
    return data.data;
  },

  async getOwnerRecentBookings(): Promise<DashboardBooking[]> {
    const { data } = await api.get<{ data: DashboardBooking[] }>(
      "/dashboard/owner/recent-bookings"
    );
    return data.data;
  },

  async getUserStats(): Promise<UserStats> {
    const { data } = await api.get<{ data: UserStats }>(
      "/dashboard/user/stats"
    );
    return data.data;
  },
};
