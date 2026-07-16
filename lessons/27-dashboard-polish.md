# Lesson 27: Dashboards, Stats & Polish

## What You Will Learn
- Building an owner dashboard with statistics cards and revenue data
- Using MongoDB aggregation pipelines to calculate stats on the server
- Writing backend endpoints with explicit **try/catch** and returning the `{ data: ... }` envelope
- Building a user dashboard with booking history
- **Fetching dashboard data the right way** -- typed `dashboardApi` service over Axios, with React Query hooks (`useOwnerStats`, `useOwnerRecentBookings`, `useUserStats`)
- Defining a **`dashboardKeys` query factory** for clean cache invalidation
- Rendering Recent Bookings using the reusable **`<DataTable>`** from Lesson 17.1
- Stats cards with `Skeleton` loading states using shadcn `Card`
- Toast notifications with shadcn Sonner (already wired through mutation hooks across the app)
- Implementing confirmation dialogs for destructive actions
- Making the navigation responsive with a mobile hamburger menu using shadcn `Sheet`

---

## 27.1 Why Dashboards Matter

A dashboard gives users a quick overview of what matters to them. In our booking application:

- **Owners** want to know: How many rooms do I have? How many bookings? How much revenue? Which bookings are pending?
- **Users** want to know: What are my upcoming bookings? What have I spent in total?

We will build both dashboards, then polish the entire application with proper notifications, confirmations, and mobile support.

---

## 27.2 Owner Dashboard: Backend Stats Endpoint

MongoDB's aggregation pipeline lets us calculate statistics directly in the database, which is far more efficient than fetching all records and counting in JavaScript.

We follow the standard project pattern from Lesson 16: a controller with an explicit `try/catch`, and every response returned in the `{ data: ... }` envelope.

```typescript
// backend/src/controllers/dashboardController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking";
import Room from "../models/Room";

// GET /api/dashboard/owner/stats
export const getOwnerStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user!.userId);

    // Get all room IDs belonging to this owner
    const ownerRooms = await Room.find({ owner: ownerId }).select("_id");
    const ownerRoomIds = ownerRooms.map((room) => room._id);
    const totalRooms = ownerRooms.length;

    // Aggregate booking statistics
    const stats = await Booking.aggregate([
      { $match: { room: { $in: ownerRoomIds } } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          paidBookings: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] },
          },
        },
      },
    ]);

    // If no bookings exist yet, provide default values
    const bookingStats = stats[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      confirmedBookings: 0,
      pendingBookings: 0,
      paidBookings: 0,
    };

    res.json({
      data: {
        totalRooms,
        ...bookingStats,
      },
    });
  } catch (error: unknown) {
    console.error("getOwnerStats error:", error);
    res.status(500).json({ message: "Failed to load owner stats" });
  }
};
```

> **Where does `req.user` come from?** From the `requireAuth` middleware in Lesson 20. It verifies the JWT and attaches `{ userId, role }` to the request; the type augmentation in `src/types/express.d.ts` makes `req.user` visible to TypeScript. We use `req.user!.userId` here for the same reason the L25/L26 controllers do -- the route is behind `requireAuth`, so `req.user` is guaranteed to be present.

```typescript
// backend/src/routes/dashboardRoutes.ts
import { Router } from "express";
import { getOwnerStats } from "../controllers/dashboardController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/owner/stats", requireAuth, requireRole("owner"), getOwnerStats);

export default router;
```

> **Why `requireRole("owner")` and not just `requireAuth`?** Owner stats leak booking counts and revenue for that owner's rooms. `requireRole` (from L23.2 backend) blocks a signed-in guest from calling `/api/dashboard/owner/stats` at all -- 403 instead of leaking the shape of another user's numbers.

Let us break down the aggregation pipeline:

1. **`$match`** -- filters to only include bookings for this owner's rooms (like a WHERE clause in SQL).
2. **`$group`** -- groups all matching documents together (`_id: null` means "group everything into one result") and calculates:
   - `$sum: 1` -- counts documents (like COUNT(*))
   - `$sum: '$totalPrice'` -- adds up all prices (like SUM(totalPrice))
   - `$cond` -- a conditional: if status equals 'confirmed', count 1, otherwise count 0

