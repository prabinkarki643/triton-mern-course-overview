// src/pages/owner/OwnerBookings.tsx
// Matches Lesson 25 section 25.14. Owner view -- same DataTable as MyBookings,
// swapped columns + hook + row actions.
import { DataTable } from "@/components/ui/data-table";
import { BookingFilters } from "@/components/booking/booking-filters";
import { BookingPagination } from "@/components/booking/booking-pagination";
import { useOwnerBookingColumns } from "@/components/booking/owner-booking-columns";
import { useOwnerBookings } from "@/hooks/useBookings";
import { useBookingFilters } from "@/hooks/useBookingFilters";

function OwnerBookings() {
  const { filters } = useBookingFilters();
  const columns = useOwnerBookingColumns();
  const { data, isLoading } = useOwnerBookings(filters);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Booking Requests</h1>

      <BookingFilters />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No booking requests yet."
        pageCount={data?.meta.totalPages ?? 1}
        pageIndex={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 10}
      />

      <BookingPagination meta={data?.meta} />
    </div>
  );
}

export default OwnerBookings;
