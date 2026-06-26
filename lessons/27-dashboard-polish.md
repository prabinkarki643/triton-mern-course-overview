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
import { Response } from 'express';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking';
import { Room } from '../models/Room';
import type { AuthRequest } from '../types/auth';

// GET /api/dashboard/owner/stats
export const getOwnerStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.userId);

    // Get all room IDs belonging to this owner
    const ownerRooms = await Room.find({ owner: ownerId }).select('_id');
    const ownerRoomIds = ownerRooms.map((room) => room._id);
    const totalRooms = ownerRooms.length;

    // Aggregate booking statistics
    const stats = await Booking.aggregate([
      { $match: { room: { $in: ownerRoomIds } } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
          },
          pendingBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          paidBookings: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
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
    console.error('getOwnerStats error:', error);
    res.status(500).json({ error: 'Failed to load owner stats' });
  }
};
```

```typescript
// backend/src/routes/dashboard.ts
import { Router } from 'express';
import { getOwnerStats } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/owner/stats', authMiddleware, getOwnerStats);

export default router;
```

Let us break down the aggregation pipeline:

1. **`$match`** -- filters to only include bookings for this owner's rooms (like a WHERE clause in SQL).
2. **`$group`** -- groups all matching documents together (`_id: null` means "group everything into one result") and calculates:
   - `$sum: 1` -- counts documents (like COUNT(*))
   - `$sum: '$totalPrice'` -- adds up all prices (like SUM(totalPrice))
   - `$cond` -- a conditional: if status equals 'confirmed', count 1, otherwise count 0

Register the route:

```typescript
// backend/src/index.ts
import dashboardRoutes from './routes/dashboard';

app.use('/api/dashboard', dashboardRoutes);
```

---

## 27.3 Owner Dashboard: Recent Bookings Endpoint

The dashboard should also show the most recent bookings. Same pattern -- explicit `try/catch` and `{ data: ... }`.

```typescript
// Add to backend/src/controllers/dashboardController.ts

// GET /api/dashboard/owner/recent-bookings
export const getOwnerRecentBookings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.userId);

    const ownerRooms = await Room.find({ owner: ownerId }).select('_id');
    const ownerRoomIds = ownerRooms.map((room) => room._id);

    const recentBookings = await Booking.find({ room: { $in: ownerRoomIds } })
      .populate('user', 'name email')
      .populate('room', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ data: recentBookings });
  } catch (error: unknown) {
    console.error('getOwnerRecentBookings error:', error);
    res.status(500).json({ error: 'Failed to load recent bookings' });
  }
};
```

```typescript
// Add to backend/src/routes/dashboard.ts
import { getOwnerStats, getOwnerRecentBookings } from '../controllers/dashboardController';

router.get('/owner/recent-bookings', authMiddleware, getOwnerRecentBookings);
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
// webapp/src/types/dashboard.ts
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
// webapp/src/services/dashboardApi.ts
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
// webapp/src/hooks/useDashboard.ts
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
// webapp/src/components/dashboard/recent-bookings-columns.tsx
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
// webapp/src/components/dashboard/stats-card.tsx
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

The page becomes tiny because every concern lives in a hook or a reusable component.

```tsx
// webapp/src/pages/OwnerDashboard.tsx
import { Home, CalendarCheck, Wallet, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { StatsCard } from '@/components/dashboard/stats-card';
import { recentBookingsColumns } from '@/components/dashboard/recent-bookings-columns';
import { useOwnerStats, useOwnerRecentBookings } from '@/hooks/useDashboard';

export function OwnerDashboard() {
  const { data: stats, isLoading: statsLoading } = useOwnerStats();
  const { data: recentBookings, isLoading: bookingsLoading } =
    useOwnerRecentBookings();

  return (
    <div className="p-6 space-y-6">
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
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const stats = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' },
          upcomingBookings: {
            $sum: { $cond: [{ $gte: ['$checkIn', new Date()] }, 1, 0] },
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
    console.error('getUserStats error:', error);
    res.status(500).json({ error: 'Failed to load user stats' });
  }
};
```

Wire it into the router:

```typescript
// backend/src/routes/dashboard.ts
import { getOwnerStats, getOwnerRecentBookings, getUserStats } from '../controllers/dashboardController';

router.get('/user/stats', authMiddleware, getUserStats);
```