Register the route:

```typescript
// backend/src/index.ts
import dashboardRoutes from "./routes/dashboardRoutes";

app.use("/api/dashboard", dashboardRoutes);
```

---

## 27.3 Owner Dashboard: Recent Bookings Endpoint

The dashboard should also show the most recent bookings. Same pattern -- explicit `try/catch` and `{ data: ... }`.

```typescript
// Add to backend/src/controllers/dashboardController.ts

// GET /api/dashboard/owner/recent-bookings
export const getOwnerRecentBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user!.userId);

    const ownerRooms = await Room.find({ owner: ownerId }).select("_id");
    const ownerRoomIds = ownerRooms.map((room) => room._id);

    const recentBookings = await Booking.find({ room: { $in: ownerRoomIds } })
      .populate("user", "name email")
      .populate("room", "title")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ data: recentBookings });
  } catch (error: unknown) {
    console.error("getOwnerRecentBookings error:", error);
    res.status(500).json({ message: "Failed to load recent bookings" });
  }
};
```

```typescript
// Add to backend/src/routes/dashboardRoutes.ts
import {
  getOwnerStats,
  getOwnerRecentBookings,
} from "../controllers/dashboardController";

router.get(
  "/owner/recent-bookings",
  requireAuth,
  requireRole("owner"),
  getOwnerRecentBookings
);
```

---

## 27.4 Owner Dashboard: Frontend

The Owner Dashboard pulls together everything we have built in previous lessons:

1. A typed **`dashboardApi`** service over the Axios instance (Lesson 17)
2. A **`dashboardKeys`** query factory and React Query hooks (Lesson 17)
3. The reusable **`<DataTable>`** for Recent Bookings (Lesson 17.1)
4. shadcn `Card` + `Skeleton` for stats cards with proper loading states

**No raw `fetch` anywhere -- the dashboard is just a thin consumer of hooks.**

### Step 1: Dashboard Types

```typescript
// booking-frontend/src/types/dashboard.ts
export interface OwnerStats {
  totalRooms: number;
  totalBookings: number;
  totalRevenue: number;
  confirmedBookings: number;
  pendingBookings: number;
  paidBookings: number;
}

export interface UserStats {
  totalBookings: number;
  totalSpent: number;
  upcomingBookings: number;
}

export interface DashboardBooking {
  _id: string;
  user: { name: string; email: string };
  room: { title: string };
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
}
```

### Step 2: The `dashboardApi` Service

```typescript
// booking-frontend/src/services/dashboardApi.ts
import api from './api';
import type {
  OwnerStats,
  UserStats,
  DashboardBooking,
} from '../types/dashboard';

export const dashboardApi = {
  async getOwnerStats(): Promise<OwnerStats> {
    const { data } = await api.get<{ data: OwnerStats }>('/dashboard/owner/stats');
    return data.data;
  },

  async getOwnerRecentBookings(): Promise<DashboardBooking[]> {
    const { data } = await api.get<{ data: DashboardBooking[] }>(
      '/dashboard/owner/recent-bookings'
    );
    return data.data;
  },

  async getUserStats(): Promise<UserStats> {
    const { data } = await api.get<{ data: UserStats }>('/dashboard/user/stats');
    return data.data;
  },
};
```

Notice the **double `.data`** -- Axios gives us the HTTP body in `response.data`, and our backend wraps the payload in `{ data: ... }`. We unwrap both at the service so consumers get a clean typed object.

### Step 3: Query Keys Factory + Hooks

```typescript
// booking-frontend/src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/dashboardApi';

// Centralised query keys -- same pattern as todoKeys in Lesson 17
export const dashboardKeys = {
  all: ['dashboard'] as const,
  ownerStats: () => [...dashboardKeys.all, 'owner', 'stats'] as const,
  ownerRecent: () => [...dashboardKeys.all, 'owner', 'recent'] as const,
  userStats: () => [...dashboardKeys.all, 'user', 'stats'] as const,
};

export function useOwnerStats() {
  return useQuery({
    queryKey: dashboardKeys.ownerStats(),
    queryFn: () => dashboardApi.getOwnerStats(),
  });
}

export function useOwnerRecentBookings() {
  return useQuery({
    queryKey: dashboardKeys.ownerRecent(),
    queryFn: () => dashboardApi.getOwnerRecentBookings(),
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: dashboardKeys.userStats(),
    queryFn: () => dashboardApi.getUserStats(),
  });
}
```

