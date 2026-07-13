// src/pages/MyBookings.tsx
// Guest view. Card list instead of a DataTable -- guests see a handful of
// bookings and the room's image + status at a glance beats a dense table.
// The whole card links to /bookings/:id where the Cancel action lives.
import BookingCard from "@/components/booking/BookingCard";
import BookingCardSkeleton from "@/components/booking/BookingCardSkeleton";
import { BookingFilters } from "@/components/booking/booking-filters";
import { BookingPagination } from "@/components/booking/booking-pagination";
import { useMyBookings } from "@/hooks/useBookings";
import { useBookingFilters } from "@/hooks/useBookingFilters";

function MyBookings() {
  const { filters } = useBookingFilters();
  const { data, isLoading, isFetching } = useMyBookings(filters);

  const bookings = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground text-sm">
          Tap any booking to see full details, contact the host, or cancel while
          it is still pending.
        </p>
      </div>

      <BookingFilters />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div
          className={`grid grid-cols-1 gap-4 transition-opacity md:grid-cols-2 ${
            isFetching ? "opacity-60" : "opacity-100"
          }`}
        >
          {bookings.map((booking) => (
            <BookingCard key={booking._id} booking={booking} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border py-16 text-center">
          <p className="mb-1 text-lg font-medium">No bookings yet</p>
          <p className="text-muted-foreground text-sm">
            Browse rooms and send a booking request -- the owner will confirm it.
          </p>
        </div>
      )}

      <BookingPagination meta={meta} />
    </div>
  );
}

export default MyBookings;
