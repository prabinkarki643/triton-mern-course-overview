// src/components/owner/room-pagination.tsx
// Matches Lesson 23 section 23.12. Reads pagination state from the meta the
// server returned, writes changes back to the URL via useRoomsFilters.
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoomsFilters } from "@/hooks/useRoomsFilters";
import type { PaginationMeta } from "@/types/room";

interface RoomPaginationProps {
  meta?: PaginationMeta;
}

export function RoomPagination({ meta }: RoomPaginationProps) {
  const { filters, setFilters } = useRoomsFilters();

  if (!meta) return null;
  const { page, totalPages, total, hasNextPage, hasPrevPage } = meta;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-2">
      <div className="text-muted-foreground text-sm">
        Showing page {page} of {totalPages} ({total} total)
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Rows per page</span>
        <Select
          value={String(filters.limit ?? 10)}
          onValueChange={(v) => setFilters({ limit: Number(v), page: 1 })}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: 1 })}
            disabled={!hasPrevPage}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: page - 1 })}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: page + 1 })}
            disabled={!hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: totalPages })}
            disabled={!hasNextPage}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
