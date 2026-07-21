// src/pages/UserDashboard.tsx
// Matches Lesson 27 §27.5. Stats via useUserStats + upcoming/past
// split by comparing booking.checkIn to Date.now() -- no new server
// endpoint. The shared <BookingCard> from L25 renders each row so the
// dashboard automatically inherits any styling change to that card.
import { useMemo } from "react";
import { CalendarCheck, Clock, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import BookingCard from "@/components/booking/BookingCard";
import { useMyBookings } from "@/hooks/useBookings";
import { useUserStats } from "@/hooks/useDashboard";

export function UserDashboard() {
  const { data: stats, isLoading: statsLoading } = useUserStats();

  // One request -- all my bookings. Client-side split is trivial and
  // saves us adding upcoming/past filters to the backend.
  const { data: bookingsResponse, isLoading: bookingsLoading } = useMyBookings({
    limit: 100,
  });
  const bookings = bookingsResponse?.data ?? [];

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: bookings.filter(
        (b) => new Date(b.checkIn).getTime() >= now
      ),
      past: bookings.filter((b) => new Date(b.checkIn).getTime() < now),
    };
  }, [bookings]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={<CalendarCheck className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Spent"
          value={`Rs ${(stats?.totalSpent ?? 0).toLocaleString()}`}
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Upcoming"
          value={stats?.upcomingBookings ?? 0}
          icon={<Clock className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No upcoming bookings.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {upcoming.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past */}
      <Card>
        <CardHeader>
          <CardTitle>Past bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : past.length === 0 ? (
            <p className="text-muted-foreground text-sm">No past bookings.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {past.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
