# Lesson 23: Owner Portal Frontend

## What You Will Learn
- Building an owner layout with sidebar navigation using shadcn components
- Defining a **roomApi service layer** with Axios (mirroring the L17 `todoApi` pattern)
- Building a **`useRooms` hook family** with a typed `roomKeys` factory: `useRooms`, `useRoom`, `useCreateRoom`, `useUpdateRoom`, `useAddRoomImages`, `useDeleteRoomImage`, `useDeleteRoom`
- Listing the owner's rooms with the **generic `<DataTable>`** from Lesson 17.1 (server-side pagination + URL-synced filters)
- Defining typed columns with `useRoomColumns()` returning `ColumnDef<Room>[]`
- Writing a complete form with the new **shadcn `Field` primitives** (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup`) driven by React Hook Form's `Controller`
- Validating with Zod and deriving types via `z.infer`
- Building `FormData` for multipart file uploads with Axios (for room creation and adding more images later)
- Previewing selected images before uploading and revoking object URLs on unmount
- Editing rooms with a **split UI**: text fields save via JSON PUT; image gallery uses separate Add/Delete endpoints so individual photos can be added or removed without touching the whole gallery
- Deleting rooms with shadcn `AlertDialog` confirmation
- Showing Sonner **toasts** inside mutation hooks for consistent success / error feedback

---

## 23.1 The Big Picture

The owner portal is a protected area where room owners manage their listings. It is built on the same patterns we already used for todos: an Axios service layer, focused React Query hooks, a reusable `<DataTable>`, and shadcn `Field` primitives with Zod.

```
Owner Portal Layout (sidebar + main)
├── My Rooms             (DataTable: image, title, location, price, capacity, status, actions)
│   ├── Filters (search, location, status) -> URL params
│   ├── Pagination       -> URL params (?page=2)
│   └── Row actions      -> Edit (link) + Delete (AlertDialog)
│
├── Add Room             (shadcn Field + Zod + image upload)
│   ├── Text fields (title, description, location, price, capacity)
│   ├── Amenities checkboxes
│   ├── Image upload with previews (URL.createObjectURL)
│   └── Submit -> FormData -> POST /api/rooms (multipart)
│
└── Edit Room            (same form, pre-filled via form.reset())
    ├── Text fields -> Save -> JSON -> PUT /api/rooms/:id
    └── Image gallery
        ├── Each current image has a delete (X) button
        │   -> DELETE /api/rooms/:id/images/:imageName
        └── "Upload more" file input (multi-select with previews)
            -> POST /api/rooms/:id/images (multipart)
```

We are **not reinventing patterns** here. Everything builds on:

- **Lesson 17** -- Axios service layer, `roomKeys` factory, mutation hooks with toasts
- **Lesson 17.1** -- generic `<DataTable>`, `useSearchParams` filter sync, server-side pagination
- **Lesson 12** -- shadcn `Field` primitives + Zod + React Hook Form (`Controller`)

---

## 23.2 Installing Dependencies

If you already completed Lessons 17 and 17.1 in the Todo app, most of these are installed. For BookMyRoom (`webapp/`) ensure you have:

```bash
cd webapp
npm install @tanstack/react-query @tanstack/react-table axios react-hook-form zod @hookform/resolvers lucide-react
npx shadcn@latest add field input textarea label checkbox button card table select alert-dialog skeleton sonner badge
```

> **Note:** We use the new shadcn `field` primitives (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup`) -- **not** the older `form` block. The `Field` primitives compose directly with React Hook Form's `Controller`, giving us a leaner API and full control over each input.

---

## 23.3 Axios Instance with JWT Interceptor

The owner portal is protected, so every request must carry the JWT created in Lesson 21.

```ts
// webapp/src/services/api.ts
import axios, { AxiosInstance } from 'axios';

const API_URL: string =
  (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token: string | null = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export { API_URL };
```

### React Query + Toaster Provider

```tsx
// webapp/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## 23.4 Room Types

The shape of a room and the paginated envelope returned by the API. Note we use `meta` (consistent with the L17.1 todo response).

```ts
// webapp/src/types/room.ts
export type RoomStatus = 'active' | 'inactive';