Now any component anywhere in the app can call these hooks and benefit from caching, loading states, and shared invalidation.

### Step 4: Recent Bookings Columns

Following the column-definition pattern from Lesson 17.1:

```tsx
// booking-frontend/src/components/dashboard/recent-bookings-columns.tsx
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { DashboardBooking } from '@/types/dashboard';

const statusVariant: Record<
  DashboardBooking['status'],
  'default' | 'secondary' | 'destructive'
> = {
  confirmed: 'default',
  pending: 'secondary',
  cancelled: 'destructive',
};

const paymentVariant: Record<
  DashboardBooking['paymentStatus'],
  'default' | 'secondary' | 'destructive'
> = {
  paid: 'default',
  pending: 'secondary',
  failed: 'destructive',
};

export const recentBookingsColumns: ColumnDef<DashboardBooking>[] = [
  {
    accessorKey: 'user',
    header: 'Guest',
    cell: ({ row }) => row.original.user.name,
  },
  {
    accessorKey: 'room',
    header: 'Room',
    cell: ({ row }) => row.original.room.title,
  },
  {
    id: 'dates',
    header: 'Dates',
    cell: ({ row }) =>
      `${new Date(row.original.checkIn).toLocaleDateString('en-GB')} - ` +
      `${new Date(row.original.checkOut).toLocaleDateString('en-GB')}`,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]} className="capitalize">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Payment',
    cell: ({ row }) => (
      <Badge
        variant={paymentVariant[row.original.paymentStatus]}
        className="capitalize"
      >
        {row.original.paymentStatus}
      </Badge>
    ),
  },
  {
    accessorKey: 'totalPrice',
    header: 'Total',
    cell: ({ row }) => `NPR ${row.original.totalPrice.toLocaleString()}`,
  },
];
```

### Step 5: Reusable Stats Card with Skeleton Loading

```tsx
// booking-frontend/src/components/dashboard/stats-card.tsx
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  isLoading?: boolean;
}

export function StatsCard({ title, value, icon, isLoading }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 6: The Owner Dashboard Page

The page becomes tiny because every concern lives in a hook or a reusable component. This **replaces** the placeholder `OwnerDashboardPage` from Lesson 23 -- the file path, component name and export stay the same, so no routing changes are needed.

```tsx
// booking-frontend/src/pages/OwnerDashboardPage.tsx
import { Home, CalendarCheck, Wallet, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { StatsCard } from '@/components/dashboard/stats-card';
import { recentBookingsColumns } from '@/components/dashboard/recent-bookings-columns';
import { useOwnerStats, useOwnerRecentBookings } from '@/hooks/useDashboard';

export function OwnerDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useOwnerStats();
  const { data: recentBookings, isLoading: bookingsLoading } =
    useOwnerRecentBookings();

  // Notice: NO outer `p-6` on this container. The OwnerLayout shell
  // (Lesson 23.8.5) already provides `p-4 sm:p-6` around its <Outlet />,
  // so any padding here would double up.
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Owner Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Rooms"
          value={stats?.totalRooms ?? 0}
          icon={<Home className="h-4 w-4 text-muted-foreground" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Revenue"
          value={`NPR ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Pending Bookings"
          value={stats?.pendingBookings ?? 0}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          isLoading={statsLoading}
        />
      </div>

      {/* Recent Bookings -- snapshot view, no pagination needed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={recentBookingsColumns}
            data={recentBookings ?? []}
            isLoading={bookingsLoading}
            emptyMessage="No bookings yet."
            pageCount={1}
            pageIndex={0}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

**What is happening:**
- `useOwnerStats()` and `useOwnerRecentBookings()` handle fetching, caching, loading and error states automatically
- `<StatsCard>` shows a `Skeleton` while `isLoading` is true -- no "Loading dashboard..." flash
- `<DataTable>` is the same component we built in Lesson 17.1; we reuse it here for a snapshot view by passing `pageCount={1}` (no pagination controls needed for a "Top 10 recent" list)
- Because the page only renders hooks and presentational components, swapping the source data, adding a new card, or extending the table is a one-line change

---

## 27.5 User Dashboard

The user dashboard shows the user's own bookings and spending. Same backend pattern as the owner endpoints -- explicit `try/catch` and the `{ data: ... }` envelope.

### Backend

```typescript
// Add to backend/src/controllers/dashboardController.ts

// GET /api/dashboard/user/stats
export const getUserStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const stats = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: "$totalPrice" },
          upcomingBookings: {
            $sum: { $cond: [{ $gte: ["$checkIn", new Date()] }, 1, 0] },
          },
        },
      },
    ]);

    const userStats = stats[0] || {
      totalBookings: 0,
      totalSpent: 0,
      upcomingBookings: 0,
    };

    res.json({ data: userStats });
  } catch (error: unknown) {
    console.error("getUserStats error:", error);
    res.status(500).json({ message: "Failed to load user stats" });
  }
};
```

Wire it into the router:

```typescript
// backend/src/routes/dashboardRoutes.ts
import {
  getOwnerStats,
  getOwnerRecentBookings,
  getUserStats,
} from "../controllers/dashboardController";

