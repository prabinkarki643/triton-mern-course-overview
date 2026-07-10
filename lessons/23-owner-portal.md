# Lesson 23: Owner Portal Frontend

## What You Will Learn
- Building the owner dashboard shell with the shadcn **`sidebar-07` block** -- a drop-in `AppSidebar` + `NavMain` + `NavUser` pattern that ships with a collapsible-icon rail, active-route styling, and a user-menu footer. We adapt it into `OwnerSidebar`, `OwnerNavMain` (a collapsible **Rooms** group, plus **Bookings**), and `OwnerNavUser` (the logged-in owner's avatar + Logout dropdown), then mount the whole thing at `/owner/dashboard` with React Router's `Outlet`
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

The owner portal is a protected area where room owners manage their listings. It is built on the same patterns we already used for todos: an Axios service layer, focused React Query hooks, a reusable `<DataTable>`, and shadcn `Field` primitives with Zod. The shell around every owner page is the shadcn **`sidebar-07`** block -- a well-designed dashboard layout you install with one command and then customise.

```
/owner  (OwnerLayout: SidebarProvider + OwnerSidebar + SidebarInset + <Outlet/>)
│
├── /owner/dashboard    (landing page: welcome card; L25/L27 will add stats)
│
├── /owner/rooms        (My Rooms table: image, title, location, price, capacity, status)
│   ├── Filters (search, location, status)   -> URL params
│   ├── Pagination                            -> URL params (?page=2)
│   └── Row actions -> Edit (link) + Delete (AlertDialog)
│
├── /owner/rooms/new    (Add Room: shadcn Field + Zod + image upload)
│   └── Submit -> FormData -> POST /api/rooms (multipart)
│
├── /owner/rooms/:id/edit  (Edit Room: split UI)
│   ├── Text fields -> Save -> JSON -> PUT /api/rooms/:id
│   └── Image gallery
│       ├── Each current image has a delete (X) button
│       │   -> DELETE /api/rooms/:id/images/:imageName
│       └── "Upload more" file input (multi-select with previews)
│           -> POST /api/rooms/:id/images (multipart)
│
└── /owner/bookings     (placeholder for Lesson 25 -- approve / reject requests)

Sidebar shape (OwnerNavMain + OwnerNavUser footer):
   Dashboard           -> /owner/dashboard
   Rooms  (collapsible)
     ├── Rooms List    -> /owner/rooms
     └── Create Room   -> /owner/rooms/new
   Bookings            -> /owner/bookings
   ─────────────────────
   [avatar] Owner name  (dropdown: Profile, Log out)
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
npx shadcn@latest add sidebar-07
npx shadcn@latest add breadcrumb
```

> **Note:** We use the new shadcn `field` primitives (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup`) -- **not** the older `form` block. The `Field` primitives compose directly with React Hook Form's `Controller`, giving us a leaner API and full control over each input.

> **About the sidebar-07 block:** `sidebar-07` is a shadcn **block**, not just a primitive. Running `npx shadcn@latest add sidebar-07` drops a whole starter dashboard shell into `src/components/`: `app-sidebar.tsx`, `nav-main.tsx`, `nav-user.tsx`, `nav-projects.tsx`, `team-switcher.tsx`, plus the `sidebar`, `dropdown-menu`, `collapsible`, `avatar`, `separator`, `tooltip`, and `sheet` UI primitives they depend on. We are going to **keep the primitives**, **adapt the pieces we need** (`app-sidebar` → `OwnerSidebar`, `nav-main` → `OwnerNavMain`, `nav-user` → `OwnerNavUser`), and **delete what we don't** (`nav-projects.tsx`, `team-switcher.tsx`) so students see how to trim a block down to what their app actually needs. You can preview the block first at <https://ui.shadcn.com/blocks/sidebar#sidebar-07>.
>
> **Note:** `sidebar-07` **does not** ship a breadcrumb component -- the demo you see on the shadcn site is inline. That's why we install the shadcn `breadcrumb` primitive separately above; we then wrap it in our own `HeaderBreadcrumbs` component in section 23.8.6.
>
> **Wrap your app in `TooltipProvider`.** The `SidebarMenuButton` used inside `OwnerNavMain` renders a tooltip (via the `tooltip={...}` prop) whenever the sidebar is collapsed to icons, and Radix Tooltips need a `TooltipProvider` somewhere above them. Add it in `main.tsx`, just above `<App />`:
>
> ```tsx
> // webapp/src/main.tsx
> import { TooltipProvider } from '@/components/ui/tooltip';
>
> createRoot(document.getElementById('root')!).render(
>   <StrictMode>
>     <BrowserRouter>
>       <QueryClientProvider client={queryClient}>
>         <ThemeProvider defaultTheme="light">
>           <TooltipProvider delayDuration={0}>
>             <App />
>             <Toaster richColors position="top-right" />
>           </TooltipProvider>
>         </ThemeProvider>
>       </QueryClientProvider>
>     </BrowserRouter>
>   </StrictMode>,
> );
> ```
>
> Forgetting this throws `Tooltip must be used within TooltipProvider` at runtime the first time an icon-rail tooltip tries to render.

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

## 23.8 Owner Layout with the shadcn `sidebar-07` Block

Rather than hand-rolling a sidebar, we install the shadcn **`sidebar-07`** block and adapt it. Blocks are pre-composed patterns that give us a great starting point (collapsible-icon rail, sticky header slot, user-menu footer, tooltip when collapsed, mobile drawer) so we can focus on *our* nav structure, not on layout plumbing.

The nav shape for our owner portal:

| Section | Item | Route |
|---------|------|-------|
| Nav main | **Dashboard** | `/owner/dashboard` |
|          | **Rooms** (collapsible) | -- |
|          | &nbsp;&nbsp;Rooms List | `/owner/rooms` |
|          | &nbsp;&nbsp;Create Room | `/owner/rooms/new` |
|          | **Bookings** | `/owner/bookings` |
| Footer | Current owner (avatar + dropdown: Profile, Log out) | -- |

The header slot (top of `SidebarInset`) hosts the `SidebarTrigger` (the collapse toggle) and the page title.

---

### 23.8.1 Install the block

```bash
cd webapp
npx shadcn@latest add sidebar-07
```

This drops a handful of files into `src/components/` (the AppSidebar/NavMain/NavUser starter set) plus the underlying UI primitives. Delete the pieces we don't need for BookMyRoom (`team-switcher.tsx`, `nav-projects.tsx`), then rename/move the rest under `src/components/owner/`:

```
src/components/
├── owner/
│   ├── OwnerLayout.tsx        # was: nothing -- we write this
│   ├── OwnerSidebar.tsx       # adapted from app-sidebar.tsx
│   ├── OwnerNavMain.tsx       # adapted from nav-main.tsx
│   └── OwnerNavUser.tsx       # adapted from nav-user.tsx
└── ui/
    ├── sidebar.tsx            # installed by sidebar-07
    ├── dropdown-menu.tsx      # installed by sidebar-07
    ├── collapsible.tsx        # installed by sidebar-07
    ├── avatar.tsx             # installed by sidebar-07
    ├── separator.tsx          # installed by sidebar-07
    ├── tooltip.tsx            # installed by sidebar-07
    └── sheet.tsx              # installed by sidebar-07 (mobile drawer)
```

> **Why rename?** Keeping app-scoped components (`OwnerSidebar`, `OwnerNavMain`, `OwnerNavUser`) under `components/owner/` makes it obvious they belong to the owner portal. When you later add a guest portal or an admin portal, you can install `sidebar-07` again and create `AdminSidebar`, `AdminNavMain`, etc. -- with zero collisions.

---

### 23.8.2 `OwnerSidebar` -- the composition root

Compared with `app-sidebar.tsx`, we swap the block's starter parts (`TeamSwitcher`, `NavProjects`, `NavUser`) for our owner-specific `OwnerNavMain` and `OwnerNavUser`:

```tsx
// webapp/src/components/owner/OwnerSidebar.tsx
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { OwnerNavMain } from './OwnerNavMain';
import { OwnerNavUser } from './OwnerNavUser';

export function OwnerSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Brand row -- also acts as a link back to the dashboard */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/owner/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">BookMyRoom</span>
                  <span className="truncate text-xs">Owner Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <OwnerNavMain />
      </SidebarContent>

      <SidebarFooter>
        <OwnerNavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
```

Key props on `<Sidebar>`:

| Prop | Value | Effect |
|------|-------|--------|
| `variant` | `"inset"` | Sidebar and main content sit inside a rounded surface (the "inset" look) |
| `collapsible` | `"icon"` | Collapsing shrinks to an icon rail instead of hiding entirely |

`<SidebarRail>` is the thin vertical strip on the outside edge that you can click to collapse/expand the sidebar.

---

### 23.8.3 `OwnerNavMain` -- top-level items + a collapsible group

This is where the owner-portal nav structure lives. It has one collapsible group (**Rooms**, containing "Rooms List" and "Create Room") and one flat item (**Bookings**). We use React Router's `useLocation()` to compute active state and to auto-open the group when the current URL is inside it.

```tsx
// webapp/src/components/owner/OwnerNavMain.tsx
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CalendarCheck,
  ChevronRight,
  Home,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;              // if true, "active" needs an exact path match
  items?: { title: string; url: string }[];
};

const navMain: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/owner/dashboard',
    icon: LayoutDashboard,
    exact: true,                 // only highlight on /owner/dashboard exactly
  },
  {
    title: 'Rooms',
    url: '/owner/rooms',
    icon: Home,
    items: [
      { title: 'Rooms List', url: '/owner/rooms' },
      { title: 'Create Room', url: '/owner/rooms/new' },
    ],
  },
  {
    title: 'Bookings',
    url: '/owner/bookings',
    icon: CalendarCheck,
  },
];

