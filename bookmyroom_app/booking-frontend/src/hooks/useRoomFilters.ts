// src/hooks/useRoomFilters.ts
// Matches Lesson 24 section 24.6. The URL is the single source of truth
// for the public listing page's filters/search/pagination -- this hook
// hides the URLSearchParams juggling so the listing page never touches
// the URL directly.
import { useSearchParams } from "react-router-dom";
import type { RoomFilters } from "@/types/room";

export function useRoomFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: RoomFilters = {
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 12,
    search: searchParams.get("search") || undefined,
    location: searchParams.get("location") || undefined,
    minPrice: searchParams.get("minPrice")
      ? Number(searchParams.get("minPrice"))
      : undefined,
    maxPrice: searchParams.get("maxPrice")
      ? Number(searchParams.get("maxPrice"))
      : undefined,
    capacity: searchParams.get("capacity")
      ? Number(searchParams.get("capacity"))
      : undefined,
    amenities: searchParams.get("amenities")
      ? searchParams.get("amenities")!.split(",")
      : undefined,
  };

  const setFilters = (updates: Partial<RoomFilters>): void => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      if (
        value === undefined ||
        value === "" ||
        value === null ||
        (Array.isArray(value) && value.length === 0)
      ) {
        next.delete(key);
      } else if (Array.isArray(value)) {
        next.set(key, value.join(","));
      } else {
        next.set(key, String(value));
      }
    }

    setSearchParams(next, { replace: true });
  };

  // Changing a filter (not the page number) resets to page 1, otherwise
  // adjusting the location filter while on page 5 might land the user
  // on an empty page.
  const setFilter = <K extends keyof RoomFilters>(
    key: K,
    value: RoomFilters[K]
  ): void => {
    setFilters({ [key]: value, page: 1 } as Partial<RoomFilters>);
  };

  const resetFilters = (): void => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return { filters, setFilters, setFilter, resetFilters };
}
