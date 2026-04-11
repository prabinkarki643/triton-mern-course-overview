# Lesson 27: Dashboards, Stats & Polish

## What You Will Learn
- Building an owner dashboard with statistics cards and revenue data
- Using MongoDB aggregation pipelines to calculate stats on the server
- Building a user dashboard with booking history
- Adding toast notifications with shadcn Sonner
- Implementing confirmation dialogs for destructive actions
- Adding loading states and proper error messages
- Making the navigation responsive with a mobile hamburger menu
- Extracting reusable hooks for cleaner code

---

## 27.1 Why Dashboards Matter

A dashboard gives users a quick overview of what matters to them. In our booking application:

- **Owners** want to know: How many rooms do I have? How many bookings? How much revenue? Which bookings are pending?
- **Users** want to know: What are my upcoming bookings? What have I spent in total?

We will build both dashboards, then polish the entire application with proper notifications, confirmations, and mobile support.

---

## 27.2 Owner Dashboard: Backend Stats Endpoint

MongoDB's aggregation pipeline lets us calculate statistics directly in the database, which is far more efficient than fetching all records and counting in JavaScript.

```typescript
// backend/src/routes/dashboard.ts
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking';
import { Room } from '../models/Room';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Owner dashboard stats
router.get('/owner/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.userId);

    // Get all room IDs belonging to this owner
    const ownerRooms = await Room.find({ owner: ownerId }).select('_id');
    const ownerRoomIds = ownerRooms.map((room) => room._id);

    // Count total rooms
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
      totalRooms,
      ...bookingStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

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

The dashboard should also show the most recent bookings:

```typescript
// Add to backend/src/routes/dashboard.ts

// Owner's recent bookings
router.get('/owner/recent-bookings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.userId);

    const ownerRooms = await Room.find({ owner: ownerId }).select('_id');
    const ownerRoomIds = ownerRooms.map((room) => room._id);

    const recentBookings = await Booking.find({ room: { $in: ownerRoomIds } })
      .populate('user', 'name email')
      .populate('room', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(recentBookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent bookings' });
  }
});
```

---

## 27.4 Owner Dashboard: Frontend

Now build the dashboard UI using shadcn Card components:

```tsx
// webapp/src/pages/OwnerDashboard.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalRooms: number;
  totalBookings: number;
  totalRevenue: number;
  confirmedBookings: number;
  pendingBookings: number;
  paidBookings: number;
}

interface RecentBooking {
  _id: string;
  user: { name: string; email: string };
  room: { title: string };
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
}

export function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          fetch('/api/dashboard/owner/stats'),
          fetch('/api/dashboard/owner/recent-bookings'),
        ]);

        const statsData = await statsRes.json();
        const bookingsData = await bookingsRes.json();

        setStats(statsData);
        setRecentBookings(bookingsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <p className="text-center py-8">Loading dashboard...</p>;
  }

  if (!stats) {
    return <p className="text-center py-8">Failed to load dashboard data.</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Owner Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Rooms" value={stats.totalRooms} />
        <StatsCard title="Total Bookings" value={stats.totalBookings} />
        <StatsCard
          title="Total Revenue"
          value={`NPR ${stats.totalRevenue.toLocaleString()}`}
        />
        <StatsCard title="Pending Bookings" value={stats.pendingBookings} />
      </div>

      {/* Recent Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <p className="text-muted-foreground">No bookings yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>{booking.user.name}</TableCell>
                    <TableCell>{booking.room.title}</TableCell>
                    <TableCell>
                      {new Date(booking.checkIn).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell>
                      {new Date(booking.checkOut).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell>NPR {booking.totalPrice}</TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentBadge status={booking.paymentStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Reusable stats card component
function StatsCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// Status badge with colour coding
function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'confirmed'
      ? 'default'
      : status === 'pending'
        ? 'secondary'
        : 'destructive';

  return <Badge variant={variant}>{status}</Badge>;
}

// Payment status badge with colour coding
function PaymentBadge({ status }: { status: string }) {
  const variant =
    status === 'paid'
      ? 'default'
      : status === 'pending'
        ? 'secondary'
        : 'destructive';

  return <Badge variant={variant}>{status}</Badge>;
}
```

---

## 27.5 User Dashboard

The user dashboard shows their own bookings and spending:

```typescript
// Add to backend/src/routes/dashboard.ts

// User dashboard stats
router.get('/user/stats', authMiddleware, async (req: Request, res: Response) => {
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
            $sum: {
              $cond: [{ $gte: ['$checkIn', new Date()] }, 1, 0],
            },
          },
        },
      },
    ]);

    const userStats = stats[0] || {
      totalBookings: 0,
      totalSpent: 0,
      upcomingBookings: 0,
    };

    res.json(userStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// User's bookings (upcoming and past)
router.get('/user/bookings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const now = new Date();

    const [upcoming, past] = await Promise.all([
      Booking.find({ user: userId, checkIn: { $gte: now } })
        .populate('room', 'title location price')
        .sort({ checkIn: 1 }),
      Booking.find({ user: userId, checkIn: { $lt: now } })
        .populate('room', 'title location price')
        .sort({ checkIn: -1 })
        .limit(20),
    ]);

    res.json({ upcoming, past });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user bookings' });
  }
});
```

```tsx
// webapp/src/pages/UserDashboard.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UserStats {
  totalBookings: number;
  totalSpent: number;
  upcomingBookings: number;
}

interface UserBooking {
  _id: string;
  room: { title: string; location: string };
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
}

export function UserDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [upcoming, setUpcoming] = useState<UserBooking[]>([]);
  const [past, setPast] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          fetch('/api/dashboard/user/stats'),
          fetch('/api/dashboard/user/bookings'),
        ]);

        setStats(await statsRes.json());
        const bookingsData = await bookingsRes.json();
        setUpcoming(bookingsData.upcoming);
        setPast(bookingsData.past);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <p className="text-center py-8">Loading dashboard...</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalBookings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                NPR {stats.totalSpent.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Upcoming Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
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
          {past.length === 0 ? (
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

function BookingCard({ booking }: { booking: UserBooking }) {
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
        <p className="font-bold">NPR {booking.totalPrice}</p>
        <Badge
          variant={
            booking.paymentStatus === 'paid'
              ? 'default'
              : booking.paymentStatus === 'pending'
                ? 'secondary'
                : 'destructive'
          }
        >
          {booking.paymentStatus}
        </Badge>
      </div>
    </div>
  );
}
```

---

## 27.6 Toast Notifications with Sonner

Currently, when a user performs an action (creates a booking, deletes a room), they get no feedback apart from the page changing. Toast notifications are small messages that appear briefly to confirm an action.

### Install Sonner

shadcn/ui includes a Sonner component. Add it to your project:

```bash
npx shadcn@latest add sonner
```

### Set Up the Toaster

Add the `<Toaster />` component to your app layout so toasts can appear anywhere:

```tsx
// webapp/src/App.tsx
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <>
      {/* Your existing routes and layout */}
      <Toaster position="top-right" />
    </>
  );
}
```

### Using Toasts

Import the `toast` function and call it after successful actions:

```tsx
import { toast } from 'sonner';