router.get("/user/stats", requireAuth, getUserStats);
```

> `/user/stats` intentionally omits `requireRole` -- both guests and owners have "user bookings" (their own reservations), so anyone signed in can see their own numbers.
>
> For upcoming/past **lists**, we deliberately do **not** add server-side filters. `useMyBookings()` from L25 already fetches everything the current user has, and splitting by date on the client is one `filter()`. Adding server filters here would double the surface area for no real gain.

### Frontend

The page consumes `useUserStats()` (from the dashboard hooks above) and `useMyBookings()` from L25 -- no new endpoint, no new hook. We split into upcoming vs past on the client using `booking.checkIn` vs `Date.now()`. The existing `<BookingCard>` from L25.15.2 renders each row.

```tsx
// booking-frontend/src/pages/UserDashboard.tsx
import { useMemo } from "react";
import { CalendarCheck, Wallet, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import BookingCard from "@/components/booking/BookingCard";
import { useUserStats } from "@/hooks/useDashboard";
import { useMyBookings } from "@/hooks/useBookings";

export function UserDashboard() {
  const { data: stats, isLoading: statsLoading } = useUserStats();

  // One request -- all my bookings. Client-side split is trivial.
  const { data: bookingsResponse, isLoading: bookingsLoading } = useMyBookings({
    limit: 100,
  });
  const bookings = bookingsResponse?.data ?? [];

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: bookings.filter((b) => new Date(b.checkIn).getTime() >= now),
      past: bookings.filter((b) => new Date(b.checkIn).getTime() < now),
    };
  }, [bookings]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">My Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={<CalendarCheck className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Spent"
          value={`Rs ${(stats?.totalSpent ?? 0).toLocaleString()}`}
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Upcoming Bookings"
          value={stats?.upcomingBookings ?? 0}
          icon={<Clock className="text-muted-foreground h-4 w-4" />}
          isLoading={statsLoading}
        />
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-muted-foreground">No upcoming bookings.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {upcoming.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Past Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : past.length === 0 ? (
            <p className="text-muted-foreground">No past bookings.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {past.map((booking) => (
                <BookingCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

The component is under 100 lines because:
- No `useState`/`useEffect` for server data -- React Query handles it.
- No inline `<BookingCard>` -- we reuse the shared card built for `MyBookings` in L25, so any styling change to bookings-in-lists ripples here automatically.
- The upcoming/past split is a two-line `useMemo` over the same array, not two separate API calls.

> **Route it in `MainLayout` (from L21):**
>
> ```tsx
> // booking-frontend/src/routes.tsx  (or wherever your routes tree lives)
> <Route path="dashboard" element={<UserDashboard />} />
> ```
>
> Add "Dashboard" to the Navbar's signed-in links right next to "My Bookings".

---

## 27.6 Toast Notifications with Sonner

We introduced Sonner back in Lesson 17 as part of the React Query setup. Every mutation hook in the app (`useCreateBooking`, `useDeleteRoom`, `useInitiateEsewaPayment`, `useMarkBookingPaid`, ...) already shows a success or error toast inside its `onSuccess` / `onError` callbacks. This section is a quick recap of the pattern -- you should not be adding ad-hoc toasts in components anymore.

### The Pattern (Already Wired)

The `<Toaster />` is mounted once at the root next to `QueryClientProvider`:

```tsx
// booking-frontend/src/main.tsx (from Lesson 17)
<QueryClientProvider client={queryClient}>
  <App />
  <Toaster richColors position="top-right" />
</QueryClientProvider>
```

Mutation hooks own their feedback -- the component just calls `mutate()`:

```typescript
// Example -- from useBookings.ts
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingData) => bookingApi.create(data),
    onSuccess: () => {
      toast.success('Booking created successfully');
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create booking');
    },
  });
}
```

Components consume the hook and never touch toasts directly:

```tsx
const { mutate: createBooking, isPending } = useCreateBooking();
// onClick: createBooking(formData)
// toasts and cache invalidation happen automatically
```

### Toast Types Available

- `toast.success('...')` -- green, for successful actions
- `toast.error('...')` -- red, for failures
- `toast.warning('...')` -- yellow, for warnings
- `toast.info('...')` -- blue, for informational messages
- `toast.loading('...')` -- shows a spinner

### When to Call `toast` Directly

The only places you would call `toast` outside a mutation hook are:
- A pure UI affordance (e.g. "Copied to clipboard")
- A client-side validation message that does not involve the API

For anything involving the API, put the toast inside the hook so every caller gets the same feedback.

---

## 27.7 Confirmation Dialogs for Destructive Actions

When a user clicks "Delete Room" or "Cancel Booking", they should see a confirmation dialog first. Accidental deletions are frustrating.

We use shadcn's **`AlertDialog`** for these confirmations. You already installed it in an earlier lesson (`npx shadcn@latest add alert-dialog`), and L25's `BookingDetail` and `OwnerBookingDetail` (§25.15) already use it for the guest Cancel button and the owner's Confirm/Cancel flow. This section shows how to reach for the same pattern anywhere else you have a destructive action.

### The pattern

Wrap the trigger button in `<AlertDialogTrigger asChild>`, put the dialog body next to it, and put `mutate(...)` inside the `AlertDialogAction`'s `onClick`. The mutation hook handles the toast + cache invalidation, so the whole thing stays short.

**Delete a room (owner portal):**

```tsx
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
import { Button } from "@/components/ui/button";
import { useDeleteRoom } from "@/hooks/useRooms";
import type { Room } from "@/types/room";

function DeleteRoomButton({ room }: { room: Room }) {
  const { mutate: deleteRoom, isPending } = useDeleteRoom();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>
          Delete Room
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{room.title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the listing. Existing bookings for this
            room will still show, but the room won't be bookable any more.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep room</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteRoom(room._id)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Cancel a booking (guest side):** we use the L25 `useUpdateBookingStatus` mutation with `status: "cancelled"` -- there is no separate "cancel" hook; cancelling is just a status transition.

```tsx
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
import { Button } from "@/components/ui/button";
import { useUpdateBookingStatus } from "@/hooks/useBookings";
import type { Booking } from "@/types/booking";

function CancelBookingButton({ booking }: { booking: Booking }) {
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          Cancel Booking
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            The room will be released for other guests. If you already paid
            via eSewa the owner will process a refund manually.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep booking</AlertDialogCancel>
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
  );
}
```

**Why inline the dialog instead of building a reusable `<ConfirmDialog>` wrapper?** Because every real confirmation looks slightly different -- the title asks a specific question, the description references a specific thing being destroyed, the confirm label reads naturally in context. A generic wrapper either forces you to pass every one of those as a prop (at which point you might as well just write the dialog) or homogenises the copy in ways that hurt UX. The shadcn `AlertDialog` primitives are already the reusable layer; a further abstraction usually costs more than it saves.

---

## 27.8 Form Loading States

When a form is submitting, the user should see clear feedback. Disable the submit button and show a spinner or "Loading..." text:

```tsx
// booking-frontend/src/components/SubmitButton.tsx
import { Button } from '@/components/ui/button';

interface SubmitButtonProps {
  loading: boolean;
  label: string;
  loadingLabel?: string;
}

export function SubmitButton({
  loading,
  label,
  loadingLabel = 'Please wait...',
}: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={loading} className="w-full">
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  );
}
```

Usage with a React Query mutation hook -- `isPending` drives the button state:

```tsx
import { useUpdateRoom } from '@/hooks/useRooms';

function EditRoomTextForm({ roomId }: { roomId: string }) {
  const { mutate: updateRoom, isPending } = useUpdateRoom();

  const onSubmit = (data: UpdateRoomData) => {
    updateRoom(
      { id: roomId, payload: data },
      { onSuccess: () => form.reset(data) }
    );
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* ... text fields only -- images live in their own gallery component ... */}
      <SubmitButton
        loading={isPending}
        label="Save changes"
        loadingLabel="Saving..."
      />
    </form>
  );
}
```

No manual `useState` for loading, no try/catch -- the hook owns the loading state and toast feedback. The component only orchestrates the form.

---

## 27.9 Proper Error Messages from the API

Instead of showing generic "Something went wrong" messages, we want the user to see the actual error from the API (e.g. "Title must be between 3 and 100 characters"). Because all our requests go through the **shared Axios instance** from Lesson 17, we handle this in one place using an Axios response interceptor.

### What we already have

The `services/api.ts` interceptor from Lesson 20 handles 401 auto-logout and copies `error.response.data.message` into `error.message`, so `error.message` on the mutation hook side is already the server's message. That covers 90% of cases -- our controllers return `{ message: "Booking not found" }` and the toast shows exactly that.

### The one gap: validation errors with `errors[]`

Our `validate` middleware from L20 turns express-validator failures into a response like:

```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "title", "message": "Title must be 3-100 characters" },
    { "field": "price", "message": "Price must be positive" }
  ]
}
```

Right now the toast just says "Validation failed", which isn't useful. Let's extend the existing interceptor to prefer the first `errors[].message` when it exists:

```typescript
// booking-frontend/src/services/api.ts  (inside the existing response
// interceptor -- add ONE branch before the `serverMessage` block)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // ... existing auto-logout logic ...
    }

    // NEW: prefer the first field-level error when the API returned an
    // errors[] array from the validate() middleware.
    const firstFieldError = error.response?.data?.errors?.[0]?.message;
    if (firstFieldError) {
      error.message = firstFieldError;
      return Promise.reject(error);
    }

    const serverMessage = error.response?.data?.message;
    if (serverMessage) {
      error.message = serverMessage;
    }

    return Promise.reject(error);
  }
);
```

Now a mutation that fails Zod / express-validator will show "Title must be 3-100 characters" instead of "Validation failed". Every existing mutation hook benefits automatically -- no changes anywhere else.

> **Field-level errors on the form itself.** For inline errors *next to each field* (rather than a toast), keep using Zod + React Hook Form -- those catch bad input before it ever reaches the API. The interceptor only kicks in when the client somehow lets bad data through and the server is the last line of defence.

---

## 27.10 Mobile-Responsive Navigation

On mobile, our L21 `Navbar` hides its whole `<nav>` block behind `md:flex` and there's nothing in its place -- guests on a phone can see the logo and the avatar dropdown, but not "Browse Rooms" or "My Bookings" or "Owner Portal". We fix that by adding a hamburger `Sheet` that shows the same role-aware links below the `md` breakpoint. **We are not replacing the L21 Navbar** -- we're extending it.

### Install Sheet (if not already installed)

```bash
cd booking-frontend
npx shadcn@latest add sheet
```

L23's owner sidebar already brings `sheet` in; check `src/components/ui/sheet.tsx` before installing.

### Add a mobile menu to the existing Navbar

Open `booking-frontend/src/components/Navbar.tsx` (from L21) and add:

1. `Sheet` + `Menu` icon imports at the top.
2. A shared `navLinks` array so the desktop `<nav>` and mobile Sheet render the same items -- avoids drift.
3. A `md:hidden` Sheet trigger next to the avatar dropdown, using the exact same role-aware conditions as the desktop nav.

```tsx
// booking-frontend/src/components/Navbar.tsx  (diff -- top of file)
import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
```

Inside the component, extract the link list once so both views stay in lock-step:

```tsx
const [mobileOpen, setMobileOpen] = useState(false);

