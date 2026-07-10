// src/components/rooms/room-pagination.tsx
// Matches Lesson 24 section 24.8. Prev/next + "Showing X-Y of Z" footer.
// The page number lives in the URL, so this card is bookmarkable.
import { Button } from "@/components/ui/button";
import { useRoomFilters } from "@/hooks/useRoomFilters";
import type { PaginationMeta } from "@/types/room";

interface RoomPaginationProps {
  meta?: PaginationMeta;
}

export function RoomPagination({ meta }: RoomPaginationProps) {
  const { filters, setFilters } = useRoomFilters();

  if (!meta || meta.total === 0) return null;

  const limit = filters.limit ?? 12;
  const start = (meta.page - 1) * limit + 1;
  const end = Math.min(meta.page * limit, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
      <p className="text-muted-foreground text-sm">
        Showing {start}-{end} of {meta.total} rooms
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasPrevPage}
          onClick={() => setFilters({ page: meta.page - 1 })}
        >
          Previous
        </Button>
        <span className="text-muted-foreground px-2 text-sm">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => setFilters({ page: meta.page + 1 })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