// After creating a booking
const handleBooking = async () => {
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) throw new Error('Booking failed');

    const booking = await response.json();
    toast.success('Booking created successfully!');
    navigate('/dashboard');
  } catch (error) {
    toast.error('Failed to create booking. Please try again.');
  }
};

// After deleting a room
const handleDelete = async (roomId: string) => {
  try {
    await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
    toast.success('Room deleted.');
    refreshRooms();
  } catch (error) {
    toast.error('Could not delete room.');
  }
};

// After marking payment as received
const handleMarkPaid = async (bookingId: string) => {
  try {
    await fetch(`/api/bookings/${bookingId}/mark-paid`, { method: 'PATCH' });
    toast.success('Payment marked as received.');
  } catch (error) {
    toast.error('Failed to update payment status.');
  }
};
```

Toast types available:
- `toast.success('...')` -- green, for successful actions
- `toast.error('...')` -- red, for failures
- `toast.warning('...')` -- yellow, for warnings
- `toast.info('...')` -- blue, for informational messages
- `toast.loading('...')` -- shows a spinner

---

## 27.7 Confirmation Dialogs for Destructive Actions

When a user clicks "Delete Room" or "Cancel Booking", they should see a confirmation dialog first. Accidental deletions are frustrating.

We already built a reusable `ConfirmDialog` component in Lesson 11 and used it for task deletion in Lesson 13 and room deletion in Lesson 23. The same component works everywhere:

```tsx
// Already created in src/components/ConfirmDialog.tsx (Lesson 11)
// Props: trigger, title, description, confirmLabel, cancelLabel, variant, onConfirm
```

### Usage Examples Across the App

**Delete a room (owner portal):**

```tsx
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

<ConfirmDialog
  trigger={
    <Button variant="destructive" size="sm">Delete Room</Button>
  }
  title="Delete Room"
  description={`Are you sure you want to delete "${room.title}"? All bookings for this room will also be affected.`}
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={async () => {
    await deleteRoom(room._id);
    toast.success('Room deleted.');
  }}
/>
```

**Cancel a booking (user portal):**

```tsx
<ConfirmDialog
  trigger={
    <Button variant="outline" size="sm">Cancel Booking</Button>
  }
  title="Cancel Booking"
  description="Are you sure you want to cancel this booking? If you paid via eSewa, a refund will be processed."
  confirmLabel="Cancel Booking"
  variant="destructive"
  onConfirm={() => cancelBooking(booking._id)}
