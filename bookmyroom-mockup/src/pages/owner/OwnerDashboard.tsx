import { Link } from "react-router-dom";
import {
  Home,
  Calendar,
  DollarSign,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rooms, bookings, type Booking } from "@/lib/mock-data";

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

function OwnerDashboard() {
  const totalRooms = rooms.length;
  const totalBookings = bookings.length;
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.totalPrice, 0);
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;

  const stats = [
    {
      label: "Total Rooms",
      value: totalRooms,
      icon: Home,
      change: "+2",
      colour: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50 dark:bg-blue-950",
      text: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Bookings",
      value: totalBookings,
      icon: Calendar,
      change: "+12%",
      colour: "from-violet-500 to-purple-600",
      bg: "bg-violet-50 dark:bg-violet-950",
      text: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Total Revenue",
      value: `Rs. ${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      change: "+24%",
      colour: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending Bookings",
      value: pendingBookings,
      icon: Clock,
      change: "Needs review",
      colour: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 dark:bg-amber-950",
      text: "text-amber-600 dark:text-amber-400",
    },
  ];

  const recent = bookings.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, Ram. Here is what is happening with your rooms today.
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
          render={<Link to="/owner/dashboard/rooms">View all rooms</Link>}
        />
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className={`flex size-10 items-center justify-center rounded-xl ${s.bg} ${s.text}`}>
                  <Icon className="size-5" />
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                  <TrendingUp className="size-3" />
                  {s.change}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold tracking-tight">
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent bookings */}
      <div className="rounded-2xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Recent bookings
            </h2>
            <p className="text-xs text-muted-foreground">
              Last 5 booking requests across all your rooms
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={
              <Link to="/owner/dashboard/bookings">
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            }
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Guest
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Room
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dates
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="pr-5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((b) => (
              <TableRow key={b._id}>
                <TableCell className="pl-5">
                  <p className="font-medium">{b.guestName}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.guests} guest{b.guests > 1 ? "s" : ""}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <img
                      src={b.roomImage}
                      alt={b.roomTitle}
                      className="size-9 rounded-md object-cover"
                    />
                    <span className="line-clamp-1 max-w-[200px] text-sm">
                      {b.roomTitle}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(b.checkIn)} - {formatDate(b.checkOut)}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${statusVariant(b.status)} border-0 capitalize`}
                  >
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell className="pr-5 text-right font-medium">
                  Rs. {b.totalPrice.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default OwnerDashboard;
