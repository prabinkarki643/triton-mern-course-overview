// src/components/booking/owner-booking-columns.tsx
// Matches Lesson 25 section 25.14. Columns for the owner's "Booking Requests" view.
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { OwnerBookingActions } from "./owner-row-actions";
import type {
  Booking,
  BookingStatus,
  PaymentStatus,
} from "@/types/booking";

const statusVariant: Record<
  BookingStatus,
  "default" | "secondary" | "destructive"
> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

const paymentVariant: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive"
> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function useOwnerBookingColumns(): ColumnDef<Booking>[] {
  return [
    {
      id: "guest",
      header: "Guest",
      cell: ({ row }) => (
        <div>
          <p className="font-medium leading-tight">{row.original.user.name}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.user.email}
          </p>
        </div>
      ),
    },
    {
      id: "room",
      header: "Room",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.room.title}</span>
      ),
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
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const label =
          row.original.paymentMethod === "esewa" ? "eSewa" : "Cash";
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge
              variant={paymentVariant[row.original.paymentStatus]}
              className="capitalize"
            >
              {row.original.paymentStatus}
            </Badge>
            <span className="text-muted-foreground text-xs">{label}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <OwnerBookingActions booking={row.original} />,
    },
  ];
}
