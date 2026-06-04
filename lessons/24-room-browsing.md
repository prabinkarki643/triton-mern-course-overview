# Lesson 24: User-Facing Room Browsing

## What You Will Learn
- Building a home page with featured rooms in a responsive grid
- Creating a room listing page with a filter sidebar (card grid, not a table)
- **`useSearchParams`** as the single source of truth for filters, search, and page (URL-driven state)
- A reusable **`useRoomFilters`** hook that reads/writes filters straight to the URL
- **Debounced search** (300ms) that updates the URL without spamming the API
- **React Query with `placeholderData`** so paginating does not flash a loading state
- A typed `roomApi` service using Axios `params` for query strings
- Creating a room detail page with an image gallery, amenities, and pricing
- Loading skeletons, empty states, and a pagination footer for the grid
- Responsive layouts with Tailwind CSS (mobile, tablet, desktop, large desktop)

---

## 24.1 The Big Picture

The user-facing side of our platform is where guests browse and discover rooms. There are three main views:

```
Public Pages
├── Home Page
│   ├── Hero section with search
│   └── Featured rooms grid (latest 6 rooms)
│
├── Room Listing Page (/rooms)
│   ├── Filter sidebar (location, price, capacity, amenities)
│   ├── Search bar with debounce
│   ├── Room cards in responsive grid (1/2/3/4 columns)
│   ├── Loading skeleton cards while fetching
│   ├── Empty state when no results match
│   └── Pagination footer (Showing X-Y of Z rooms)
│
└── Room Detail Page (/rooms/:id)
    ├── Image gallery
    ├── Room information (title, description, location)
    ├── Amenities list
    ├── Pricing and capacity
    ├── Owner information
    └── "Book Now" button
```

> Note: unlike the admin Todo list in Lesson 17.1, which used a `<DataTable>`, this is the **public-facing browsing experience**. Guests expect images, prices and amenities at a glance -- so we use a **card grid**, not a table. But we still apply the same URL-driven filter/search/pagination patterns underneath.

---

## 24.2 Room Types and API Service

First, add the filter and response types alongside the existing `Room` type:

```ts
// webapp/src/types/room.ts
export interface Room {
  _id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  capacity: number;
  amenities: string[];
  images: string[];
  owner: { _id: string; name: string };
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

export interface RoomResponse {
  data: Room;
}

export interface RoomFilters {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  amenities?: string[];
}
```

Now create the service layer. Just like the `todoApi` in Lesson 17.1, we let **Axios handle the query string** via the `params` option -- no more manual `URLSearchParams` concatenation:

```ts
// webapp/src/services/roomApi.ts
import api from './api';
import type { RoomsResponse, RoomResponse, RoomFilters } from '@/types/room';

export const roomApi = {
  async getAll(filters: RoomFilters = {}): Promise<RoomsResponse> {
    const { data } = await api.get<RoomsResponse>('/rooms', { params: filters });
    return data;
  },

  async getById(id: string): Promise<RoomResponse> {
    const { data } = await api.get<RoomResponse>(`/rooms/${id}`);
    return data;
  },

  async getFeatured(): Promise<RoomsResponse> {
    const { data } = await api.get<RoomsResponse>('/rooms', {
      params: { limit: 6, sort: 'newest' },
    });
    return data;
  },
};
```

**Why a service layer?** It keeps API logic out of components. If the API URL changes or you add caching, you only update one file.

**Why pass `filters` straight to `params`?** Axios serialises object values into `?key=value&key=value` for you. Undefined keys are dropped automatically -- so a filter that the user has not set is simply not included in the URL.

---

## 24.3 The `useRooms` Hook (React Query + `placeholderData`)

We mirror the Lesson 17.1 hook pattern -- one focused hook per action, with a query keys factory:

```ts
// webapp/src/hooks/useRooms.ts
import { useQuery } from '@tanstack/react-query';
import { roomApi } from '@/services/roomApi';
import type { RoomFilters } from '@/types/room';

export const roomKeys = {
  all: ['rooms'] as const,
  lists: () => [...roomKeys.all, 'list'] as const,
  list: (filters: RoomFilters) => [...roomKeys.lists(), filters] as const,
  details: () => [...roomKeys.all, 'detail'] as const,
  detail: (id: string) => [...roomKeys.details(), id] as const,
  featured: () => [...roomKeys.all, 'featured'] as const,
};

export function useRooms(filters: RoomFilters = {}) {
  return useQuery({
    queryKey: roomKeys.list(filters),
    queryFn: () => roomApi.getAll(filters),
    placeholderData: (previousData) => previousData,
  });
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => roomApi.getById(id),
    enabled: !!id,
  });
}

export function useFeaturedRooms() {
  return useQuery({
    queryKey: roomKeys.featured(),
    queryFn: () => roomApi.getFeatured(),
  });
}
```

**Why `placeholderData: (previousData) => previousData`?** When the user clicks "Next page", React Query would normally drop the current data and flash a loading skeleton. With this option, the *previous* page's rooms stay on screen while the next page loads -- no flicker. This is the same trick we used for the Todos table.

---

## 24.4 Home Page with Featured Rooms

The home page shows a hero section and the latest rooms:

```tsx
// webapp/src/pages/Home.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeaturedRooms } from "@/hooks/useRooms";
import type { Room } from "@/types/room";
import RoomCard from "@/components/rooms/RoomCard";

function Home(): JSX.Element {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState<string>("");

  const { data, isLoading } = useFeaturedRooms();

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    if (searchInput.trim()) {
      // Send the user to /rooms with the search pre-filled in the URL --
      // useRoomFilters will pick it up automatically.
      navigate(`/rooms?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const rooms: Room[] = data?.data || [];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-muted py-16 px-4 text-centre">
        <h1 className="text-4xl font-bold mb-4">Find the Perfect Room</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Browse meeting rooms, event spaces, and work areas across the country.
          Book instantly at the best prices.
        </p>

        <form onSubmit={handleSearch} className="flex max-w-md mx-auto gap-2">
          <Input
            placeholder="Search by location or room name..."
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>
      </section>

      {/* Featured Rooms */}
      <section className="py-12 px-4 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Recently Added Rooms</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index: number) => (
              <RoomCardSkeleton key={index} />
            ))}
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room: Room) => (
              <RoomCard key={room._id} room={room} />
            ))}
          </div>
        ) : (
          <p className="text-centre text-muted-foreground py-8">
            No rooms available yet. Check back soon!
          </p>
        )}

        <div className="text-centre mt-8">
          <Button variant="outline" onClick={() => navigate("/rooms")}>
            View All Rooms
          </Button>
        </div>
      </section>
    </div>
  );
}

// Loading skeleton for room cards
function RoomCardSkeleton(): JSX.Element {
  return (
    <Card>
      <Skeleton className="aspect-video w-full rounded-t-lg" />
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  );
}

export { RoomCardSkeleton };
export default Home;
```

---

## 24.5 Reusable Room Card Component

Every room is displayed using the same card component, whether on the home page or the listing page:

```tsx
// webapp/src/components/rooms/RoomCard.tsx
import { Link } from "react-router-dom";
import { MapPin, Users } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Room } from "@/types/room";
import { API_URL } from "@/services/api";

interface RoomCardProps {
  room: Room;
}