> The user's upcoming/past bookings can reuse the existing **bookings list endpoint** (with filters like `?upcoming=true`) via the `useBookings` hook -- there is no need for a separate dashboard route. Lean on the patterns you already have.

### Frontend

The page consumes `useUserStats()` (from the dashboard hooks above) and `useBookings({ ... })` from your existing bookings hook. There is no `fetch`, no `useEffect`, no `useState` for server data.

```tsx
// webapp/src/pages/UserDashboard.tsx
import { CalendarCheck, Wallet, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/stats-card';
import { useUserStats } from '@/hooks/useDashboard';
import { useBookings } from '@/hooks/useBookings';
import type { Booking } from '@/types/booking';

export function UserDashboard() {
  const { data: stats, isLoading: statsLoading } = useUserStats();

  // Reuse the bookings hook with filters -- no special dashboard endpoint needed
  const { data: upcomingResponse, isLoading: upcomingLoading } = useBookings({
    upcoming: true,
    limit: 20,
  });
  const { data: pastResponse, isLoading: pastLoading } = useBookings({
    past: true,
    limit: 20,
  });

  const upcoming = upcomingResponse?.data ?? [];
  const past = pastResponse?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings ?? 0}
          icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Spent"
          value={`NPR ${(stats?.totalSpent ?? 0).toLocaleString()}`}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Upcoming Bookings"
          value={stats?.upcomingBookings ?? 0}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          isLoading={statsLoading}
        />
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-muted-foreground">No upcoming bookings.</p>
          ) : (
            <div className="space-y-3">
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
          {pastLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : past.length === 0 ? (
            <p className="text-muted-foreground">No past bookings.</p>
          ) : (
            <div className="space-y-3">
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

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-4">
      <div>
        <p className="font-medium">{booking.room.title}</p>
        <p className="text-sm text-muted-foreground">{booking.room.location}</p>
        <p className="text-sm">
          {new Date(booking.checkIn).toLocaleDateString('en-GB')} -{' '}
          {new Date(booking.checkOut).toLocaleDateString('en-GB')}
        </p>
      </div>
      <div className="text-right space-y-1">
        <p className="font-bold">NPR {booking.totalPrice.toLocaleString()}</p>
        <Badge
          variant={
            booking.paymentStatus === 'paid'
              ? 'default'
              : booking.paymentStatus === 'pending'
                ? 'secondary'
                : 'destructive'
          }
          className="capitalize"
        >
          {booking.paymentStatus}
        </Badge>
      </div>
    </div>
  );
}
```

The component is now under 100 lines because:
- No `useState`/`useEffect` for data -- React Query handles all of it
- No raw `fetch` -- everything flows through Axios + the service layer
- Stats cards reuse the `<StatsCard>` we built once for the owner dashboard

---

## 27.6 Toast Notifications with Sonner

We introduced Sonner back in Lesson 17 as part of the React Query setup. Every mutation hook in the app (`useCreateBooking`, `useDeleteRoom`, `useInitiateEsewaPayment`, `useMarkBookingPaid`, ...) already shows a success or error toast inside its `onSuccess` / `onError` callbacks. This section is a quick recap of the pattern -- you should not be adding ad-hoc toasts in components anymore.

### The Pattern (Already Wired)

The `<Toaster />` is mounted once at the root next to `QueryClientProvider`:

```tsx
// webapp/src/main.tsx (from Lesson 17)
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

We already built a reusable `ConfirmDialog` component in Lesson 11 and used it for task deletion in Lesson 13 and room deletion in Lesson 23. The same component works everywhere:

```tsx
// Already created in src/components/ConfirmDialog.tsx (Lesson 11)
// Props: trigger, title, description, confirmLabel, cancelLabel, variant, onConfirm
```

### Usage Examples Across the App

The mutation hooks already handle toasts and cache invalidation, so the `onConfirm` is just `mutate(id)`.

**Delete a room (owner portal):**

```tsx
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useDeleteRoom } from '@/hooks/useRooms';

function DeleteRoomButton({ room }: { room: Room }) {
  const { mutate: deleteRoom } = useDeleteRoom();

  return (
    <ConfirmDialog
      trigger={<Button variant="destructive" size="sm">Delete Room</Button>}
      title="Delete Room"
      description={`Are you sure you want to delete "${room.title}"? All bookings for this room will also be affected.`}
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={() => deleteRoom(room._id)}
    />
  );
}
```

**Cancel a booking (user portal):**

```tsx
import { useCancelBooking } from '@/hooks/useBookings';

