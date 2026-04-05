# Lesson 24: User-Facing Room Browsing

## What You Will Learn
- Building a home page with featured rooms in a responsive grid
- Creating a room listing page with a filter sidebar
- Implementing search with debounce to avoid excessive API calls
- Building query parameters from filter state and passing them to `useQuery`
- Creating a room detail page with an image gallery, amenities, and pricing
- Adding loading skeletons and empty states for better user experience
- Responsive layouts with Tailwind CSS (mobile, tablet, desktop)

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
│   ├── Room cards in responsive grid
│   ├── Loading skeletons while fetching
│   └── Empty state when no results match
│
└── Room Detail Page (/rooms/:id)
    ├── Image gallery
    ├── Room information (title, description, location)
    ├── Amenities list
    ├── Pricing and capacity
    ├── Owner information
    └── "Book Now" button
```

---

## 24.2 Room API Service

Create a service layer for room-related API calls:

```typescript
// webapp/src/services/roomApi.ts
import api from "./api";
import { Room, RoomsResponse, RoomResponse } from "@/types/room";

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

export const roomApi = {
  getAll: async (filters: RoomFilters = {}): Promise<RoomsResponse> => {
    // Build query parameters from filters
    const params = new URLSearchParams();

    if (filters.page) params.append("page", String(filters.page));
    if (filters.limit) params.append("limit", String(filters.limit));
    if (filters.search) params.append("search", filters.search);
    if (filters.location) params.append("location", filters.location);
    if (filters.minPrice) params.append("minPrice", String(filters.minPrice));
    if (filters.maxPrice) params.append("maxPrice", String(filters.maxPrice));
    if (filters.capacity) params.append("capacity", String(filters.capacity));
    if (filters.amenities && filters.amenities.length > 0) {
      params.append("amenities", filters.amenities.join(","));
    }

    const response = await api.get<RoomsResponse>(`/rooms?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<RoomResponse> => {
    const response = await api.get<RoomResponse>(`/rooms/${id}`);
    return response.data;
  },

  getFeatured: async (): Promise<RoomsResponse> => {
    const response = await api.get<RoomsResponse>("/rooms?limit=6&sort=newest");
    return response.data;
  },
};
```

**Why a service layer?** It keeps API logic out of components. If the API URL changes or you add caching, you only update one file.

---

## 24.3 Home Page with Featured Rooms

The home page shows a hero section and the latest rooms:

```tsx
// webapp/src/pages/Home.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { roomApi } from "@/services/roomApi";
import { Room, RoomsResponse } from "@/types/room";
import RoomCard from "@/components/rooms/RoomCard";

function Home(): JSX.Element {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState<string>("");

  const { data, isLoading } = useQuery<RoomsResponse>({
    queryKey: ["featuredRooms"],
    queryFn: roomApi.getFeatured,
  });

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    if (searchInput.trim()) {
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

## 24.4 Reusable Room Card Component

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

## 24.5 Room Listing Page with Filters

This is the main browsing page. It combines a filter sidebar with a results grid:

```tsx
// webapp/src/pages/RoomListing.tsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { roomApi, RoomFilters } from "@/services/roomApi";
import { Room, RoomsResponse } from "@/types/room";
import RoomCard from "@/components/rooms/RoomCard";
import { RoomCardSkeleton } from "@/pages/Home";

const LOCATIONS: string[] = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Bristol",
  "Edinburgh",
  "Glasgow",
  "Cardiff",
];

const AMENITY_OPTIONS: string[] = [
  "WiFi", "Parking", "Air Conditioning", "Projector",
  "Whiteboard", "TV Screen", "Kitchen", "Accessible",
];

function RoomListing(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialise filters from URL query parameters
  const [filters, setFilters] = useState<RoomFilters>({
    page: Number(searchParams.get("page")) || 1,
    limit: 12,
    search: searchParams.get("search") || "",
    location: searchParams.get("location") || "",
    minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
    maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    capacity: searchParams.get("capacity") ? Number(searchParams.get("capacity")) : undefined,
    amenities: searchParams.get("amenities") ? searchParams.get("amenities")!.split(",") : [],
  });

  // Debounced search
  const [searchInput, setSearchInput] = useState<string>(filters.search || "");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Debounce the search input
  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setFilters((prev: RoomFilters) => ({ ...prev, search: searchInput, page: 1 }));
    }, 500); // Wait 500ms after the user stops typing

    return () => clearTimeout(timer); // Cancel if user types again
  }, [searchInput]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.location) params.set("location", filters.location);
    if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
    if (filters.capacity) params.set("capacity", String(filters.capacity));
    if (filters.amenities && filters.amenities.length > 0) {
      params.set("amenities", filters.amenities.join(","));
    }
    if (filters.page && filters.page > 1) params.set("page", String(filters.page));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Fetch rooms with current filters
  const { data, isLoading } = useQuery<RoomsResponse>({
    queryKey: ["rooms", filters],
    queryFn: () => roomApi.getAll(filters),
  });

  const rooms: Room[] = data?.data || [];
  const pagination = data?.pagination;

  // Filter update helpers
  const updateFilter = (key: keyof RoomFilters, value: string | number | undefined): void => {
    setFilters((prev: RoomFilters) => ({ ...prev, [key]: value, page: 1 }));
  };

  const toggleAmenity = (amenity: string): void => {
    setFilters((prev: RoomFilters) => {
      const current: string[] = prev.amenities || [];
      const updated: string[] = current.includes(amenity)
        ? current.filter((a: string) => a !== amenity)
        : [...current, amenity];
      return { ...prev, amenities: updated, page: 1 };
    });
  };

  const clearFilters = (): void => {
    setSearchInput("");
    setFilters({ page: 1, limit: 12 });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms by name or description..."
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
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
            showFilters ? "block" : "hidden md:block"
          }`}
        >
          <div className="flex items-centre justify-between">
            <h3 className="font-semibold">Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>

          {/* Location filter */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={filters.location || "all"}
              onValueChange={(value: string) =>
                updateFilter("location", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {LOCATIONS.map((loc: string) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price range */}
          <div className="space-y-2">
            <Label>Price Range (&pound;/night)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateFilter("minPrice", e.target.value ? Number(e.target.value) : undefined)
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateFilter("maxPrice", e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label>Minimum Capacity</Label>
            <Input
              type="number"
              placeholder="Any"
              min={1}
              value={filters.capacity || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateFilter("capacity", e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="space-y-2">
              {AMENITY_OPTIONS.map((amenity: string) => (
                <div key={amenity} className="flex items-centre space-x-2">
                  <Checkbox
                    id={`filter-${amenity}`}
                    checked={filters.amenities?.includes(amenity) || false}
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
        <div className="flex-1">
          {/* Results count */}
          {pagination && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing {rooms.length} of {pagination.total} rooms
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index: number) => (
                <RoomCardSkeleton key={index} />
              ))}
            </div>
          ) : rooms.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room: Room) => (
                  <RoomCard key={room._id} room={room} />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-centre justify-centre gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() =>
                      setFilters((prev: RoomFilters) => ({
                        ...prev,
                        page: (prev.page || 1) - 1,
                      }))
                    }
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() =>
                      setFilters((prev: RoomFilters) => ({
                        ...prev,
                        page: (prev.page || 1) + 1,
                      }))
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState onClear={clearFilters} />
          )}
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ onClear }: { onClear: () => void }): JSX.Element {
  return (
    <div className="text-centre py-16">
      <p className="text-lg font-medium mb-2">No rooms found</p>
      <p className="text-muted-foreground mb-4">
        Try adjusting your filters or search terms.
      </p>
      <Button variant="outline" onClick={onClear}>
        Clear All Filters
      </Button>
    </div>
  );
}

export default RoomListing;
```

