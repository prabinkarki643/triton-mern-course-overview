// src/pages/OwnerDashboardPage.tsx
// Matches Lesson 27 §27.4 Step 6. Stats + recent bookings table.
// Everything is driven by hooks -- no useState, no useEffect, no
// raw fetch. The OwnerLayout shell already provides p-4 sm:p-6 around
// its <Outlet />, so this page does not need its own outer padding.
import { CalendarCheck, Clock, Home, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatsCard } from "@/components/dashboard/stats-card";
import { recentBookingsColumns } from "@/components/dashboard/recent-bookings-columns";
import {
  useOwnerRecentBookings,
  useOwnerStats,
} from "@/hooks/useDashboard";
import { useCurrentUser } from "@/hooks/useAuth";

export function OwnerDashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: stats, isLoading: statsLoading } = useOwnerStats();
  const { data: recentBookings, isLoading: bookingsLoading } =
    useOwnerRecentBookings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Owner Dashboard</h1>
        {user && (
          <p className="text-muted-foreground text-sm">
            Welcome back, {user.name}.
          </p>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Rooms"
          value={stats?.totalRooms ?? 0}
          icon={<Home className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={<CalendarCheck className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Revenue"
          value={`Rs ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Pending Bookings"
          value={stats?.pendingBookings ?? 0}
          icon={<Clock className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
      </div>

      {/* Recent bookings snapshot -- no pagination controls needed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={recentBookingsColumns}
            data={recentBookings ?? []}
            isLoading={bookingsLoading}
            emptyMessage="No bookings yet."
            pageCount={1}
            pageIndex={0}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
