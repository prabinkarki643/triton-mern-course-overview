import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2, Plus, Search, MapPin, Users } from "lucide-react";
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
import { rooms, type Room } from "@/lib/mock-data";

function OwnerRoomsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      const matchesSearch =
        search.length === 0 ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.location.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "available" && r.isAvailable) ||
        (statusFilter === "unavailable" && !r.isAvailable);
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const columns: ColumnDef<Room>[] = [
    {
      id: "room",
      header: "Room",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img
            src={row.original.images[0]}
            alt={row.original.title}
            className="size-12 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="line-clamp-1 font-medium">{row.original.title}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              <span className="line-clamp-1">{row.original.location}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            Rs. {row.original.price.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">per night</p>
        </div>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Users className="size-3.5 text-muted-foreground" />
          <span>{row.original.capacity}</span>
        </div>
      ),
    },
    {
      accessorKey: "isAvailable",
      header: "Status",
      cell: ({ row }) =>
        row.original.isAvailable ? (
          <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Available
          </Badge>
        ) : (
          <Badge className="border-0 bg-muted text-muted-foreground">
            Unavailable
          </Badge>
        ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: () => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm">
            <Edit className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            My rooms
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your listings, prices and availability
          </p>
        </div>
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
                placeholder="Search rooms..."
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
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        toolbarRight={
          <Button className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700">
            <Plus className="size-4" />
            Add room
          </Button>
        }
      />
    </div>
  );
}

export default OwnerRoomsPage;
