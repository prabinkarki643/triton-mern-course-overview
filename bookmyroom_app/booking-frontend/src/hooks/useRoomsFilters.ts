// src/hooks/useRoomsFilters.ts
// Matches Lesson 23 section 23.7. URL search params as the single source of
// truth for the My Rooms table filters + pagination.
import { useSearchParams } from "react-router-dom";
import type { RoomFilters, RoomStatus } from "@/types/room";

export function useRoomsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: RoomFilters = {
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 10,
    search: searchParams.get("search") || undefined,
    location: searchParams.get("location") || undefined,
    status: (searchParams.get("status") as RoomStatus) || undefined,
    sort: searchParams.get("sort") || undefined,
  };

  const setFilters = (updates: Partial<RoomFilters>) => {
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

  // Change a filter and reset to page 1 (otherwise you might land on an
  // empty page 5 after tightening the filter)
  const setFilter = <K extends keyof RoomFilters>(
    key: K,
    value: RoomFilters[K]
  ) => {
    setFilters({ [key]: value, page: 1 } as Partial<RoomFilters>);
  };

  const resetFilters = () =>
    setSearchParams(new URLSearchParams(), { replace: true });

  return { filters, setFilters, setFilter, resetFilters };
}
