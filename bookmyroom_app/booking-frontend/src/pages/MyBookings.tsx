// src/pages/MyBookings.tsx
// Matches Lesson 25 section 25.13. Guest view -- reuses the shared DataTable
// so the page is just orchestration.
import { DataTable } from "@/components/ui/data-table";
import { BookingFilters } from "@/components/booking/booking-filters";
import { BookingPagination } from "@/components/booking/booking-pagination";
import { useMyBookingColumns } from "@/components/booking/my-booking-columns";
import { useMyBookings } from "@/hooks/useBookings";
import { useBookingFilters } from "@/hooks/useBookingFilters";

function MyBookings() {
  const { filters } = useBookingFilters();
  const columns = useMyBookingColumns();
  const { data, isLoading } = useMyBookings(filters);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">My Bookings</h1>

      <BookingFilters />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="You have not made any bookings yet."
        pageCount={data?.meta.totalPages ?? 1}
        pageIndex={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 10}
      />

      <BookingPagination meta={data?.meta} />
    </div>
  );
}

export default MyBookings;
