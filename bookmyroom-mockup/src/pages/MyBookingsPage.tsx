import { Link } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Users,
  XCircle,
  Wallet,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bookings, mockUser, type Booking } from "@/lib/mock-data";

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

function paymentVariant(status: Booking["paymentStatus"]) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "pending":
      return "bg-muted text-muted-foreground";
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MyBookingsPage() {
  const myBookings = bookings.filter((b) => b.guestName === mockUser.name);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          My bookings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your upcoming and past stays
        </p>
      </div>

      {myBookings.length === 0 ? (
        <div className="rounded-2xl bg-card p-12 text-center ring-1 ring-foreground/10">
          <p className="text-muted-foreground">You have no bookings yet.</p>
          <Button className="mt-4" render={<Link to="/">Browse rooms</Link>} />
        </div>
      ) : (
        <div className="space-y-4">
          {myBookings.map((b) => (
            <div
              key={b._id}
              className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
            >
              <div className="grid gap-4 p-4 sm:grid-cols-[180px_1fr_auto] sm:gap-6 sm:p-5">
                {/* Image */}
                <Link
                  to={`/rooms/${b.roomId}`}
                  className="block overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={b.roomImage}
                    alt={b.roomTitle}
                    className="aspect-[4/3] size-full object-cover transition-transform hover:scale-105 sm:aspect-square"
                  />
                </Link>

                {/* Details */}
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge
                      className={`${statusVariant(b.status)} border-0 capitalize`}
                    >
                      {b.status}
                    </Badge>
                    <Badge
                      className={`${paymentVariant(b.paymentStatus)} border-0 capitalize`}
                    >
                      <Wallet className="size-3" />
                      {b.paymentMethod.toUpperCase()} · {b.paymentStatus}
                    </Badge>
                  </div>

                  <Link
                    to={`/rooms/${b.roomId}`}
                    className="block font-heading text-lg font-semibold leading-tight hover:underline"
                  >
                    {b.roomTitle}
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      <span>
                        {formatDate(b.checkIn)} - {formatDate(b.checkOut)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      <span>
                        {b.guests} guest{b.guests > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      <span>Booking #{b._id.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-stretch justify-between gap-3 sm:items-end">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-heading text-xl font-bold">
                      Rs. {b.totalPrice.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Receipt className="size-3.5" />
                      Receipt
                    </Button>
                    {b.status === "pending" && (
                      <Button variant="destructive" size="sm">
                        <XCircle className="size-3.5" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyBookingsPage;
