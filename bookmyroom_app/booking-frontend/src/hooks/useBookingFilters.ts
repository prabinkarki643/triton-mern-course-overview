// src/hooks/useBookingFilters.ts
// Matches Lesson 25 section 25.11. URL-driven filter state -- refresh-proof,
// bookmarkable, shareable.
import { useSearchParams } from "react-router-dom";
import type { BookingFilters, BookingStatus } from "@/types/booking";

export function useBookingFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: BookingFilters = {
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
    status: (searchParams.get("status") as BookingStatus) || undefined,
  };

  const setFilters = (updates: Partial<BookingFilters>): void => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "" || value === null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    setSearchParams(next, { replace: true });
  };

  const setFilter = <K extends keyof BookingFilters>(
    key: K,
    value: BookingFilters[K]
  ): void => {
    // Reset to page 1 whenever a filter (not the page itself) changes.
    setFilters({ [key]: value, page: 1 } as Partial<BookingFilters>);
  };

  const resetFilters = (): void => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return { filters, setFilters, setFilter, resetFilters };
}
