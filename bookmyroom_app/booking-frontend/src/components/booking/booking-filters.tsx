// src/components/booking/booking-filters.tsx
// Matches Lesson 25 section 25.13 (Filter Bar).
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookingFilters } from "@/hooks/useBookingFilters";
import type { BookingStatus } from "@/types/booking";

export function BookingFilters() {
  const { filters, setFilter, resetFilters } = useBookingFilters();
  const hasActive = !!filters.status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) =>
          setFilter("status", v === "all" ? undefined : (v as BookingStatus))
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="mr-1 h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
