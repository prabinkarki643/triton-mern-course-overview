// src/components/booking/BookingCardSkeleton.tsx
// Loading placeholder that mirrors BookingCard's shape.
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function BookingCardSkeleton() {
  return (
    <Card className="overflow-hidden py-0 pb-4">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-1 h-4 w-1/2" />
      </CardHeader>
      <CardContent className="pb-2 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-24" />
      </CardFooter>
    </Card>
  );
}

export default BookingCardSkeleton;
