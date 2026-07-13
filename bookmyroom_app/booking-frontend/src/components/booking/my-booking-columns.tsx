// src/components/booking/my-booking-columns.tsx
// Matches Lesson 25 section 25.13. Columns for the guest's "My Bookings" view.
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdateBookingStatus } from "@/hooks/useBookings";
import { API_URL } from "@/services/api";
import type { Booking, BookingStatus } from "@/types/booking";

const statusVariant: Record<
  BookingStatus,
  "default" | "secondary" | "destructive"
> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function useMyBookingColumns(): ColumnDef<Booking>[] {
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();
  const baseUrl = API_URL.replace(/\/api\/?$/, "");

  return [
    {
      id: "room",
      header: "Room",
      cell: ({ row }) => {
        const { room } = row.original;
        return (
          <div className="flex items-center gap-3">
            {room.images?.[0] && (
              <img
                src={`${baseUrl}/uploads/rooms/${room.images[0]}`}
                alt={room.title}
                className="h-12 w-12 rounded-md object-cover"
              />
            )}
            <div>
              <p className="font-medium leading-tight">{room.title}</p>
              <p className="text-muted-foreground text-xs">{room.location}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(row.original.checkIn)} →{" "}
          {formatDate(row.original.checkOut)}
        </span>
      ),
    },
    {
      accessorKey: "guests",
      header: "Guests",
      cell: ({ row }) => row.original.guests,
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold">Rs{row.original.totalPrice}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={statusVariant[row.original.status]}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.paymentMethod === "cod" ? "Cash on arrival" : "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        // A guest may cancel their own booking only while it is still pending
        if (row.original.status !== "pending") return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() =>
              updateStatus({ id: row.original._id, status: "cancelled" })
            }
          >
            Cancel
          </Button>
        );
      },
    },
  ];
}
