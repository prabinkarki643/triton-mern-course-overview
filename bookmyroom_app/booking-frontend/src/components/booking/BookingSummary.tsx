// src/components/booking/BookingSummary.tsx
// Shared between BookingDetail (guest) and OwnerBookingDetail. Every field
// that both views show identically lives here -- only headers + actions
// differ on the wrapping page.
import { MapPin, Users, CalendarDays, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

function nightsBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

interface BookingSummaryProps {
  booking: Booking;
}

export function BookingSummary({ booking }: BookingSummaryProps) {
  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  const { room } = booking;
  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  return (
    <div className="space-y-6">
      {/* Room hero */}
      <div className="overflow-hidden rounded-lg border">
        {room.images?.[0] ? (
          <div className="aspect-video overflow-hidden">
            <img
              src={`${baseUrl}/uploads/rooms/${room.images[0]}`}
              alt={room.title}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center text-sm">
            No image
          </div>
        )}
        <div className="space-y-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold leading-tight">
              {room.title}
            </h2>
            <Badge
              variant={statusVariant[booking.status]}
              className="capitalize"
            >
              {booking.status}
            </Badge>
          </div>
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3" />
            {room.location}
          </div>
        </div>
      </div>

      {/* Facts grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryField icon={<CalendarDays className="h-4 w-4" />} label="Dates">
          {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
          <span className="text-muted-foreground ml-2 text-xs">
            ({nights} night{nights === 1 ? "" : "s"})
          </span>
        </SummaryField>
        <SummaryField icon={<Users className="h-4 w-4" />} label="Guests">
          {booking.guests}
        </SummaryField>
        <SummaryField icon={<Wallet className="h-4 w-4" />} label="Total">
          <span className="font-semibold">Rs{booking.totalPrice}</span>
        </SummaryField>
        <SummaryField
          icon={<Wallet className="h-4 w-4" />}
          label="Payment method"
        >
          {booking.paymentMethod === "cod" ? "Cash on arrival" : "-"}
        </SummaryField>
      </div>

      <Separator />

      <div className="text-muted-foreground text-xs">
        Booking id: <code className="font-mono">{booking._id}</code>
      </div>
    </div>
  );
}

function SummaryField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground flex items-center gap-1 text-xs uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