export interface Room {
  _id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  capacity: number;
  amenities: string[];
  images: string[];
  status: RoomStatus;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface RoomsResponse {
  data: Room[];
  meta: PaginationMeta;
}

export interface RoomFilters {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  status?: RoomStatus;
  sort?: string;
}

// Body of PUT /api/rooms/:id -- text fields only, all optional
export interface UpdateRoomData {
  title?: string;
  description?: string;
  location?: string;
  price?: number;
  capacity?: number;
  amenities?: string[];
}
```

---

## 23.5 The `roomApi` Service Layer

This is identical in spirit to `todoApi` from Lesson 17 -- one method per backend endpoint, fully typed, automatic JSON parsing, automatic error throwing on 4xx/5xx.

- **Create** uses `FormData` because creation includes the initial images
- **Update** uses plain JSON -- text fields only (see the matching note in Lesson 22.14)
- Image management has its own two methods: `addImages` (POST) and `deleteImage` (DELETE)

```ts
// webapp/src/services/roomApi.ts
import api from './api';
import type {
  Room,
  RoomFilters,
  RoomsResponse,
  UpdateRoomData,
} from '../types/room';

export const roomApi = {
  // GET /api/rooms?page=&limit=&search=&location=&status=
  async getAll(filters: RoomFilters = {}): Promise<RoomsResponse> {
    const { data } = await api.get<RoomsResponse>('/rooms', { params: filters });
    return data;
  },

  // GET /api/rooms/my-rooms -- only the current owner's rooms
  async getMine(filters: RoomFilters = {}): Promise<RoomsResponse> {
    const { data } = await api.get<RoomsResponse>('/rooms/my-rooms', {
      params: filters,
    });
    return data;
  },

  // GET /api/rooms/:id
  async getById(id: string): Promise<Room> {
    const { data } = await api.get<{ data: Room }>(`/rooms/${id}`);
    return data.data;
  },

  // POST /api/rooms (multipart/form-data) -- text + initial images in one call
  async create(formData: FormData): Promise<Room> {
    const { data } = await api.post<{ data: Room }>('/rooms', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  // PUT /api/rooms/:id -- text fields only, plain JSON
  async update(id: string, payload: UpdateRoomData): Promise<Room> {
    const { data } = await api.put<{ data: Room }>(`/rooms/${id}`, payload);
    return data.data;
  },

  // POST /api/rooms/:id/images -- append new images
  async addImages(id: string, formData: FormData): Promise<Room> {
    const { data } = await api.post<{ data: Room }>(
      `/rooms/${id}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },

  // DELETE /api/rooms/:id/images/:imageName -- remove one image
  async deleteImage(id: string, imageName: string): Promise<void> {
    await api.delete(`/rooms/${id}/images/${imageName}`);
  },

  // DELETE /api/rooms/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/rooms/${id}`);
  },
};
```

> Make sure your `types/room.ts` exports an `UpdateRoomData` matching the backend's `updateRoomValidator` -- all fields optional, no `images` field.

**Notice:** the service knows nothing about React Query. It is pure HTTP. This is the same separation we used in Lesson 17 -- the API service is reusable from anywhere (a hook, a script, a test).

---

## 23.6 The `useRooms` Hook Family

One focused hook per action. Each mutation invalidates the right keys and fires a toast. The pattern is identical to `useTodos` from Lesson 17.

```ts
// webapp/src/hooks/useRooms.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { roomApi } from '../services/roomApi';
import type { RoomFilters, UpdateRoomData } from '../types/room';

// Centralised query keys -- one source of truth for cache invalidation
export const roomKeys = {
  all: ['rooms'] as const,
  lists: () => [...roomKeys.all, 'list'] as const,
  list: (filters: RoomFilters) => [...roomKeys.lists(), filters] as const,
  mine: (filters: RoomFilters) => [...roomKeys.all, 'mine', filters] as const,
  details: () => [...roomKeys.all, 'detail'] as const,
  detail: (id: string) => [...roomKeys.details(), id] as const,
};

// --- QUERY HOOKS ---------------------------------------------------------

// Public rooms list (used in the public browse page in Lesson 24)
export function useRooms(filters: RoomFilters = {}) {
  return useQuery({
    queryKey: roomKeys.list(filters),
    queryFn: () => roomApi.getAll(filters),
    placeholderData: (previousData) => previousData,
  });
}

// Owner's rooms list (used in the My Rooms page below)
export function useMyRooms(filters: RoomFilters = {}) {
  return useQuery({
    queryKey: roomKeys.mine(filters),
    queryFn: () => roomApi.getMine(filters),
    placeholderData: (previousData) => previousData,
  });
}

// Single room by id -- used by Edit page and public detail page
export function useRoom(id: string) {
  return useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => roomApi.getById(id),
    enabled: !!id,
  });
}

// --- MUTATION HOOKS ------------------------------------------------------

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => roomApi.create(formData),
    onSuccess: () => {
      toast.success('Room created successfully');
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create room');
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoomData }) =>
      roomApi.update(id, payload),
    onSuccess: (_room, variables) => {
      toast.success('Room updated successfully');
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(variables.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update room');
    },
  });
}