export function OwnerNavMain() {
  const location = useLocation();
  const pathname = location.pathname;

  // "This item's route matches the URL" -- exact or prefix, matching NavLink's end=
  const isItemActive = (item: NavItem): boolean =>
    item.exact ? pathname === item.url : pathname.startsWith(item.url);

  // "One of this item's children matches the URL" -- used to auto-open groups
  const isChildActive = (item: NavItem): boolean =>
    item.items?.some(
      (sub) => pathname === sub.url || pathname.startsWith(sub.url + '/')
    ) ?? false;

  // Track which collapsible groups are open. Seed from the current URL so that
  // navigating straight to /owner/rooms/new opens the Rooms group.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navMain.map((item) => [item.title, isChildActive(item)]))
  );

  // Whenever the URL changes, force groups containing the active child open.
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      navMain.forEach((item) => {
        if (isChildActive(item)) next[item.title] = true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {navMain.map((item) =>
          (item.items || []).length > 0 ? (
            // ------- Collapsible group (Rooms) -------
            <Collapsible
              key={item.title}
              asChild
              open={openGroups[item.title] ?? false}
              onOpenChange={(open) =>
                setOpenGroups((prev) => ({ ...prev, [item.title]: open }))
              }
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isChildActive(item)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === subItem.url}
                        >
                          <Link to={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            // ------- Top-level flat item (Bookings) -------
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isItemActive(item)}
              >
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
```

**The tricky bits explained:**

1. **`isItemActive` vs `isChildActive`** -- top-level flat items just need to know if the URL points to them (used to highlight the item). Collapsible groups also need to know if any *child* of theirs is active (used both to highlight the parent and to force the group open when you land on `/owner/rooms/new` via a bookmark or browser refresh).
2. **`Collapsible open={...} onOpenChange={...}`** -- we control the open state so we can force the group open from the effect. The uncontrolled version would collapse on every URL change, which is not what we want.
3. **`tooltip={item.title}`** on `SidebarMenuButton` -- when the sidebar is collapsed to icons, hovering shows the item name as a tooltip. Without it the collapsed rail is a mystery.
4. **`SidebarMenuSubButton isActive={pathname === subItem.url}`** -- for sub-items we compare exactly, so `/owner/rooms` highlights "Rooms List" without also highlighting "Create Room" (whose URL starts with `/owner/rooms`).

---

### 23.8.4 `OwnerNavUser` -- the footer avatar + dropdown

The footer shows the logged-in owner (from the `useCurrentUser()` hook you built in Lesson 21) and a dropdown menu for Profile / Log out. We reuse the shadcn `DropdownMenu` and `Avatar` primitives the block installed.

```tsx
// webapp/src/components/owner/OwnerNavUser.tsx
import { Link, useNavigate } from 'react-router-dom';
import { ChevronsUpDown, LogOut, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUser } from '@/hooks/useAuth';

function initialsOf(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function OwnerNavUser() {
  const { isMobile } = useSidebar();       // tells us whether to open the menu upward
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {initialsOf(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user?.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user?.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {initialsOf(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/owner/dashboard">
                  <User />
                  Profile
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

> **`useSidebar` gives us context awareness.** It exposes `isMobile`, `open`, `openMobile`, and helpers to toggle the sidebar. Here we use `isMobile` to open the dropdown downward on mobile (where "right" would run off-screen).

---

### 23.8.5 `OwnerLayout` -- the shell that everything renders inside

Finally, we compose `SidebarProvider` + `OwnerSidebar` + `SidebarInset` (the surface for the main content) into a layout component whose `<Outlet />` renders whichever child route is active.

```tsx
// webapp/src/components/owner/OwnerLayout.tsx
import { Outlet } from 'react-router-dom';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { OwnerSidebar } from './OwnerSidebar';
import { HeaderBreadcrumbs } from './HeaderBreadcrumbs';

function OwnerLayout() {
  return (
    <SidebarProvider>
      <OwnerSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <HeaderBreadcrumbs homeUrl="/owner/dashboard" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default OwnerLayout;
```

The parts you need to know:

| Piece | Job |
|-------|-----|
| `<SidebarProvider>` | Owns the sidebar's open/collapsed/mobile state. Everything using `useSidebar` reads from this. |
| `<OwnerSidebar />` | The composition we built in 23.8.2 -- header, nav, footer, rail. |
| `<SidebarInset>` | The right-hand surface that houses the main content. Pairs with `variant="inset"` on the sidebar. |
| Sticky header inside `SidebarInset` | Holds the `SidebarTrigger` (collapse toggle) + `HeaderBreadcrumbs` (built in the next section). Later you can also drop in a notification bell or a search input here. |
| `<Outlet />` | React Router's slot for the active child route. |

---

### 23.8.6 `HeaderBreadcrumbs` -- a route-aware title

The sticky header needs a title, but hard-coding "Owner Portal" everywhere is a missed opportunity: the URL already tells us where the user is, so we can turn it into a breadcrumb that tracks their journey. `sidebar-07` doesn't include this component -- we build our own on top of the shadcn `breadcrumb` primitive we installed in section 23.2.

The plan:

1. Take the current pathname (via `useLocation()`).
2. Strip the `/owner` prefix -- everything the owner sees is inside the portal, so showing it in the breadcrumb is noise.
3. Prepend a "Home" crumb that links to `homeUrl` (`/owner/dashboard`).
4. Turn each remaining segment into a friendly label: kebab-case → Title Case; treat any 24-hex-character segment as a MongoDB ObjectId and render it as `#abcd` (last four characters) so long room ids don't blow out the header.

```tsx
// webapp/src/components/owner/HeaderBreadcrumbs.tsx
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface HeaderBreadcrumbsProps {
  homeUrl?: string;   // defaults to /owner/dashboard
  rootLabel?: string; // label shown for the first crumb
  stripPrefix?: string; // prefix to remove from the pathname (defaults to /owner)
}

// Recognise a Mongo ObjectId so we can render it compactly ("#abcd")
const OBJECT_ID = /^[a-f0-9]{24}$/i;

function friendlyName(segment: string): string {
  if (OBJECT_ID.test(segment)) return `#${segment.slice(-4)}`;
  // "rooms" -> "Rooms", "my-bookings" -> "My Bookings"
  return decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HeaderBreadcrumbs({
  homeUrl = '/owner/dashboard',
  rootLabel = 'Home',
  stripPrefix = '/owner',
}: HeaderBreadcrumbsProps) {
  const location = useLocation();
  const pathname = location.pathname;

  // Drop the /owner prefix -- everything below is what we want to show
  const relative = pathname.startsWith(stripPrefix)
    ? pathname.slice(stripPrefix.length)
    : pathname;

  // Turn "/rooms/:id/edit" into ["rooms", ":id", "edit"] and build hrefs.
  // Each item is cumulative: /owner/rooms, /owner/rooms/:id, /owner/rooms/:id/edit
  const segments = relative.split('/').filter(Boolean);
  const items = segments.map((segment, index) => ({
    label: friendlyName(segment),
    // Skip building a link for the "dashboard" segment (it's already Home)
    href:
      segment === 'dashboard'
        ? homeUrl
        : stripPrefix + '/' + segments.slice(0, index + 1).join('/'),
  }));

  // Always start with "Home" pointing at the homeUrl (dashboard).
  // If the current page IS the dashboard, "Home" is the only crumb.
  const allItems =
    segments[0] === 'dashboard'
      ? [{ label: rootLabel, href: homeUrl }]
      : [{ label: rootLabel, href: homeUrl }, ...items];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          return (
            <BreadcrumbItem key={`${item.label}-${index}`}>
              {isLast ? (
                <BreadcrumbPage className="max-w-[160px] truncate">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={item.href} className="max-w-[140px] truncate">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
```

**How it renders in practice:**

| URL | Breadcrumb |
|-----|------------|
| `/owner/dashboard` | Home |
| `/owner/rooms` | Home / Rooms |
| `/owner/rooms/new` | Home / Rooms / New |
| `/owner/rooms/6a4df47641fc245752bfd6d8/edit` | Home / Rooms / #d6d8 / Edit |
| `/owner/bookings` | Home / Bookings |

**Design choices worth pointing out to students:**

- **Why strip the `/owner` prefix?** Every owner page starts with `/owner`, so surfacing it in the breadcrumb wastes screen space and adds no information. The `stripPrefix` prop keeps the component reusable -- when we build the guest browsing UI in Lesson 24 we can drop it in with `stripPrefix=""` and get standard breadcrumbs for the public site.
- **Why not link the last crumb?** The active page is already open -- clicking a link to the page you're on is dead weight. shadcn's `<BreadcrumbPage>` handles the styling (subtle "current page" colour) automatically.
- **Why shorten ObjectIds?** A 24-character hex string is meaningless to the user and takes over the header. Showing the last four characters (`#d6d8`) is enough to distinguish rooms when the owner is tab-switching, and stays inside the sticky header at every viewport width.
- **Why is this a client component, not a router config?** Building it from `useLocation()` means **any** owner route -- including ones we add in Lessons 24-27 -- picks up sensible breadcrumbs for free. No route-config table to keep in sync.

---

### 23.8.7 Owner Routes

The layout is mounted once, at `/owner`, and every owner page renders inside it via nested routes. A tiny redirect (`""` -> `dashboard`) makes `/owner` land on the dashboard.

```tsx
// webapp/src/App.tsx (relevant section)
import { Navigate, Routes, Route } from 'react-router-dom';
import OwnerLayout from '@/components/owner/OwnerLayout';
import { OwnerDashboardPage } from '@/pages/OwnerDashboardPage';
import MyRooms from '@/pages/owner/MyRooms';
import AddRoom from '@/pages/owner/AddRoom';
import EditRoom from '@/pages/owner/EditRoom';
import OwnerBookings from '@/pages/owner/OwnerBookings';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* ... public + auth routes ... */}

      {/* Owner Portal -- protected + wrapped in the sidebar layout */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute requireRole="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboardPage />} />
        <Route path="rooms" element={<MyRooms />} />
        <Route path="rooms/new" element={<AddRoom />} />
        <Route path="rooms/:id/edit" element={<EditRoom />} />
        <Route path="bookings" element={<OwnerBookings />} />
      </Route>
    </Routes>
  );
}
```

Notice three things:

1. **`ProtectedRoute` wraps `OwnerLayout`, not each page individually.** The layout mounts once for the whole owner section, so the auth check runs once and every child route inherits it.
2. **`<Route index element={<Navigate to="dashboard" replace />} />`** turns `/owner` into an alias for `/owner/dashboard` -- if the owner clicks the brand row (which links to `/owner/dashboard`), or lands on `/owner` from an external link, they always end up on the dashboard.
3. **The dashboard is inside the sidebar shell.** Previously `/owner/dashboard` was a bare page with no sidebar; now it renders inside `OwnerLayout` just like every other owner page, so the sidebar (and its "current owner" footer) is always visible.

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
          Rs{row.original.price}
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
    // Amenities travels as a single JSON string. Multer does not auto-parse
    // repeated form fields into arrays the way URL-encoded bodies do, so we
    // give the backend one clean JSON payload -- parseAmenities on the
    // controller side handles the deserialisation.
    formData.append('amenities', JSON.stringify(data.amenities ?? []));
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
                  <FieldLabel htmlFor={field.name}>Price per Night (Rs)</FieldLabel>
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
formData.append('title', 'My Room');                      // text field
formData.append('amenities', JSON.stringify(['WiFi']));   // JSON-encoded array
formData.append('images', fileObject1);                   // file field
formData.append('images', fileObject2);                   // multiple files -> same field name
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
                  <FieldLabel htmlFor={field.name}>Price per Night (Rs)</FieldLabel>
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
│   │   ├── OwnerLayout.tsx          # SidebarProvider + OwnerSidebar + SidebarInset + Outlet
│   │   ├── OwnerSidebar.tsx         # adapted from sidebar-07's app-sidebar.tsx
│   │   ├── OwnerNavMain.tsx         # Dashboard + collapsible Rooms group + flat Bookings item
│   │   ├── OwnerNavUser.tsx         # current owner avatar + Profile/Log out dropdown
│   │   ├── HeaderBreadcrumbs.tsx    # route-aware header title (uses useLocation)
│   │   ├── room-columns.tsx         # useRoomColumns -> ColumnDef<Room>[]
│   │   ├── room-row-actions.tsx     # edit link + delete with AlertDialog
│   │   ├── room-filters.tsx         # debounced search + status select
│   │   └── room-pagination.tsx      # page controls
│   └── ui/
│       ├── sidebar.tsx              # installed by sidebar-07
│       ├── dropdown-menu.tsx        # installed by sidebar-07
│       ├── collapsible.tsx          # installed by sidebar-07
│       ├── avatar.tsx               # installed by sidebar-07
│       ├── separator.tsx            # installed by sidebar-07
│       ├── tooltip.tsx              # installed by sidebar-07
│       ├── sheet.tsx                # installed by sidebar-07 (mobile drawer)
│       ├── breadcrumb.tsx           # shadcn primitive used by HeaderBreadcrumbs
│       ├── data-table.tsx           # generic <DataTable> from Lesson 17.1
│       ├── field.tsx                # shadcn Field, FieldLabel, FieldError, etc.
│       └── ... other shadcn pieces
├── hooks/
│   ├── useRooms.ts                  # roomKeys + 7 hooks (incl. add/delete images)
│   ├── useRoomsFilters.ts           # URL <-> filters sync
│   └── useImagePreviews.ts          # File state + object URL lifecycle
├── pages/
│   ├── OwnerDashboardPage.tsx       # /owner/dashboard landing (welcome card for now)
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

### Exercise 0: Build the Owner Layout with `sidebar-07`
1. Run `npx shadcn@latest add sidebar-07` and delete the pieces you don't need (`team-switcher.tsx`, `nav-projects.tsx`)
2. Move the remaining block files under `src/components/owner/` and rename them (`OwnerSidebar`, `OwnerNavMain`, `OwnerNavUser`)
3. Reshape `OwnerNavMain` so it has a collapsible **Rooms** group (with "Rooms List" and "Create Room" as children) and a flat **Bookings** item
4. In `OwnerNavUser`, source the current owner from `useCurrentUser()` and wire the **Log out** menu item to clear `localStorage` and `navigate('/login')`
5. Compose `OwnerLayout` with `SidebarProvider` + `OwnerSidebar` + `SidebarInset` (sticky header holding the `SidebarTrigger`) + `<Outlet />`
6. Install `npx shadcn@latest add breadcrumb` and build `HeaderBreadcrumbs` on top of it -- `useLocation()`, strip the `/owner` prefix, prepend a "Home" crumb, shorten 24-hex ObjectIds to `#abcd`. Drop it into the layout header
7. Mount the layout at `/owner` in `App.tsx`, add child routes for `dashboard`, `rooms`, `rooms/new`, `rooms/:id/edit`, `bookings`, and a `<Route index element={<Navigate to="dashboard" replace />} />`
8. Confirm:
   - Clicking the sidebar rail collapses the sidebar to icons; hovering an icon shows the item name as a tooltip
   - Navigating straight to `/owner/rooms/new` (e.g. from a bookmark) opens the **Rooms** group and highlights "Create Room"
   - `/owner/dashboard` now renders inside the sidebar shell (previously it was a bare page)
   - Editing a room shows breadcrumbs like `Home / Rooms / #d6d8 / Edit` -- the ObjectId is shortened and each parent crumb is clickable

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
1. **Reach for a shadcn block, not a hand-rolled layout.** `sidebar-07` gives you the collapsible-icon rail, tooltips, mobile drawer, and user-menu footer for free -- so your effort goes into *your* nav shape, not into rebuilding the shell. Adapt (`AppSidebar` → `OwnerSidebar`, `NavMain` → `OwnerNavMain`, `NavUser` → `OwnerNavUser`) and delete what you don't need.
2. **One `SidebarProvider` per layout.** It owns the collapsed / mobile state that every `useSidebar()` reads from. Mount `<OwnerLayout />` **once** at `/owner` and let nested `<Outlet />` routes render inside it -- no duplicated shells.
3. **Route the URL, not the UI.** Active state comes from `useLocation()` in `OwnerNavMain`: top-level flat items use prefix matching (`pathname.startsWith`), sub-items use exact matching. Auto-open collapsible groups when the URL is inside them, so hard refreshes never look "wrong".
4. **Service layer first** -- `roomApi` owns HTTP, hooks own caching, components own UI
5. **Query keys factory** (`roomKeys.all`, `roomKeys.list(filters)`, `roomKeys.detail(id)`) gives type-safe, hierarchical invalidation
6. **One hook per action** -- `useRooms`, `useRoom`, `useCreateRoom`, `useUpdateRoom`, `useDeleteRoom`. Each owns its own toasts
7. **Reuse `<DataTable>`** from Lesson 17.1 for any entity -- only the columns and the data hook change
8. **URL is the source of truth** for table state via `useSearchParams` -- bookmarkable, refresh-proof, shareable
9. **shadcn `Field` primitives** (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup`) compose with React Hook Form's `Controller` -- no `Form` provider, no hidden wiring, full control over each input
10. **Always wire `id={field.name}` and `aria-invalid={fieldState.invalid}`** on the input -- this is the small-but-essential accessibility glue that the old `Form` wrapper used to do automatically
11. **Zod with `z.coerce.number()`** converts string inputs to numbers cleanly; `z.infer` derives types from the schema
12. **Files live outside the schema** -- track them with a dedicated hook because Zod cannot validate `File` objects
13. **`FormData`** is required for multipart upload; the same field name (`'images'`) can be appended multiple times for arrays of files
14. **`URL.createObjectURL`** inside a `useEffect` with cleanup `URL.revokeObjectURL` prevents memory leaks from preview blobs
15. **Image management is split** -- `useAddRoomImages` handles uploads, `useDeleteRoomImage` handles individual removals. The PUT form stays focused on text, the gallery stays focused on photos, and the user can do each independently.
16. **shadcn `AlertDialog`** wraps destructive actions -- never delete without explicit confirmation
17. **Sonner toasts inside mutation hooks** mean every component using the hook gets consistent feedback for free
