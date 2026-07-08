// src/components/owner/room-columns.tsx
// Matches Lesson 23 section 23.9. Column definitions are DATA, not JSX.
// Each cell can be a plain string OR a full React node -- flexRender in the
// generic <DataTable> renders whatever we return.
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { RoomRowActions } from "./room-row-actions";
import type { Room } from "@/types/room";

// Helper: build the absolute image URL from the stored filename
const buildImageUrl = (filename: string): string => {
  const apiUrl: string =
    (import.meta.env.VITE_API_URL as string) || "http://localhost:4001/api";
  const base: string = apiUrl.replace(/\/api\/?$/, "");
  return `${base}/uploads/rooms/${filename}`;
};

export function useRoomColumns(): ColumnDef<Room>[] {
  return [
    {
      id: "image",
      header: "",
      cell: ({ row }) => {
        const first: string | undefined = row.original.images[0];
        return (
          <div className="bg-muted h-12 w-16 overflow-hidden rounded-md">
            {first ? (
              <img
                src={buildImageUrl(first)}
                alt={row.original.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
                No image
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <span>
          Rs. {row.original.price}
          <span className="text-muted-foreground text-xs"> / night</span>
        </span>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => `${row.original.capacity} guests`,
    },
    {
      id: "status",
      header: "Status",
      // Backend stores boolean isAvailable; we render it as an "active"/"inactive"
      // badge to match the design.
      cell: ({ row }) => {
        const active: boolean = row.original.isAvailable;
        return (
          <Badge variant={active ? "default" : "secondary"}>
            {active ? "active" : "inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <RoomRowActions room={row.original} />,
    },
  ];
}
