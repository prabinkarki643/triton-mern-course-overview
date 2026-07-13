// src/components/booking/owner-row-actions.tsx
// Matches Lesson 25 section 25.14. Confirm/Cancel actions wrapped in
// shadcn AlertDialogs so an accidental click can't fire a booking change.
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUpdateBookingStatus } from "@/hooks/useBookings";
import type { Booking } from "@/types/booking";

interface Props {
  booking: Booking;
}

export function OwnerBookingActions({ booking }: Props) {
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();

  // Only pending bookings have actions.
  if (booking.status !== "pending") return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Confirm */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" disabled={isPending}>
            <Check className="mr-1 h-3 w-3" /> Confirm
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              {booking.user.name} will be notified that their booking for "
              {booking.room.title}" is confirmed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatus({ id: booking._id, status: "confirmed" })
              }
            >
              Confirm booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={isPending}>
            <X className="mr-1 h-3 w-3" /> Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will release the dates (
              {new Date(booking.checkIn).toLocaleDateString("en-GB")} →{" "}
              {new Date(booking.checkOut).toLocaleDateString("en-GB")}) for
              other guests to book.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateStatus({ id: booking._id, status: "cancelled" })
              }
            >
              Cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
