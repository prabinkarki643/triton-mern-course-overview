// src/pages/BookingDetail.tsx
// Guest-side detail page mounted at /bookings/:id inside MainLayout.
// Actions here: Cancel (while pending), View room. Placeholder marks the
// spot where Lesson 26 will add "Pay Now" / receipt blocks.
import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
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
import { useInitiateEsewaPayment } from "@/hooks/usePayments";

function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: booking, isLoading, error } = useBooking(id ?? "");
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();
  const { mutate: initiateEsewa, isPending: isInitiating } =
    useInitiateEsewaPayment();

  // Read ?payment= once on mount, toast, then strip so a refresh
  // doesn't re-fire the toast forever.
  useEffect(() => {
    const outcome = searchParams.get("payment");
    if (outcome === "success") {
      toast.success("Payment received. You're all set.");
    } else if (outcome === "failed") {
      toast.error("Payment didn't go through. Try again below.");
    }
    if (outcome) {
      searchParams.delete("payment");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

              {/* Payment block (Lesson 26 §26.10) */}
              {booking.paymentMethod === "esewa" && (
                <>
                  {booking.paymentStatus === "pending" && (
                    <Button
                      className="w-full"
                      disabled={isInitiating}
                      onClick={() => initiateEsewa(booking._id)}
                    >
                      {isInitiating ? "Redirecting..." : "Pay with eSewa"}
                    </Button>
                  )}

                  {booking.paymentStatus === "failed" && (
                    <Button
                      className="w-full"
                      variant="destructive"
                      disabled={isInitiating}
                      onClick={() => initiateEsewa(booking._id)}
                    >
                      {isInitiating ? "Redirecting..." : "Retry payment"}
                    </Button>
                  )}

                  {booking.paymentStatus === "paid" && (
                    <div className="rounded-md border p-3 text-sm">
                      <div className="font-medium">Paid via eSewa</div>
                      {booking.transactionId && (
                        <div className="text-muted-foreground text-xs">
                          Ref:{" "}
                          <code className="font-mono">
                            {booking.transactionId}
                          </code>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {booking.paymentMethod === "cod" && (
                <div className="text-muted-foreground text-sm">
                  Payment on arrival.{" "}
                  {booking.paymentStatus === "paid"
                    ? "Marked received."
                    : "Owner will mark it received after check-in."}
                </div>
              )}
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