---

## 24.6 How Debounce Works

Without debounce, every keystroke in the search bar triggers an API request. Typing "London" would fire 6 requests: "L", "Lo", "Lon", "Lond", "Londo", "London". Most of those are wasted.

**Debounce** waits until the user stops typing for a set period (500ms) before making the request:

```typescript
useEffect(() => {
  // Set a timer every time searchInput changes
  const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
    // This only runs if the user hasn't typed for 500ms
    setFilters((prev: RoomFilters) => ({ ...prev, search: searchInput, page: 1 }));
  }, 500);

  // Cleanup: cancel the timer if searchInput changes again before 500ms
  return () => clearTimeout(timer);
}, [searchInput]);
```

**Timeline example:**
```
Time:   0ms   100ms   200ms   400ms   900ms
Type:   "L"   "Lo"    "Lon"   "London"
Timer:  set   cancel  cancel  cancel   FIRE! → API call with "London"
              +set    +set    +set
```

The cleanup function (`return () => clearTimeout(timer)`) is called every time the effect re-runs, cancelling the previous timer.

---

## 24.7 How `queryKey` Drives Re-fetching

React Query uses the `queryKey` to decide when to re-fetch:

```typescript
const { data, isLoading } = useQuery<RoomsResponse>({
  queryKey: ["rooms", filters],
  queryFn: () => roomApi.getAll(filters),
});
```

When `filters` changes (new search term, different location, page change), the query key changes, and React Query automatically fetches fresh data. You do not need to manually trigger re-fetches.

---

## 24.8 Room Detail Page

When a user clicks on a room card, they see the full details:

```tsx
// webapp/src/pages/RoomDetail.tsx
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Users, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { roomApi } from "@/services/roomApi";
import { RoomResponse } from "@/types/room";
import { API_URL } from "@/services/api";

function RoomDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<RoomResponse>({
    queryKey: ["room", id],
    queryFn: () => roomApi.getById(id!),
    enabled: !!id, // Only fetch when id is available
  });

  const baseUrl: string = API_URL.replace("/api", "");

  if (isLoading) {
    return <RoomDetailSkeleton />;
  }

  if (error || !data?.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-centre">
        <p className="text-lg text-destructive mb-4">Room not found.</p>
        <Button variant="outline" asChild>
          <Link to="/rooms">Back to Rooms</Link>
        </Button>
      </div>
    );
  }

  const room = data.data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/rooms">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Rooms
        </Link>
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
              <Button className="w-full" size="lg" asChild>
                <Link to={`/rooms/${room._id}/book`}>Book Now</Link>
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

## 24.9 Responsive Grid with Tailwind

Tailwind makes responsive layouts straightforward with breakpoint prefixes:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

| Breakpoint | Width       | Columns | Use Case       |
|-----------|-------------|---------|----------------|
| (default) | 0 - 767px   | 1       | Mobile phones  |
| `md:`     | 768 - 1023px| 2       | Tablets        |
| `lg:`     | 1024px+     | 3       | Desktops       |

**How it works:** Tailwind applies styles from the smallest breakpoint up. `grid-cols-1` applies to all screen sizes. `md:grid-cols-2` overrides it at 768px and above. `lg:grid-cols-3` overrides again at 1024px and above.

### The Filter Sidebar on Mobile

On mobile, the filter sidebar is hidden by default and shown when the user taps a button:

```tsx
<aside className={`w-64 shrink-0 ${showFilters ? "block" : "hidden md:block"}`}>
```

- On desktop (`md:block`): sidebar is always visible
- On mobile: hidden by default, toggled with the filter button

---

## 24.10 Loading Skeletons

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

## 24.11 Setting Up Routes

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

## 24.12 Complete File Summary

```
webapp/src/
├── components/
│   ├── rooms/
│   │   └── RoomCard.tsx           # Reusable room card with image, price, amenities
│   └── ui/                       # shadcn components (Card, Badge, Skeleton, etc.)
├── pages/
│   ├── Home.tsx                   # Hero + featured rooms grid
│   ├── RoomListing.tsx            # Filters + search + paginated results
│   └── RoomDetail.tsx             # Full room info + image gallery + booking card
├── services/
│   ├── api.ts                     # Axios instance
│   └── roomApi.ts                 # Room API service layer
└── types/
    └── room.ts                    # Room interfaces
```

---

## Practice Exercises

### Exercise 1: Complete Browsing Experience
1. Create the `roomApi.ts` service with `getAll`, `getById`, and `getFeatured` methods
2. Build the Home page with a search bar and featured rooms grid
3. Build the Room Listing page with all filters (location, price, capacity, amenities)
4. Test the search debounce -- open the browser DevTools Network tab and verify only one request is made after you stop typing
5. Test pagination with Previous/Next buttons

### Exercise 2: Room Detail Page
1. Build the detail page with image gallery, description, amenities, and pricing card
2. Test navigating from a room card to the detail page
3. Test the "Back to Rooms" button
4. Verify the "Book Now" button links to the correct URL

### Exercise 3: Responsive Testing
1. Open the browser DevTools and toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
2. Test the room grid at mobile width (375px) -- should show 1 column
3. Test at tablet width (768px) -- should show 2 columns
4. Test at desktop width (1024px+) -- should show 3 columns
5. Test the filter sidebar -- should collapse on mobile and show via toggle button

### Exercise 4: URL-Based Filters
Verify that filters persist in the URL:
1. Apply a location filter and check the URL updates to `?location=London`
2. Copy the URL, open it in a new tab -- the filter should be applied
3. Add a search term and price range -- verify all appear as query parameters
4. Clear all filters and verify the URL returns to `/rooms`

---

## Key Takeaways
1. **Service layers** (`roomApi.ts`) separate API logic from components, making code easier to test and maintain
2. **`useQuery` with dynamic `queryKey`** automatically re-fetches when filter state changes -- no manual refetch needed
3. **Debounce** prevents excessive API calls by waiting until the user stops typing (500ms delay with `setTimeout`)
4. **`URLSearchParams`** builds query strings from filter state: `?location=London&minPrice=50`
5. **`useSearchParams`** from React Router syncs filter state with the browser URL, enabling shareable filtered views
6. **Loading skeletons** (shadcn `Skeleton`) show content shapes while data loads, providing better UX than spinners
7. **Empty states** tell users why there are no results and offer a way to clear filters
8. **Responsive grids** use Tailwind breakpoints: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
9. **`line-clamp`** truncates text to keep cards a consistent height
10. The **sticky booking card** (`sticky top-4`) stays visible as the user scrolls through room details
