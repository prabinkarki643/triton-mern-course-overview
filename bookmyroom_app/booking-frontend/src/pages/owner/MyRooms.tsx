// src/pages/owner/MyRooms.tsx
// Matches Lesson 23 section 23.13. The orchestrator -- every piece
// (DataTable, columns, filters, pagination) is reusable.
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { RoomFilters } from "@/components/owner/room-filters";
import { RoomPagination } from "@/components/owner/room-pagination";
import { useRoomColumns } from "@/components/owner/room-columns";
import { useMyRooms } from "@/hooks/useRooms";
import { useRoomsFilters } from "@/hooks/useRoomsFilters";

function MyRooms() {
  const { filters } = useRoomsFilters();
  const columns = useRoomColumns();
  const { data, isLoading } = useMyRooms(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Rooms</h1>
        <Button asChild>
          <Link to="/owner/rooms/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Link>
        </Button>
      </div>

      <RoomFilters />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="You have no rooms matching these filters. Add your first room to get started."
        pageCount={data?.meta.totalPages ?? 1}
        pageIndex={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 10}
      />

      <RoomPagination meta={data?.meta} />
    </div>
  );
}

export default MyRooms;
