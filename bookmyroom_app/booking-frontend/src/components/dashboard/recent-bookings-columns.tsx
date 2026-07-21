// src/components/dashboard/recent-bookings-columns.tsx
// Matches Lesson 27 §27.4 Step 4. Columns for the "Recent Bookings"
// snapshot on the owner dashboard. Style mirrors owner-booking-columns
// so the two tables feel like siblings.
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { DashboardBooking } from "@/types/dashboard";

const statusVariant: Record<
  DashboardBooking["status"],
  "default" | "secondary" | "destructive"
> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

const paymentVariant: Record<
  DashboardBooking["paymentStatus"],
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

export const recentBookingsColumns: ColumnDef<DashboardBooking>[] = [
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
    cell: ({ row }) => row.original.room.title,
  },
  {
    id: "dates",
    header: "Dates",
    cell: ({ row }) =>
      `${formatDate(row.original.checkIn)} → ${formatDate(row.original.checkOut)}`,
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
    cell: ({ row }) => (
      <Badge
        variant={paymentVariant[row.original.paymentStatus]}
        className="capitalize"
      >
        {row.original.paymentStatus}
      </Badge>
    ),
  },
  {
    accessorKey: "totalPrice",
    header: "Total",
    cell: ({ row }) => `Rs ${row.original.totalPrice.toLocaleString()}`,
  },
];
