// src/pages/OwnerDashboardPage.tsx
import { useCurrentUser } from "@/hooks/useAuth";

export function OwnerDashboardPage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Owner Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Welcome, {user?.name}! Your rooms and bookings will live here.
      </p>
      <p className="text-muted-foreground mt-6 text-sm">
        (Lessons 22-27 will fill this page out with room CRUD, booking
        management, stats, and more.)
      </p>
    </div>
  );
}