// Append new images to a room
export function useAddRoomImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      roomApi.addImages(id, formData),
    onSuccess: (_room, variables) => {
      toast.success('Images uploaded');
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload images');
    },
  });
}

// Remove one image from a room
export function useDeleteRoomImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, imageName }: { id: string; imageName: string }) =>
      roomApi.deleteImage(id, imageName),
    onSuccess: (_void, variables) => {
      toast.success('Image removed');
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove image');
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roomApi.delete(id),
    onSuccess: () => {
      toast.success('Room deleted');
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete room');
    },
  });
}
```

**Why the `roomKeys` factory matters:**

```
roomKeys.all                      => ['rooms']
roomKeys.lists()                  => ['rooms', 'list']
roomKeys.list({page:1})           => ['rooms', 'list', {page:1}]
roomKeys.mine({page:1})           => ['rooms', 'mine', {page:1}]
roomKeys.detail('abc123')         => ['rooms', 'detail', 'abc123']
```

Invalidating `roomKeys.all` after a delete refreshes **every** room query -- both the public browse list and the owner's "My Rooms" list -- in one line. This is what keeps the UI in sync.

---

## 23.7 The URL Filter Hook for Rooms

Reusing the same idea from Lesson 17.1 -- store the table state in the URL so filters are bookmarkable and refresh-proof.

```ts
// webapp/src/hooks/useRoomsFilters.ts
import { useSearchParams } from 'react-router-dom';
import type { RoomFilters, RoomStatus } from '../types/room';

export function useRoomsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: RoomFilters = {
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 10,
    search: searchParams.get('search') || undefined,
    location: searchParams.get('location') || undefined,
    status: (searchParams.get('status') as RoomStatus) || undefined,
    sort: searchParams.get('sort') || undefined,
  };

  const setFilters = (updates: Partial<RoomFilters>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '' || value === null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    setSearchParams(next, { replace: true });
  };

  // Changing any filter jumps back to page 1
  const setFilter = (key: keyof RoomFilters, value: RoomFilters[typeof key]) => {
    setFilters({ [key]: value, page: 1 });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  return { filters, setFilters, setFilter, resetFilters };
}
```

---

## 23.8 Owner Layout with Sidebar

The owner portal uses a sidebar layout shared by every owner page:

```tsx
// webapp/src/components/owner/OwnerLayout.tsx
import { NavLink, Outlet } from 'react-router-dom';
import { Home, PlusCircle, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: '/owner/rooms', label: 'My Rooms', icon: <Home className="h-4 w-4" /> },
  { to: '/owner/rooms/new', label: 'Add Room', icon: <PlusCircle className="h-4 w-4" /> },
  { to: '/owner/bookings', label: 'Booking Requests', icon: <CalendarCheck className="h-4 w-4" /> },
];

