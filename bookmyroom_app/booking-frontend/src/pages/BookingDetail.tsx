// src/pages/BookingDetail.tsx
// Guest-side detail page mounted at /bookings/:id inside MainLayout.
// Actions here: Cancel (while pending), View room. Placeholder marks the
// spot where Lesson 26 will add "Pay Now" / receipt blocks.
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { useBooking, useUpdateBookingStatus } from "@/hooks/useBookings";

function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading, error } = useBooking(id ?? "");
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();

  if (isLoading) {
    return <BookingDetailSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-destructive mb-4 text-lg">Booking not found.</p>
        <Button variant="outline" asChild>
          <Link to="/bookings">Back to My Bookings</Link>
        </Button>
      </div>
    );
  }

  const canCancel = booking.status === "pending";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link to="/bookings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Bookings
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Summary */}
        <div className="lg:col-span-2">
          <BookingSummary booking={booking} />
        </div>

        {/* Actions */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canCancel ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full"
                      variant="destructive"
                      disabled={isPending}
                    >
                      Cancel booking
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The room will be released for other guests to book. This
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep booking</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          updateStatus(
                            { id: booking._id, status: "cancelled" },
                            { onSuccess: () => navigate("/bookings") }
                          )
                        }
                      >
                        Cancel booking
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {booking.status === "confirmed"
                    ? "This booking is confirmed. Contact the host if you need to change anything."
                    : "This booking has been cancelled."}
                </p>
              )}

              <Button variant="outline" className="w-full" asChild>
                <Link to={`/rooms/${booking.room._id}`}>View room</Link>
              </Button>

              {/* Lesson 26 will add payment blocks here:
                  - Pay Now (when paymentMethod === "esewa" && paymentStatus === "pending")
                  - Receipt (when paymentStatus === "paid")
                  - Retry (when paymentStatus === "failed") */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BookingDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="mb-4 h-8 w-40" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default BookingDetail;
