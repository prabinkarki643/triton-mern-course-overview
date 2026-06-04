import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, XCircle, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { bookings, type Booking } from "@/lib/mock-data";

function statusVariant(status: Booking["status"]) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "cancelled":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function OwnerBookingsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        search.length === 0 ||
        b.guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.roomTitle.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "guestName",
      header: "Guest",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.guestName}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {row.original.guests} guest{row.original.guests > 1 ? "s" : ""}
          </p>
        </div>
      ),
    },
    {
      id: "room",
      header: "Room",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <img
            src={row.original.roomImage}
            alt={row.original.roomTitle}
            className="size-9 shrink-0 rounded-md object-cover"
          />
          <span className="line-clamp-1 max-w-[200px] text-sm">
            {row.original.roomTitle}
          </span>
        </div>
      ),
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.checkIn)} - {formatDate(row.original.checkOut)}
        </span>
      ),
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-medium">
          Rs. {row.original.totalPrice.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={`${statusVariant(row.original.status)} border-0 capitalize`}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) =>
        row.original.status === "pending" ? (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle className="size-3.5" />
              Confirm
            </Button>
            <Button variant="destructive" size="sm">
              <XCircle className="size-3.5" />
              Cancel
            </Button>
          </div>
        ) : (
          <span className="flex justify-end text-xs text-muted-foreground">
            —
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Booking requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and respond to incoming booking requests
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        toolbarLeft={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bookings..."
                className="h-9 w-64 pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v ?? "all")}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}

export default OwnerBookingsPage;
