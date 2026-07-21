// src/hooks/useDashboard.ts
// Matches Lesson 27 §27.4 Step 3. Query-keys factory + one hook per
// action, same pattern as todoKeys / bookingKeys from previous lessons.
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/services/dashboardApi";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  ownerStats: () => [...dashboardKeys.all, "owner", "stats"] as const,
  ownerRecent: () => [...dashboardKeys.all, "owner", "recent"] as const,
  userStats: () => [...dashboardKeys.all, "user", "stats"] as const,
};

export function useOwnerStats() {
  return useQuery({
    queryKey: dashboardKeys.ownerStats(),
    queryFn: () => dashboardApi.getOwnerStats(),
  });
}

export function useOwnerRecentBookings() {
  return useQuery({
    queryKey: dashboardKeys.ownerRecent(),
    queryFn: () => dashboardApi.getOwnerRecentBookings(),
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: dashboardKeys.userStats(),
    queryFn: () => dashboardApi.getUserStats(),
  });
}