/>
```

**This is the benefit of building reusable components early** -- one `ConfirmDialog` built in Lesson 11 is now used across the entire application with zero duplication.

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

Usage:

```tsx
function CreateRoomForm() {
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: RoomFormData) => {
    setLoading(true);
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      toast.success('Room created!');
    } catch (error) {
      toast.error('Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ... form fields ... */}
      <SubmitButton loading={loading} label="Create Room" loadingLabel="Creating..." />
    </form>
  );
}
```

---

## 27.9 Proper Error Messages from the API

Instead of showing generic "Something went wrong" messages, display the actual error from the API:

```typescript
// webapp/src/utils/api.ts

/**
 * A helper that fetches from the API and throws a meaningful error
 * if the response is not OK.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // Use the error message from the API if available
    throw new Error(data.error || data.message || 'An unexpected error occurred');
  }

  return data as T;
}
```

Now use this everywhere instead of raw `fetch`:

```tsx
import { apiFetch } from '@/utils/api';
import { toast } from 'sonner';

const handleDelete = async (roomId: string) => {
  try {
    await apiFetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
    toast.success('Room deleted.');
  } catch (error) {
    // The error message comes from the API, so it is specific and helpful
    toast.error(error instanceof Error ? error.message : 'Failed to delete room.');
  }
};
```

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
            <SheetTrigger render={
              <Button variant="ghost" size="sm">
                {/* Hamburger icon (three lines) */}
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Button>
            } />
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

## 27.11 Code Cleanup: Extract Reusable Hooks

As your application grows, you will notice repeated patterns. Extract these into custom hooks:

### useFetch Hook

```typescript
// webapp/src/hooks/useFetch.ts
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(url);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}
```

### Usage

Before (repetitive code in every component):

```tsx
// Before -- this pattern is repeated everywhere
const [stats, setStats] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/dashboard/owner/stats')
    .then((res) => res.json())
    .then(setStats)
    .finally(() => setLoading(false));
}, []);
```

After (clean and reusable):

```tsx
// After -- one line
const { data: stats, loading, error, refetch } = useFetch<DashboardStats>(
  '/api/dashboard/owner/stats'
);
```

This hook handles loading state, error state, and provides a `refetch` function to reload the data.

---

## 27.12 Consistent Error Handling Pattern

Establish a consistent pattern for error handling across all API calls:

```typescript
// webapp/src/utils/handleAction.ts
import { toast } from 'sonner';

/**
 * Wraps an async action with loading state, success toast, and error toast.
 * Use for mutations (create, update, delete).
 */
export async function handleAction(
  action: () => Promise<void>,
  options: {
    setLoading?: (loading: boolean) => void;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
  }
) {
  const {
    setLoading,
    successMessage = 'Done!',
    errorMessage = 'Something went wrong.',
    onSuccess,
  } = options;

  setLoading?.(true);
  try {
    await action();
    toast.success(successMessage);
    onSuccess?.();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : errorMessage;
    toast.error(message);
  } finally {
    setLoading?.(false);
  }
}
```

Usage:

```tsx
const [loading, setLoading] = useState(false);

const deleteRoom = (roomId: string) => {
  handleAction(
    () => apiFetch(`/api/rooms/${roomId}`, { method: 'DELETE' }),
    {
      setLoading,
      successMessage: 'Room deleted.',
      errorMessage: 'Could not delete room.',
      onSuccess: () => refetchRooms(),
    }
  );
};
```

---

## Practice Exercises

1. **Owner dashboard:** Implement the owner stats endpoint and the dashboard page with four stats cards. Verify the aggregation pipeline returns correct values by creating test bookings.

2. **User dashboard:** Build the user dashboard showing upcoming and past bookings. Format dates using `en-GB` locale (DD/MM/YYYY).

3. **Toast notifications:** Install Sonner and add success/error toasts to at least three different actions in your application (e.g. creating a booking, deleting a room, marking as paid).

4. **Confirmation dialogs:** Add a confirmation dialog to every destructive action (delete room, cancel booking). The dialog should clearly explain what will happen.

5. **Mobile navigation:** Implement the responsive navbar with a hamburger menu. Test it by resizing your browser window to a mobile width (below 768px).

6. **Refactor:** Replace at least two components that use raw `fetch` with the `useFetch` hook. Compare the before and after code -- which is easier to read?

7. **Challenge:** Add a line chart to the owner dashboard showing revenue per month. You may use a charting library like `recharts` (install with `npm install recharts`).

---

## Key Takeaways

- **MongoDB aggregation pipelines** are powerful for computing statistics directly in the database without fetching all records into your application.
- **Toast notifications** (Sonner) provide immediate, non-intrusive feedback when users perform actions.
- **Confirmation dialogs** (AlertDialog) prevent accidental destructive actions like deletions.
- **Loading states** on buttons tell the user that something is happening and prevent double submissions.
- **Responsive navigation** with a Sheet/hamburger menu ensures your application works well on mobile devices.
- **Custom hooks** like `useFetch` reduce code repetition and make components cleaner.
- **Consistent error handling** with utility functions ensures every API call displays appropriate feedback.
