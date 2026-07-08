// src/components/owner/room-filters.tsx
// Matches Lesson 23 section 23.11. Debounced search + Select-based status
// filter, all backed by useRoomsFilters (which owns the URL sync).
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoomsFilters } from "@/hooks/useRoomsFilters";

export function RoomFilters() {
  const { filters, setFilter, resetFilters } = useRoomsFilters();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  // Debounce: wait 300ms after the last keystroke before updating the URL
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== (filters.search ?? "")) {
        setFilter("search", searchInput || undefined);
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Sync back if the URL changes externally (e.g. Clear button)
  useEffect(() => {
    setSearchInput(filters.search ?? "");
  }, [filters.search]);

  const hasActiveFilters =
    !!filters.search || !!filters.location || !!filters.status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search by title or description..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="max-w-xs"
      />

      <Input
        placeholder="Location"
        value={filters.location ?? ""}
        onChange={(e) => setFilter("location", e.target.value || undefined)}
        className="max-w-[180px]"
      />

      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) =>
          setFilter(
            "status",
            v === "all" ? undefined : (v as "active" | "inactive")
          )
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="mr-1 h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
