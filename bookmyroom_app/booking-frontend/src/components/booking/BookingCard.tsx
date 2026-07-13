// src/components/booking/BookingCard.tsx
// Guest-side list card. The whole card links to /bookings/:id (detail view
// hosts the actions -- Cancel, View room, and later L26 payment blocks).
import { Link } from "react-router-dom";
import { MapPin, Users, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface BookingCardProps {
  booking: Booking;
}

function BookingCard({ booking }: BookingCardProps) {
  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  const { room } = booking;

  return (
    <Link to={`/bookings/${booking._id}`} className="group block">
      <Card className="overflow-hidden py-0 pb-4 transition-shadow hover:shadow-lg">
        <div className="aspect-video overflow-hidden">
          {room.images?.[0] ? (
            <img
              src={`${baseUrl}/uploads/rooms/${room.images[0]}`}
              alt={room.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center text-sm">
              No image
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-lg">{room.title}</CardTitle>
            <Badge
              variant={statusVariant[booking.status]}
              className="capitalize shrink-0"
            >
              {booking.status}
            </Badge>
          </div>
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3" />
            {room.location}
          </div>
        </CardHeader>

        <CardContent className="pb-2 text-sm">
          <div className="flex items-center gap-1">
            <CalendarDays className="text-muted-foreground h-3 w-3" />
            {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
            <Users className="h-3 w-3" />
            {booking.guests} guest{booking.guests === 1 ? "" : "s"}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <span className="text-lg font-bold">
            Rs{booking.totalPrice}
            <span className="text-muted-foreground ml-1 text-xs font-normal">
              total
            </span>
          </span>
          <span className="text-muted-foreground text-xs">
            {booking.paymentMethod === "cod" ? "Cash on arrival" : "-"}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default BookingCard;