const navLinks = [
  { to: "/", label: "Browse Rooms", show: true },
  { to: "/bookings", label: "My Bookings", show: !!user },
  { to: "/owner/dashboard", label: "Owner Portal", show: user?.role === "owner" },
] as const;
```

Swap the existing desktop `<nav>` links for a mapped list so it stays consistent:

```tsx
<nav className="hidden items-center gap-8 md:flex">
  {navLinks
    .filter((link) => link.show)
    .map((link) => (
      <NavLink key={link.to} to={link.to} end={link.to === "/"} className={navLinkClass}>
        {link.label}
      </NavLink>
    ))}
</nav>
```

Then, immediately before the `<div className="flex items-center gap-2">` that holds the avatar, add the mobile trigger:

```tsx
{/* Mobile hamburger -- only visible below md */}
<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
  <SheetTrigger asChild>
    <Button variant="ghost" size="sm" className="md:hidden">
      <Menu className="size-5" />
      <span className="sr-only">Open menu</span>
    </Button>
  </SheetTrigger>
  <SheetContent side="right" className="w-72">
    <SheetHeader>
      <SheetTitle>Menu</SheetTitle>
    </SheetHeader>
    <nav className="mt-6 flex flex-col gap-2 px-4">
      {navLinks
        .filter((link) => link.show)
        .map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-base font-medium transition-colors ${
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      {!user && (
        <Button asChild variant="outline" className="mt-4">
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            Log in
          </Link>
        </Button>
      )}
    </nav>
  </SheetContent>
</Sheet>
```

Key points:
- **Single source of truth for links.** `navLinks` drives both the desktop `<nav>` and the mobile Sheet -- no drift between views.
- **Role-aware everywhere.** Both views share the same `show` checks, so an owner sees "Owner Portal" on both mobile and desktop.
- **Avatar dropdown stays as-is.** It already shows on all breakpoints and handles Profile / Owner Dashboard / Log out. We don't duplicate those into the Sheet.
- **`md:hidden` on the trigger, `hidden md:flex` on the desktop `<nav>`** -- exactly one of them shows at any width.
- **Clicking a link closes the sheet** via `onClick={() => setMobileOpen(false)}`.

---

## 27.11 The Hooks Pattern Recap

Looking back at our application, every piece of data has the same shape:

| Layer | Responsibility |
|-------|----------------|
| `types/*.ts` | TypeScript shapes for the entity (e.g. `Booking`, `OwnerStats`) |
| `services/*Api.ts` | Axios calls that unwrap the `{ data: ... }` envelope |
| `hooks/use*.ts` | Query keys factory + `useQuery`/`useMutation` hooks with toasts |
| `components/*` | Pure UI that consumes the hooks |

This is **the** pattern. We use it for todos, bookings, rooms, payments, and dashboard data alike.

### Why No Generic `useFetch`?

You might be tempted to write a generic `useFetch(url)` helper. Resist it -- React Query *is* that helper, and it does much more (caching, refetch on focus, query key invalidation, `placeholderData`, optimistic updates, ...). Writing your own `useFetch` on top of `useState` + `useEffect` throws all of that away.

### Why No `handleAction` Helper?

The same logic applies to a generic `handleAction(setLoading, successMessage, ...)` wrapper. A React Query mutation hook already gives you:
- `isPending` (loading state)
- `onSuccess` / `onError` callbacks (toasts and cache invalidation)
- Centralised error extraction via the Axios interceptor
- Cache invalidation that updates every component using the same query keys

So instead of:

```tsx
// Don't do this -- reinventing what React Query already does
const [loading, setLoading] = useState(false);
const deleteRoom = (id) => handleAction(() => apiFetch(...), { setLoading, ... });
```

Do this:

```tsx
// The project pattern -- a mutation hook owns everything
const { mutate: deleteRoom, isPending } = useDeleteRoom();
```

Every component in the app follows this shape, which is why each component stays under 100 lines and is easy to read.

---

## Practice Exercises

1. **Owner dashboard backend:** Implement `getOwnerStats` and `getOwnerRecentBookings` using an explicit `try/catch` and the `{ data: ... }` envelope. Verify the aggregation pipeline returns correct values by creating test bookings.

2. **Dashboard service + hooks:** Build `services/dashboardApi.ts` and `hooks/useDashboard.ts` with the `dashboardKeys` factory and the `useOwnerStats`, `useOwnerRecentBookings`, `useUserStats` hooks.

3. **Owner dashboard frontend:** Build the dashboard page using `<StatsCard>` (with `Skeleton` loading) and the reusable `<DataTable>` from Lesson 17.1 for Recent Bookings. Confirm no raw `fetch` appears anywhere in the component.

4. **User dashboard:** Build the user dashboard using `useUserStats()` and the existing `useMyBookings()` hook from L25. Split upcoming vs past client-side by comparing `booking.checkIn` to `Date.now()`. Reuse the shared `<BookingCard>` from L25 for each row. Format dates with `en-GB` (DD/MM/YYYY).

5. **Confirmation dialogs:** Wrap destructive actions (`useDeleteRoom`, `useUpdateBookingStatus({ id, status: "cancelled" })`) in shadcn `AlertDialog` blocks following the pattern in `BookingDetail.tsx` from L25. Verify the toast and cache invalidation happen automatically from the mutation hook -- the dialog only asks the question.

6. **Mobile navigation:** Extend the L21 `Navbar` with a shadcn `Sheet` hamburger below the `md` breakpoint. Verify the same role-aware links show on desktop and mobile without duplicating the array.

7. **Axios error interceptor:** Extend the existing `services/api.ts` interceptor from L20 so it prefers `error.response.data.errors[0].message` over the top-level `message` when both are present. Trigger a validation error (e.g. submit a room with an empty title) and confirm the toast shows the field-level message rather than the generic "Validation failed".

8. **Challenge:** Add a line chart to the owner dashboard showing revenue per month. Add a new endpoint that returns aggregated monthly revenue (still using explicit `try/catch` + `{ data: ... }`), then a `useMonthlyRevenue()` hook and a chart component. You may use a library like `recharts` (`npm install recharts`).

---

## Key Takeaways

- **MongoDB aggregation pipelines** compute statistics directly in the database -- no need to fetch all records into JavaScript.
- **Backend dashboard endpoints follow the project pattern** -- explicit `try/catch` + the `{ data: ... }` envelope, just like Lesson 16. There are no ad-hoc response shapes.
- **No raw `fetch` on the frontend.** Every dashboard call goes through the typed `dashboardApi` service over the shared Axios instance, and unwraps the `{ data: ... }` envelope at the service layer.
- **React Query hooks (`useOwnerStats`, `useOwnerRecentBookings`, `useUserStats`)** handle loading, caching, error states and refetching for free.
- **A `dashboardKeys` query key factory** mirrors the `todoKeys` pattern from Lesson 17 -- centralised, type-safe, easy to invalidate.
- **Reuse `<DataTable>` from Lesson 17.1** for the Recent Bookings list (with `pageCount={1}` for a snapshot view).
- **Stats cards** use shadcn `Card` + `Skeleton` for a proper loading state rather than a global "Loading..." flash.
- **Toast notifications** already live inside every mutation hook from Lesson 17 -- components do not call `toast` directly for API actions.
- **An Axios response interceptor** extracts the API's real error message (or first `details[0]`) so every mutation hook's toast is meaningful.
- **Confirmation dialogs** use shadcn `AlertDialog` inline (as in L25's `BookingDetail`), with `mutate(...)` inside `AlertDialogAction.onClick`. No custom wrapper needed.
- **Responsive navigation** with shadcn `Sheet` + a Tailwind `md:hidden` / `hidden md:flex` split.
- **Resist generic helpers** (`useFetch`, `handleAction`) -- React Query mutation/query hooks already do everything they would, with better caching and invalidation.