function OwnerLayout(): JSX.Element {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/30 p-4">
        <h2 className="mb-6 text-lg font-semibold">Owner Portal</h2>
        <nav className="space-y-1">
          {navItems.map((item: NavItem) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/owner/rooms'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default OwnerLayout;
```

### Owner Routes

```tsx
// webapp/src/App.tsx (relevant section)
import { Routes, Route } from 'react-router-dom';
import OwnerLayout from './components/owner/OwnerLayout';
import MyRooms from './pages/owner/MyRooms';
import AddRoom from './pages/owner/AddRoom';
import EditRoom from './pages/owner/EditRoom';
import OwnerBookings from './pages/owner/OwnerBookings';

function App(): JSX.Element {
  return (
    <Routes>
      {/* ... public routes ... */}

      <Route path="/owner" element={<OwnerLayout />}>
        <Route path="rooms" element={<MyRooms />} />
        <Route path="rooms/new" element={<AddRoom />} />
        <Route path="rooms/:id/edit" element={<EditRoom />} />
        <Route path="bookings" element={<OwnerBookings />} />
      </Route>
    </Routes>
  );
}
```

---

## 23.9 Room Columns -- `useRoomColumns()`

A custom hook returning a typed `ColumnDef<Room>[]`. Each column knows nothing about pagination or filters -- the `<DataTable>` handles all that.

```tsx
// webapp/src/components/owner/room-columns.tsx
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { RoomRowActions } from './room-row-actions';
import { API_URL } from '@/services/api';
import type { Room } from '@/types/room';

const statusVariant: Record<Room['status'], 'default' | 'secondary'> = {
  active: 'default',
  inactive: 'secondary',
};

// Helper: build the absolute image URL from the stored filename
const buildImageUrl = (filename: string): string => {
  const base: string = API_URL.replace(/\/api\/?$/, '');
  return `${base}/uploads/rooms/${filename}`;
};

export function useRoomColumns(): ColumnDef<Room>[] {
  return [
    {
      id: 'image',
      header: '',
      cell: ({ row }) => {
        const first: string | undefined = row.original.images[0];
        return (
          <div className="h-12 w-16 overflow-hidden rounded-md bg-muted">
            {first ? (
              <img
                src={buildImageUrl(first)}
                alt={row.original.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <span>
          &pound;{row.original.price}
          <span className="text-xs text-muted-foreground"> / night</span>
        </span>
      ),
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => `${row.original.capacity} guests`,
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
      id: 'actions',
      header: '',
      cell: ({ row }) => <RoomRowActions room={row.original} />,
    },
  ];
}
```

---

## 23.10 Row Actions -- Edit Link + Delete with `AlertDialog`

Each row has an edit link (navigates to the edit page) and a delete button guarded by an `AlertDialog` confirmation.

```tsx
// webapp/src/components/owner/room-row-actions.tsx
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { useDeleteRoom } from '@/hooks/useRooms';
import type { Room } from '@/types/room';

interface RoomRowActionsProps {
  room: Room;
}

export function RoomRowActions({ room }: RoomRowActionsProps) {
  const { mutate: deleteRoom, isPending: isDeleting } = useDeleteRoom();

  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="icon">
        <Link to={`/owner/rooms/${room._id}/edit`} aria-label="Edit room">
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isDeleting} aria-label="Delete room">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this room?</AlertDialogTitle>
            <AlertDialogDescription>
              "{room.title}" will be permanently removed. All images and booking history
              for this room will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteRoom(room._id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

The success / error toasts come from `useDeleteRoom` itself -- this component does not need its own `onSuccess` callback.

---

## 23.11 Filters Bar -- Search + Status

Reuses the same debounced-search + `useSearchParams` pattern from Lesson 17.1.

```tsx
// webapp/src/components/owner/room-filters.tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoomsFilters } from '@/hooks/useRoomsFilters';

export function RoomFilters() {
  const { filters, setFilter, resetFilters } = useRoomsFilters();
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  // Debounce: wait 300ms after the last keystroke before updating the URL
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== (filters.search ?? '')) {
        setFilter('search', searchInput || undefined);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  const hasActiveFilters = !!filters.search || !!filters.location || !!filters.status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search by title or description..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="max-w-xs"
      />

      <Input
        placeholder="Location"
        value={filters.location ?? ''}
        onChange={(e) => setFilter('location', e.target.value || undefined)}
        className="max-w-[180px]"
      />

      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) =>
          setFilter('status', v === 'all' ? undefined : (v as 'active' | 'inactive'))
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}
```

---

## 23.12 Pagination Controls

Same as Lesson 17.1, wired to `useRoomsFilters`.

```tsx
// webapp/src/components/owner/room-pagination.tsx
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRoomsFilters } from '@/hooks/useRoomsFilters';
import type { PaginationMeta } from '@/types/room';

interface RoomPaginationProps {
  meta?: PaginationMeta;
}

export function RoomPagination({ meta }: RoomPaginationProps) {
  const { filters, setFilters } = useRoomsFilters();

  if (!meta) return null;
  const { page, totalPages, total, hasNextPage, hasPrevPage } = meta;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-2">
      <div className="text-sm text-muted-foreground">
        Showing page {page} of {totalPages} ({total} total)
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page</span>
        <Select
          value={String(filters.limit ?? 10)}
          onValueChange={(v) => setFilters({ limit: Number(v), page: 1 })}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: 1 })}
            disabled={!hasPrevPage}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: page - 1 })}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: page + 1 })}
            disabled={!hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFilters({ page: totalPages })}
            disabled={!hasNextPage}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 23.13 My Rooms Page -- Using `<DataTable>`

This is the orchestrator. Notice how short it is -- every piece is reusable.

```tsx
// webapp/src/pages/owner/MyRooms.tsx
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { RoomFilters } from '@/components/owner/room-filters';
import { RoomPagination } from '@/components/owner/room-pagination';
import { useRoomColumns } from '@/components/owner/room-columns';
import { useMyRooms } from '@/hooks/useRooms';
import { useRoomsFilters } from '@/hooks/useRoomsFilters';

function MyRooms(): JSX.Element {
  const { filters } = useRoomsFilters();
  const columns = useRoomColumns();
  const { data, isLoading } = useMyRooms(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Rooms</h1>
        <Button asChild>
          <Link to="/owner/rooms/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Link>
        </Button>
      </div>

      <RoomFilters />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="You have no rooms matching these filters. Add your first room to get started."
        pageCount={data?.meta.totalPages ?? 1}
        pageIndex={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 10}
      />

      <RoomPagination meta={data?.meta} />
    </div>
  );
}

export default MyRooms;
```

That is it -- 30 lines for a fully filterable, paginated, URL-synced rooms table with row actions. Every concept (`DataTable`, `useRoomColumns`, `useMyRooms`, `useRoomsFilters`) is reused from the patterns we already taught.

---

## 23.14 Room Form Schema (Zod)

A single schema used by both Add and Edit. We use `z.coerce.number()` for the numeric fields so HTML inputs (which emit strings) are converted cleanly.

```ts
// webapp/src/schemas/roomSchema.ts
import { z } from 'zod';

export const roomFormSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  location: z
    .string()
    .min(2, 'Location is required')
    .max(100, 'Location cannot exceed 100 characters'),
  price: z.coerce
    .number({ invalid_type_error: 'Price must be a number' })
    .positive('Price must be greater than 0'),
  capacity: z.coerce
    .number({ invalid_type_error: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(50, 'Capacity cannot exceed 50'),
  amenities: z.array(z.string()).optional().default([]),
});

export type RoomFormData = z.infer<typeof roomFormSchema>;

export const AMENITY_OPTIONS: string[] = [
  'WiFi',
  'Parking',
  'Air Conditioning',
  'Projector',
  'Whiteboard',
  'TV Screen',
  'Kitchen',
  'Accessible',
];
```

---

## 23.15 Image Preview Hook

Image previews use `URL.createObjectURL()` -- a browser API that creates a temporary URL pointing at a `File` already in memory. We **must** revoke the URL when the component unmounts (or when a new selection replaces it) to free memory.

```ts
// webapp/src/hooks/useImagePreviews.ts
import { useEffect, useState } from 'react';

const MAX_IMAGES = 5;

export function useImagePreviews() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Build previews whenever files change, and revoke them on cleanup
  useEffect(() => {
    if (files.length === 0) {
      setPreviews([]);
      return;
    }
    const urls: string[] = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);

    // Cleanup: revoke when files change again OR when the component unmounts
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const onSelect = (input: FileList | null): void => {
    if (!input) return;
    const arr: File[] = Array.from(input);
    if (arr.length > MAX_IMAGES) {
      // toast.error or alert -- we keep it simple here
      alert(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    setFiles(arr);
  };

  const clear = (): void => setFiles([]);

  return { files, previews, onSelect, clear };
}
```

**The key insight:** by putting `URL.createObjectURL` inside a `useEffect`, we get automatic cleanup on unmount or re-selection. No more leaked blob URLs.

---

## 23.16 Add Room Page -- shadcn `Field` Primitives

This is the modern shadcn pattern: small composable primitives (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup`) wrapped around a plain `<form>` and driven by React Hook Form's `Controller`. There is no `Form` provider component anymore -- just plain HTML plus the primitives.

```tsx
// webapp/src/pages/owner/AddRoom.tsx
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateRoom } from '@/hooks/useRooms';
import { useImagePreviews } from '@/hooks/useImagePreviews';
import {
  roomFormSchema,
  AMENITY_OPTIONS,
  type RoomFormData,
} from '@/schemas/roomSchema';

function AddRoom(): JSX.Element {
  const navigate = useNavigate();
  const { mutate: createRoom, isPending } = useCreateRoom();
  const { files, previews, onSelect } = useImagePreviews();

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      price: 0,
      capacity: 1,
      amenities: [],
    },
  });

  const onSubmit = (data: RoomFormData): void => {
    if (files.length === 0) {
      alert('Please select at least one image.');
      return;
    }

    // Build FormData for multipart upload
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('location', data.location);
    formData.append('price', String(data.price));
    formData.append('capacity', String(data.capacity));
    data.amenities?.forEach((a) => formData.append('amenities[]', a));
    files.forEach((file) => formData.append('images', file));

    createRoom(formData, {
      onSuccess: () => navigate('/owner/rooms'),
    });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add New Room</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          {/* Title */}
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Room Title</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Cosy 2BR apartment in central London"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Description */}
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  rows={4}
                  placeholder="Describe the room, its features, and what makes it special..."
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Location */}
          <Controller
            name="location"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="e.g. London, Manchester"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Price + Capacity side-by-side */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="price"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Price per Night (&pound;)</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    step="0.01"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Per-night rate shown to guests.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Maximum Capacity</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    max={50}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Maximum number of guests allowed.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Amenities -- multi-checkbox */}
          <Controller
            name="amenities"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Amenities</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITY_OPTIONS.map((amenity: string) => (
                    <label key={amenity} className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes(amenity) ?? false}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...(field.value ?? []), amenity]
                            : (field.value ?? []).filter((a: string) => a !== amenity);
                          field.onChange(next);
                        }}
                      />
                      <span className="text-sm">{amenity}</span>
                    </label>
                  ))}
                </div>
                <FieldDescription>Select all that apply.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Images -- managed outside the schema because Zod cannot validate files */}
          <Field>
            <FieldLabel htmlFor="images">Room Photos (1-5)</FieldLabel>
            <Input
              id="images"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => onSelect(e.target.files)}
            />
            <FieldDescription>
              Upload up to 5 images. JPG, PNG or WebP -- 5 MB max per file.
            </FieldDescription>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="aspect-video overflow-hidden rounded-md border"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </Field>
        </FieldGroup>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Creating Room...' : 'Create Room'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/owner/rooms')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddRoom;
```

### How the shadcn `Field` Pattern Works

The `Field` primitives are intentionally small. They group a label, input, description, and error message into one accessible block -- and they leave the input itself alone, so you can drop in any control (`Input`, `Textarea`, `Checkbox`, native `<select>`, custom widgets):

| Component | Job |
|-----------|-----|
| `<FieldGroup>` | Wraps a stack of `Field`s and applies consistent vertical spacing |
| `<Field data-invalid={...}>` | One field container -- accepts `data-invalid` so styles can react to errors |
| `<FieldLabel htmlFor="...">` | Standard label -- wire it to your input via `htmlFor` + `id` |
| `<FieldDescription>` | Helper text shown below the input |
| `<FieldError errors={[...]}>` | Renders one or more error messages with the right styling |

We bind each field to React Hook Form using `Controller`, which gives us both `field` (value, `onChange`, `name`, ref) and `fieldState` (`invalid`, `error`). The pattern is always the same:

1. `<Field data-invalid={fieldState.invalid}>`
2. `<FieldLabel htmlFor={field.name}>...</FieldLabel>`
3. The input with `{...field}`, `id={field.name}`, `aria-invalid={fieldState.invalid}`
4. Optional `<FieldDescription>` for helper text
5. `{fieldState.invalid && <FieldError errors={[fieldState.error]} />}`

This is more code per field than the old `Form` wrapper, but you get full control of the input and no hidden magic.

### Why Image Files Live Outside the Form

Zod and React Hook Form work brilliantly for serialisable data (strings, numbers, arrays). `File` objects are not serialisable, so we keep them in a separate hook (`useImagePreviews`). At submit time we merge them into a single `FormData` payload.

### How `FormData` for Multipart Works

JSON cannot carry files. `FormData` is a browser API that builds the `multipart/form-data` body -- the same encoding HTML forms with `enctype="multipart/form-data"` produce.

```ts
const formData = new FormData();
formData.append('title', 'My Room');           // text field
formData.append('amenities[]', 'WiFi');         // array element
formData.append('amenities[]', 'Parking');      // another array element
formData.append('images', fileObject1);         // file field
formData.append('images', fileObject2);         // multiple files -> same field name
```

Axios sends this with `Content-Type: multipart/form-data; boundary=...` so Multer on the backend can parse both the text fields and the files in one go.

---

## 23.17 Edit Room Page -- Split UI (Text Save + Image Gallery)

The edit page handles text fields and images **separately** -- mirroring the backend split from Lesson 22.14-22.16:

1. **Text fields** sit in the main form. "Save Changes" submits a plain JSON `PUT` via `useUpdateRoom`.
2. **The image gallery** lives below the form. Each existing image has a delete (X) button that calls `useDeleteRoomImage`. A separate "Upload more" file input calls `useAddRoomImages`.

The user can save text edits without touching images, add an extra photo without re-uploading the whole gallery, or remove a single bad photo without clearing everything. The form preview is pulled in from `useRoom(id)` and `form.reset()` once the data arrives.

```tsx
// webapp/src/pages/owner/EditRoom.tsx
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import {
  useRoom,
  useUpdateRoom,
  useAddRoomImages,
  useDeleteRoomImage,
} from '@/hooks/useRooms';
import { useImagePreviews } from '@/hooks/useImagePreviews';
import { API_URL } from '@/services/api';
import {
  roomFormSchema,
  AMENITY_OPTIONS,
  type RoomFormData,
} from '@/schemas/roomSchema';

function EditRoom(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: room, isLoading } = useRoom(id ?? '');
  const { mutate: updateRoom, isPending: isSaving } = useUpdateRoom();
  const { mutate: addImages, isPending: isUploading } = useAddRoomImages();
  const { mutate: deleteImage } = useDeleteRoomImage();
  const { files, previews, onSelect, clear: clearPreviews } = useImagePreviews();

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      price: 0,
      capacity: 1,
      amenities: [],
    },
  });

  // Pre-fill the form once the room data arrives
  useEffect(() => {
    if (room) {
      form.reset({
        title: room.title,
        description: room.description,
        location: room.location,
        price: room.price,
        capacity: room.capacity,
        amenities: room.amenities,
      });
    }
  }, [room, form]);

  // Save text fields -- plain JSON, no FormData
  const onSubmit = (data: RoomFormData): void => {
    if (!id) return;
    updateRoom(
      { id, payload: data },
      { onSuccess: () => navigate('/owner/rooms') }
    );
  };

  // Upload the picked images, then clear the previews
  const handleUploadImages = (): void => {
    if (!id || files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    addImages(
      { id, formData },
      { onSuccess: () => clearPreviews() }
    );
  };

  // Remove a single image straight from the gallery
  const handleDeleteImage = (imageName: string): void => {
    if (!id) return;
    deleteImage({ id, imageName });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!room) {
    return <div className="text-destructive">Room not found.</div>;
  }

  const baseUrl: string = API_URL.replace(/\/api\/?$/, '');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Room</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Room Title</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  rows={4}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="location"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="price"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Price per Night (&pound;)</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    step="0.01"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Maximum Capacity</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    max={50}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <Controller
            name="amenities"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Amenities</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITY_OPTIONS.map((amenity: string) => (
                    <label key={amenity} className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes(amenity) ?? false}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...(field.value ?? []), amenity]
                            : (field.value ?? []).filter((a: string) => a !== amenity);
                          field.onChange(next);
                        }}
                      />
                      <span className="text-sm">{amenity}</span>
                    </label>
                  ))}
                </div>
                <FieldDescription>Select all that apply.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

        </FieldGroup>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/owner/rooms')}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Image gallery -- managed independently from the form above */}
      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Photos</h2>
          <p className="text-sm text-muted-foreground">
            Hover an image to remove it, or add more below.
          </p>
        </div>

        {room.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {room.images.map((image) => (
              <div
                key={image}
                className="group relative aspect-video overflow-hidden rounded-md border"
              >
                <img
                  src={`${baseUrl}/uploads/rooms/${image}`}
                  alt="Room"
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDeleteImage(image)}
                  aria-label="Delete image"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No photos yet.</p>
        )}

        <div className="space-y-3">
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            onChange={(e) => onSelect(e.target.files)}
          />

          {previews.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="aspect-video overflow-hidden rounded-md border"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={handleUploadImages}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : `Upload ${files.length} image(s)`}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default EditRoom;
```

---

## 23.18 Displaying Room Images

Across the portal, room images come from filenames stored in the database. We build the absolute URL from the API base URL:

```ts
const baseUrl: string = API_URL.replace(/\/api\/?$/, '');
const imageUrl: string = `${baseUrl}/uploads/rooms/${room.images[0]}`;
```

If `API_URL` is `http://localhost:3001/api` and the filename is `1700000000000-kitchen.jpg`, the full URL becomes:

```
http://localhost:3001/uploads/rooms/1700000000000-kitchen.jpg
```

This works because we set up `express.static('uploads')` in Lesson 22 to serve the uploaded files.

---

## 23.19 Complete File Summary

```
webapp/src/
├── components/
│   ├── owner/
│   │   ├── OwnerLayout.tsx          # sidebar + Outlet
│   │   ├── room-columns.tsx         # useRoomColumns -> ColumnDef<Room>[]
│   │   ├── room-row-actions.tsx     # edit link + delete with AlertDialog
│   │   ├── room-filters.tsx         # debounced search + status select
│   │   └── room-pagination.tsx      # page controls
│   └── ui/
│       ├── data-table.tsx           # generic <DataTable> from Lesson 17.1
│       ├── field.tsx                # shadcn Field, FieldLabel, FieldError, etc.
│       └── ... other shadcn pieces
├── hooks/
│   ├── useRooms.ts                  # roomKeys + 7 hooks (incl. add/delete images)
│   ├── useRoomsFilters.ts           # URL <-> filters sync
│   └── useImagePreviews.ts          # File state + object URL lifecycle
├── pages/
│   └── owner/
│       ├── MyRooms.tsx              # DataTable orchestrator
│       ├── AddRoom.tsx              # Field primitives + Controller + image upload
│       ├── EditRoom.tsx             # pre-filled Field primitives + Controller
│       └── OwnerBookings.tsx        # placeholder (Lesson 25)
├── schemas/
│   └── roomSchema.ts                # Zod schema + AMENITY_OPTIONS
├── services/
│   ├── api.ts                       # Axios instance + JWT interceptor
│   └── roomApi.ts                   # CRUD methods (FormData on write)
├── types/
│   └── room.ts                      # Room, RoomFilters, RoomsResponse
└── main.tsx                         # BrowserRouter + QueryClientProvider + Toaster
```

---

## Practice Exercises

### Exercise 1: Build the Service and Hooks
1. Create `services/roomApi.ts` with `getAll`, `getMine`, `getById`, `create`, `update`, `delete`
2. Create `hooks/useRooms.ts` with the `roomKeys` factory and all five hooks
3. Verify every mutation shows a Sonner toast on success and on error
4. Confirm `invalidateQueries({ queryKey: roomKeys.all })` refreshes the list

### Exercise 2: Build the My Rooms Table
1. Create `useRoomColumns()` returning a `ColumnDef<Room>[]`
2. Wire `<DataTable>` with `manualPagination` and `pageCount` from `data.meta.totalPages`
3. Confirm the URL updates when you change the search box (after 300ms debounce)
4. Refresh the page -- the filters and current page should be preserved

### Exercise 3: Build the Add Room Form
1. Create the Zod schema in `schemas/roomSchema.ts`
2. Use the `Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup` primitives with React Hook Form's `Controller` for every field
3. Use the `useImagePreviews` hook for the file input
4. On submit, build a `FormData` payload and call `createRoom(formData)`
5. Confirm the toast appears and the navigation back to `/owner/rooms` happens on success

### Exercise 4: Build the Edit Room Page
1. Fetch the room with `useRoom(id)`
2. Call `form.reset(roomData)` inside a `useEffect`
3. Wire the **text** form's Save button to `useUpdateRoom` (JSON PUT)
4. Below the form, render the image gallery:
   - Each existing image gets a hover-revealed delete button calling `useDeleteRoomImage`
   - The file input + previews + "Upload" button calls `useAddRoomImages`
5. Confirm: editing a typo and pressing Save does **not** re-upload images; removing one photo does not affect the others

### Exercise 5: Reorder Images (Stretch)
Add an "Image order" PATCH endpoint on the backend (`PATCH /api/rooms/:id/images/order` with body `{ images: [...] }`), and let the owner drag thumbnails to reorder them with a library like `dnd-kit`. Update the Mongoose document with the new array order.

---

## Key Takeaways
1. **Service layer first** -- `roomApi` owns HTTP, hooks own caching, components own UI
2. **Query keys factory** (`roomKeys.all`, `roomKeys.list(filters)`, `roomKeys.detail(id)`) gives type-safe, hierarchical invalidation
3. **One hook per action** -- `useRooms`, `useRoom`, `useCreateRoom`, `useUpdateRoom`, `useDeleteRoom`. Each owns its own toasts
4. **Reuse `<DataTable>`** from Lesson 17.1 for any entity -- only the columns and the data hook change
5. **URL is the source of truth** for table state via `useSearchParams` -- bookmarkable, refresh-proof, shareable
6. **shadcn `Field` primitives** (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup`) compose with React Hook Form's `Controller` -- no `Form` provider, no hidden wiring, full control over each input
7. **Always wire `id={field.name}` and `aria-invalid={fieldState.invalid}`** on the input -- this is the small-but-essential accessibility glue that the old `Form` wrapper used to do automatically
8. **Zod with `z.coerce.number()`** converts string inputs to numbers cleanly; `z.infer` derives types from the schema
9. **Files live outside the schema** -- track them with a dedicated hook because Zod cannot validate `File` objects
10. **`FormData`** is required for multipart upload; the same field name (`'images'`) can be appended multiple times for arrays of files
11. **`URL.createObjectURL`** inside a `useEffect` with cleanup `URL.revokeObjectURL` prevents memory leaks from preview blobs
12. **Image management is split** -- `useAddRoomImages` handles uploads, `useDeleteRoomImage` handles individual removals. The PUT form stays focused on text, the gallery stays focused on photos, and the user can do each independently.
13. **shadcn `AlertDialog`** wraps destructive actions -- never delete without explicit confirmation
14. **Sonner toasts inside mutation hooks** mean every component using the hook gets consistent feedback for free