function CancelBookingButton({ booking }: { booking: Booking }) {
  const { mutate: cancelBooking } = useCancelBooking();

  return (
    <ConfirmDialog
      trigger={<Button variant="outline" size="sm">Cancel Booking</Button>}
      title="Cancel Booking"
      description="Are you sure you want to cancel this booking? If you paid via eSewa, a refund will be processed."
      confirmLabel="Cancel Booking"
      variant="destructive"
      onConfirm={() => cancelBooking(booking._id)}
    />
  );
}
```

**This is the benefit of building reusable components and hooks early** -- one `ConfirmDialog` (from Lesson 11) plus one mutation hook (from Lesson 17) gives you a confirm-and-delete flow with toasts and cache invalidation in a handful of lines.

---

## 27.8 Form Loading States

When a form is submitting, the user should see clear feedback. Disable the submit button and show a spinner or "Loading..." text:

```tsx
// webapp/src/components/SubmitButton.tsx
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

### Centralised Error Extraction

Update the Axios instance to extract `error` from the standard response envelope and re-throw a clean `Error` with the meaningful message:

```typescript
// webapp/src/services/api.ts
import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Extract the API's `error` message so every caller sees something useful
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; details?: { field: string; message: string }[] }>) => {
    const apiError = error.response?.data;
    const firstDetail = apiError?.details?.[0]?.message;
    const message = firstDetail || apiError?.error || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
```

Now every mutation hook's `onError: (error: Error) => toast.error(error.message)` automatically shows the real API message -- e.g. "Title must be between 3 and 100 characters" rather than "Request failed with status code 400".

This single change improves error quality across the entire app, including all the mutation hooks from previous lessons.

---

## 27.10 Mobile-Responsive Navigation

On mobile devices, a horizontal navigation bar does not fit. We need a hamburger menu that opens a slide-out panel.

### Install Sheet

```bash
npx shadcn@latest add sheet
```

### Responsive Navigation Component

```tsx
// webapp/src/components/Navbar.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Navbar() {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/rooms', label: 'Rooms' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/bookings', label: 'My Bookings' },
  ];

  return (
    <nav className="border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold">
          BookingApp
        </Link>

        {/* Desktop Navigation -- hidden on mobile */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <Button variant="outline" size="sm">
            Log Out
          </Button>
        </div>

        {/* Mobile Hamburger -- visible only on mobile */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                {/* Hamburger icon (three lines) */}
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-lg font-medium hover:text-primary"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Button variant="outline" className="mt-4">
                  Log Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
```

Key points:
- `hidden md:flex` -- the desktop nav is hidden on small screens and visible from medium screens upward.
- `md:hidden` -- the hamburger button is only visible on small screens.
- The `Sheet` component slides in from the right and shows the navigation links vertically.
- Clicking a link closes the sheet by calling `setOpen(false)`.

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

4. **User dashboard:** Build the user dashboard using `useUserStats()` and the existing `useBookings()` hook with filters. Format dates with `en-GB` (DD/MM/YYYY).

5. **Confirmation dialogs:** Wire the `<ConfirmDialog>` from Lesson 11 around the destructive mutations (`useDeleteRoom`, `useCancelBooking`). Verify the toast and cache invalidation happen automatically from the hook.

6. **Mobile navigation:** Implement the responsive navbar with a hamburger menu using shadcn `Sheet`. Test it by resizing your browser window to a mobile width (below 768px).

7. **Axios error interceptor:** Add the response interceptor to `services/api.ts` so every mutation hook surfaces the API's `error` (or first `details[0].message`) in its toast. Trigger a validation error and confirm the toast shows the real message rather than "Request failed with status code 400".

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
- **Confirmation dialogs** (Lesson 11 `<ConfirmDialog>`) combine with mutation hooks for a one-line destructive flow.
- **Responsive navigation** with shadcn `Sheet` + a Tailwind `md:hidden` / `hidden md:flex` split.
- **Resist generic helpers** (`useFetch`, `handleAction`) -- React Query mutation/query hooks already do everything they would, with better caching and invalidation.
