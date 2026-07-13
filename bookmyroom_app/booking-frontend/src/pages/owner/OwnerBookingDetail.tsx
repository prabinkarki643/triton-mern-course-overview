// src/pages/owner/OwnerBookingDetail.tsx
// Owner-side detail page mounted at /owner/bookings/:id inside OwnerLayout.
// Same BookingSummary as the guest page, plus a guest-contact block and
// owner-only actions (Confirm/Cancel; Lesson 26 adds "Mark cash received").
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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

function OwnerBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading, error } = useBooking(id ?? "");
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();

  if (isLoading) {
    return <OwnerBookingDetailSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="max-w-4xl py-16 text-center">
        <p className="text-destructive mb-4 text-lg">Booking not found.</p>
        <Button variant="outline" asChild>
          <Link to="/owner/bookings">Back to Booking Requests</Link>
        </Button>
      </div>
    );
  }

  const canDecide = booking.status === "pending";

  return (
    <div className="max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link to="/owner/bookings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Booking Requests
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <BookingSummary booking={booking} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guest</CardTitle>
              <CardDescription>
                Reach out if you need any extra information before deciding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name: </span>
                {booking.user.name}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Email: </span>
                <a
                  href={`mailto:${booking.user.email}`}
                  className="inline-flex items-center gap-1 underline"
                >
                  <Mail className="h-3 w-3" />
                  {booking.user.email}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canDecide ? (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" disabled={isPending}>
                        Confirm booking
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Confirm this booking?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {booking.user.name} will be emailed that their booking
                          for "{booking.room.title}" is confirmed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Back</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            updateStatus(
                              { id: booking._id, status: "confirmed" },
                              { onSuccess: () => navigate("/owner/bookings") }
                            )
                          }
                        >
                          Confirm booking
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

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
                        <AlertDialogTitle>
                          Cancel this booking?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {booking.user.name} will be emailed that their booking
                          was cancelled, and the dates will be released.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Back</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            updateStatus(
                              { id: booking._id, status: "cancelled" },
                              { onSuccess: () => navigate("/owner/bookings") }
                            )
                          }
                        >
                          Cancel booking
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {booking.status === "confirmed"
                    ? "This booking is confirmed."
                    : "This booking has been cancelled."}
                </p>
              )}

              <Button variant="outline" className="w-full" asChild>
                <Link to={`/rooms/${booking.room._id}`}>View room</Link>
              </Button>

              {/* Lesson 26 will add "Mark cash received" here for COD
                  bookings whose paymentStatus is still "pending". */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OwnerBookingDetailSkeleton() {
  return (
    <div className="max-w-4xl">
      <Skeleton className="mb-4 h-8 w-52" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default OwnerBookingDetail;
