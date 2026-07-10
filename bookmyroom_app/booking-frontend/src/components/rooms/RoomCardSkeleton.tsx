// src/components/rooms/RoomCardSkeleton.tsx
// Matches Lesson 24 section 24.13. Loading placeholder that mirrors the
// shape of a RoomCard so the page layout doesn't jump when data arrives.
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function RoomCardSkeleton() {
  return (
    <Card className="overflow-hidden py-0 pb-6">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-1 h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  );
}

export default RoomCardSkeleton;