function RoomCard({ room }: RoomCardProps): JSX.Element {
  const baseUrl: string = API_URL.replace("/api", "");

  return (
    <Link to={`/rooms/${room._id}`} className="block group">
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        {/* Room image */}
        <div className="aspect-video overflow-hidden">
          {room.images.length > 0 ? (
            <img
              src={`${baseUrl}/uploads/rooms/${room.images[0]}`}
              alt={room.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-muted flex items-centre justify-centre">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-lg line-clamp-1">{room.title}</CardTitle>
          <div className="flex items-centre gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {room.location}
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>

          {/* Amenities preview (first 3) */}
          {room.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {room.amenities.slice(0, 3).map((amenity: string) => (
                <Badge key={amenity} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {room.amenities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{room.amenities.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-centre justify-between">
          <span className="text-lg font-bold">
            &pound;{room.price}
            <span className="text-sm font-normal text-muted-foreground">/night</span>
          </span>
          <span className="flex items-centre gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            {room.capacity}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default RoomCard;
```

**`line-clamp-1` and `line-clamp-2`** are Tailwind utilities that truncate text to 1 or 2 lines with an ellipsis. This keeps cards a consistent height even if titles or descriptions vary in length.

**`group` and `group-hover:scale-105`** create a subtle zoom effect on the image when hovering anywhere on the card, not just on the image itself.

---

## 24.6 The `useRoomFilters` Hook (URL as State)

Before building the listing page, we make one key decision: **the URL is the single source of truth for filters**. Just like the Todos table in Lesson 17.1, this means:

- Refreshing the page keeps the user's filters and current page
- Users can bookmark a filtered view like `/rooms?location=London&minPrice=50`
- The browser's back/forward buttons "just work"
- A URL can be shared with a colleague who will see the exact same results

We wrap `useSearchParams` in a small custom hook so the listing page never touches the URL directly:

```ts
// webapp/src/hooks/useRoomFilters.ts
import { useSearchParams } from 'react-router-dom';
import type { RoomFilters } from '@/types/room';

export function useRoomFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read each filter from the URL with sensible defaults
  const filters: RoomFilters = {
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 12,
    search: searchParams.get('search') || undefined,
    location: searchParams.get('location') || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    capacity: searchParams.get('capacity') ? Number(searchParams.get('capacity')) : undefined,
    amenities: searchParams.get('amenities')
      ? searchParams.get('amenities')!.split(',')
      : undefined,
  };

  // Update one or more filters at once. Empty values are removed from the URL.
  const setFilters = (updates: Partial<RoomFilters>) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      if (
        value === undefined ||
        value === '' ||
        value === null ||
        (Array.isArray(value) && value.length === 0)
      ) {
        next.delete(key);
      } else if (Array.isArray(value)) {
        next.set(key, value.join(','));
      } else {
        next.set(key, String(value));
      }
    }

    setSearchParams(next, { replace: true });
  };

  // Helper: change a filter AND reset back to page 1
  const setFilter = (key: keyof RoomFilters, value: RoomFilters[typeof key]) => {
    setFilters({ [key]: value, page: 1 });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  return { filters, setFilters, setFilter, resetFilters };
}
```

**Key ideas:**
- `useSearchParams` from React Router gives `[searchParams, setSearchParams]` -- like `useState`, but backed by the URL
- We strip empty / `undefined` values so the URL stays tidy (`/rooms` not `/rooms?search=&location=`)
- `setFilter` always resets to page 1, otherwise changing the location filter while on page 5 might land the user on an empty page
- `replace: true` updates the URL **without** adding to the browser history -- typing in a search box would otherwise create 30 history entries

---

## 24.7 Room Listing Page with Filters

The listing page itself is now small -- the hook above does the heavy lifting. The page composes three pieces: a search input, a filter sidebar, and the card grid:

```tsx
// webapp/src/pages/RoomListing.tsx
import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import RoomCard from '@/components/rooms/RoomCard';
import { RoomCardSkeleton } from '@/pages/Home';
import { RoomPagination } from '@/components/rooms/room-pagination';
import { useRooms } from '@/hooks/useRooms';
import { useRoomFilters } from '@/hooks/useRoomFilters';

const LOCATIONS: string[] = [
  'London', 'Manchester', 'Birmingham', 'Leeds',
  'Bristol', 'Edinburgh', 'Glasgow', 'Cardiff',
];

const AMENITY_OPTIONS: string[] = [
  'WiFi', 'Parking', 'Air Conditioning', 'Projector',
  'Whiteboard', 'TV Screen', 'Kitchen', 'Accessible',
];

function RoomListing(): JSX.Element {
  const { filters, setFilter, setFilters, resetFilters } = useRoomFilters();
  const { data, isLoading, isFetching } = useRooms(filters);

  // Local input state so the search field is responsive while we debounce
  const [searchInput, setSearchInput] = useState<string>(filters.search ?? '');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Debounce: wait 300ms after the user stops typing, then push to the URL
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== (filters.search ?? '')) {
        setFilter('search', searchInput || undefined);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep input in sync if the URL changes externally (e.g. user hits "Reset")
  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  const toggleAmenity = (amenity: string): void => {
    const current = filters.amenities ?? [];
    const next = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    setFilter('amenities', next.length ? next : undefined);
  };

  const hasActiveFilters =
    !!filters.search ||
    !!filters.location ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.capacity !== undefined ||
    (filters.amenities?.length ?? 0) > 0;

  const rooms = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms by name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside
          className={`w-64 shrink-0 space-y-6 ${
            showFilters ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset
              </Button>
            )}
          </div>

          {/* Location filter */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={filters.location ?? 'all'}
              onValueChange={(value) =>
                setFilter('location', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price range */}
          <div className="space-y-2">
            <Label>Price range (&pound;/night)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minPrice ?? ''}
                onChange={(e) =>
                  setFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxPrice ?? ''}
                onChange={(e) =>
                  setFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label>Minimum capacity</Label>
            <Select
              value={filters.capacity ? String(filters.capacity) : 'any'}
              onValueChange={(value) =>
                setFilter('capacity', value === 'any' ? undefined : Number(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {[2, 4, 6, 8, 10, 15, 20].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}+ guests
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="space-y-2">
              {AMENITY_OPTIONS.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`filter-${amenity}`}
                    checked={filters.amenities?.includes(amenity) ?? false}
                    onCheckedChange={() => toggleAmenity(amenity)}
                  />
                  <Label htmlFor={`filter-${amenity}`} className="text-sm font-normal">
                    {amenity}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Results grid */}
        <div className="flex-1 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <RoomCardSkeleton key={index} />
              ))}
            </div>
          ) : rooms.length > 0 ? (
            <>
              <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity ${
                  isFetching ? 'opacity-60' : 'opacity-100'
                }`}
              >
                {rooms.map((room) => (
                  <RoomCard key={room._id} room={room} />
                ))}
              </div>
              <RoomPagination meta={meta} />
            </>
          ) : (
            <EmptyState onReset={resetFilters} hasFilters={hasActiveFilters} />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onReset,
  hasFilters,
}: {
  onReset: () => void;
  hasFilters: boolean;
}): JSX.Element {
  return (
    <div className="text-center py-16 border rounded-lg">
      <p className="text-lg font-medium mb-2">No rooms found</p>
      <p className="text-muted-foreground mb-4">
        {hasFilters
          ? 'Try adjusting your filters or search terms.'
          : 'There are no rooms available yet -- check back soon.'}
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onReset}>
          Reset all filters
        </Button>
      )}
    </div>
  );
}

export default RoomListing;
```

**Notice what is *not* there any more**: no `useState<RoomFilters>`, no manual "sync filters to URL" `useEffect`, no manual query-string building. All of that lives inside `useRoomFilters`. The page just **reads filters and writes via `setFilter`** -- React Query and React Router do the rest.

The subtle `opacity-60` while `isFetching` is a small UX touch: combined with `placeholderData`, the previous results fade slightly while new ones load -- much nicer than the whole grid flashing to skeletons on every page change.

---

## 24.8 The Pagination Component

The pagination footer reads from `meta` (returned by the server) and writes through `setFilters` from `useRoomFilters`. Because the URL holds the page number, "Page 2" is bookmarkable just like a filter.

```tsx
// webapp/src/components/rooms/room-pagination.tsx
import { Button } from '@/components/ui/button';
import { useRoomFilters } from '@/hooks/useRoomFilters';
import type { PaginationMeta } from '@/types/room';

interface RoomPaginationProps {
  meta?: PaginationMeta;
}

export function RoomPagination({ meta }: RoomPaginationProps): JSX.Element | null {
  const { filters, setFilters } = useRoomFilters();

  if (!meta || meta.total === 0) return null;

  const limit = filters.limit ?? 12;
  const start = (meta.page - 1) * limit + 1;
  const end = Math.min(meta.page * limit, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {meta.total} rooms
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasPrevPage}
          onClick={() => setFilters({ page: meta.page - 1 })}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => setFilters({ page: meta.page + 1 })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```

Because we use `setFilters({ page: ... })` (not `setFilter`), the page number changes **without** resetting itself back to 1 -- that helper is only for filters.

---

## 24.9 How Debounced Search Works

Without debounce, every keystroke triggers a URL change and an API call. Typing "London" would fire 6 requests: "L", "Lo", "Lon", "Lond", "Londo", "London". Most are wasted.

**Debounce** waits until the user stops typing for 300ms before pushing the value to the URL:

```typescript
const [searchInput, setSearchInput] = useState(filters.search ?? '');

useEffect(() => {
  const handle = setTimeout(() => {
    if (searchInput !== (filters.search ?? '')) {
      setFilter('search', searchInput || undefined);
    }
  }, 300);
  return () => clearTimeout(handle);
}, [searchInput]);
```

**Timeline example:**
```
Time:    0ms   100ms   200ms   400ms   700ms
Typed:   "L"   "Lo"    "Lon"   "London"
Timer:   set   cancel  cancel  cancel   FIRE! -> URL becomes ?search=London
               +set    +set    +set
```

The cleanup function (`return () => clearTimeout(handle)`) runs every time the effect re-fires, cancelling the previous timer. The input itself stays responsive because `searchInput` updates immediately -- only the *URL push* is debounced.

The guard `if (searchInput !== (filters.search ?? ''))` stops an infinite loop when the URL changes externally (for example, when the user clicks "Reset").

---

## 24.10 How the `queryKey` Drives Re-fetching

```typescript
export function useRooms(filters: RoomFilters = {}) {
  return useQuery({
    queryKey: roomKeys.list(filters),
    queryFn: () => roomApi.getAll(filters),
    placeholderData: (previousData) => previousData,
  });
}
```

The `queryKey` includes the entire `filters` object. When the URL changes -- which changes `filters` -- the key changes, and React Query automatically refetches. You never call `refetch()` manually.

`placeholderData: (previousData) => previousData` is the "keep-previous-data" trick: while the next page is loading, React Query hands the component the *previous* data so the grid does not flash to a loading state. The `isFetching` flag goes `true` so we can dim the grid slightly to show that a refresh is in progress.

---

## 24.11 Room Detail Page

When a user clicks on a room card, they see the full details. We use the `useRoom(id)` hook we already wrote:

```tsx
// webapp/src/pages/RoomDetail.tsx
import { useParams, Link } from "react-router-dom";
import { MapPin, Users, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useRoom } from "@/hooks/useRooms";
import { API_URL } from "@/services/api";

function RoomDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useRoom(id ?? "");

  const baseUrl: string = API_URL.replace("/api", "");

  if (isLoading) {
    return <RoomDetailSkeleton />;
  }

  if (error || !data?.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-centre">
        <p className="text-lg text-destructive mb-4">Room not found.</p>
        <Button variant="outline" render={<Link to="/rooms" />}>
          Back to Rooms
        </Button>
      </div>
    );
  }

  const room = data.data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Button variant="ghost" size="sm" className="mb-4" render={<Link to="/rooms" />}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Rooms
      </Button>

      {/* Image Gallery */}
      {room.images.length > 0 && (
        <div className="mb-8">
          {/* Main image */}
          <div className="aspect-video overflow-hidden rounded-lg mb-2">
            <img
              src={`${baseUrl}/uploads/rooms/${room.images[0]}`}
              alt={room.title}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Thumbnail grid (if more than 1 image) */}
          {room.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {room.images.slice(1).map((image: string, index: number) => (
                <div
                  key={index}
                  className="aspect-video overflow-hidden rounded-md cursor-pointer"
                >
                  <img
                    src={`${baseUrl}/uploads/rooms/${image}`}
                    alt={`${room.title} - image ${index + 2}`}
                    className="h-full w-full object-cover hover:opacity-80 transition-opacity"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Room information (left column, 2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{room.title}</h1>
            <div className="flex items-centre gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{room.location}</span>
              <span className="mx-2">&middot;</span>
              <Users className="h-4 w-4" />
              <span>Up to {room.capacity} guests</span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold mb-3">About This Room</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {room.description}
            </p>
          </div>

          <Separator />

          {/* Amenities */}
          {room.amenities.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Amenities</h2>
              <div className="grid grid-cols-2 gap-3">
                {room.amenities.map((amenity: string) => (
                  <div key={amenity} className="flex items-centre gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Owner info */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Hosted By</h2>
            <p className="text-muted-foreground">{room.owner.name}</p>
          </div>
        </div>

        {/* Booking card (right column, 1/3 width) */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-baseline gap-1">
                <span className="text-2xl">&pound;{room.price}</span>
                <span className="text-sm font-normal text-muted-foreground">/night</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" size="lg" render={<Link to={`/rooms/${room._id}/book`} />}>
                Book Now
              </Button>
              <p className="text-xs text-centre text-muted-foreground">
                You will not be charged yet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for the detail page
function RoomDetailSkeleton(): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Skeleton className="h-8 w-24 mb-4" />
      <Skeleton className="aspect-video w-full rounded-lg mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default RoomDetail;
```

---

## 24.12 Responsive Grid with Tailwind

Tailwind makes responsive layouts straightforward with breakpoint prefixes. The listing page uses four breakpoints because rooms benefit from more density on wide displays:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
```

| Breakpoint | Width        | Columns | Use case        |
|-----------|--------------|---------|-----------------|
| (default) | 0 - 767px    | 1       | Mobile phones   |
| `md:`     | 768 - 1023px | 2       | Tablets         |
| `lg:`     | 1024 - 1279px| 3       | Laptops         |
| `xl:`     | 1280px+      | 4       | Wide desktops   |

**How it works:** Tailwind applies styles from the smallest breakpoint up. `grid-cols-1` applies to all screen sizes. `md:grid-cols-2` overrides it at 768px and above, and so on. The home page sticks to three columns (`lg:grid-cols-3`) because the section is narrower.

### The Filter Sidebar on Mobile

On mobile, the filter sidebar is hidden by default and shown when the user taps a button:

```tsx
<aside className={`w-64 shrink-0 ${showFilters ? "block" : "hidden md:block"}`}>
```

- On desktop (`md:block`): sidebar is always visible
- On mobile: hidden by default, toggled with the filter button

---

## 24.13 Loading Skeletons

Skeletons show the shape of content while it loads, giving users a sense of the page structure before data arrives. They are much better than a blank page or a spinner:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// A skeleton that matches the shape of a room card
function RoomCardSkeleton(): JSX.Element {
  return (
    <Card>
      <Skeleton className="aspect-video w-full rounded-t-lg" />
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  );
}
```

The `Skeleton` component from shadcn renders a pulsing grey rectangle. By matching the dimensions of real content (`h-5 w-3/4` for a title, `aspect-video` for an image), the skeleton mimics the layout.

---

## 24.14 Setting Up Routes

Add the public routes to your application:

```tsx
// webapp/src/App.tsx (relevant route additions)
import Home from "./pages/Home";
import RoomListing from "./pages/RoomListing";
import RoomDetail from "./pages/RoomDetail";

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/rooms" element={<RoomListing />} />
  <Route path="/rooms/:id" element={<RoomDetail />} />

  {/* Owner routes (from Lesson 23) */}
  <Route path="/owner" element={<OwnerLayout />}>
    {/* ... */}
  </Route>
</Routes>
```

The `:id` in `/rooms/:id` is a URL parameter. React Router extracts it via `useParams()`, and we pass it to the API call.

---

## 24.15 Complete File Summary

```
webapp/src/
├── components/
│   ├── rooms/
│   │   ├── RoomCard.tsx            # Reusable room card with image, price, amenities
│   │   └── room-pagination.tsx     # NEW - prev/next + "Showing X-Y of Z" footer
│   └── ui/                         # shadcn components (Card, Badge, Skeleton, etc.)
├── hooks/
│   ├── useRooms.ts                 # NEW - useRooms / useRoom / useFeaturedRooms + roomKeys
│   └── useRoomFilters.ts           # NEW - URL <-> filter state sync hook
├── pages/
│   ├── Home.tsx                    # Hero + featured rooms grid
│   ├── RoomListing.tsx             # Filters + debounced search + paginated card grid
│   └── RoomDetail.tsx              # Full room info + image gallery + booking card
├── services/
│   ├── api.ts                      # Axios instance
│   └── roomApi.ts                  # Room API service layer (uses Axios `params`)
└── types/
    └── room.ts                     # Room, RoomFilters, RoomsResponse, PaginationMeta
```

---

## Practice Exercises

### Exercise 1: Complete Browsing Experience
1. Create the `roomApi.ts` service with `getAll`, `getById`, and `getFeatured` methods (using Axios `params`)
2. Build the `useRooms`, `useRoom`, `useFeaturedRooms` hooks and the `roomKeys` factory
3. Build the `useRoomFilters` hook -- this is the most important piece
4. Build the Home page with a search bar and featured rooms grid
5. Build the Room Listing page with the filter sidebar (location, price, capacity, amenities)
6. Test the search debounce -- open the DevTools Network tab and verify only **one** request fires after you stop typing for 300ms
7. Test pagination -- the previous page's rooms should stay visible while the next page loads (no white flash)

### Exercise 2: URL as State (the Big One)
Verify that the URL is the single source of truth:
1. Apply a location filter -- the URL should update to `?location=London`
2. Refresh the page -- the filter should still be applied
3. Copy the URL, open it in a new tab -- you should see the same filtered results
4. Use the browser back button after changing filters -- you should return to the previous filter state
5. Apply several filters at once and verify they all appear in the URL: `?search=meeting&location=London&minPrice=50&page=2`
6. Click "Reset" -- the URL should return to a clean `/rooms`

### Exercise 3: Room Detail Page
1. Build the detail page with image gallery, description, amenities, and pricing card -- use the `useRoom(id)` hook
2. Test navigating from a room card to the detail page
3. Test the "Back to Rooms" button -- bonus points if filters from the listing page are preserved
4. Verify the "Book Now" button links to the correct URL

### Exercise 4: Responsive Testing
1. Open the browser DevTools and toggle the device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
2. Test the room grid at mobile width (375px) -- should show 1 column
3. Test at tablet width (768px) -- should show 2 columns
4. Test at laptop width (1024px) -- should show 3 columns
5. Test at wide desktop width (1280px+) -- should show 4 columns
6. Test the filter sidebar -- should collapse on mobile and toggle via the filter button

---

## Key Takeaways
1. **The URL is the single source of truth** for filters, search, and the current page -- not React state. This makes filtered views shareable, bookmarkable, and refresh-proof
2. **`useSearchParams`** from React Router gives `[searchParams, setSearchParams]` -- like `useState`, but backed by the browser URL
3. A **`useRoomFilters` hook** wraps `useSearchParams` so the page never touches the URL directly -- it just reads `filters` and calls `setFilter` / `setFilters`
4. **Debounced search** (300ms) keeps the input responsive while preventing API spam -- local `useState` for the input, `useEffect` + `setTimeout` to push to the URL
5. **Axios `params`** serialises filter objects into a query string automatically -- no manual `URLSearchParams` building
6. **React Query with `placeholderData: (previousData) => previousData`** keeps the previous page visible while the next page loads -- no white flash
7. **Service layers** (`roomApi.ts`) and **hook layers** (`useRooms.ts`) keep components focused on rendering, not data fetching
8. **`setFilter` always resets to page 1** -- otherwise changing a filter on page 5 would land the user on an empty page
9. **`replace: true`** when updating search params avoids polluting browser history with one entry per keystroke
10. **Card grid for users, tables for admins** -- the same URL-state pattern from Lesson 17.1 works for both; only the presentation differs
11. **Responsive grids** scale from 1 to 4 columns: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
12. The **sticky booking card** (`sticky top-4`) stays visible as the user scrolls through room details
