// src/pages/RoomListing.tsx
// Matches Lesson 24 section 24.7. Search bar + filter sidebar + card grid,
// all driven by useRoomFilters so the URL is the single source of truth.
import { useEffect, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import RoomCard from "@/components/rooms/RoomCard"
import RoomCardSkeleton from "@/components/rooms/RoomCardSkeleton"
import { RoomPagination } from "@/components/rooms/room-pagination"
import { useRooms } from "@/hooks/useRooms"
import { useRoomFilters } from "@/hooks/useRoomFilters"

const LOCATIONS: string[] = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Bristol",
  "Edinburgh",
  "Glasgow",
  "Cardiff",
]

const AMENITY_OPTIONS: string[] = [
  "WiFi",
  "Parking",
  "Air Conditioning",
  "Projector",
  "Whiteboard",
  "TV Screen",
  "Kitchen",
  "Accessible",
]

function RoomListing() {
  const { filters, setFilter, resetFilters } = useRoomFilters()
  const { data, isLoading, isFetching } = useRooms(filters)

  // Local input state so the search box stays responsive while we debounce.
  const [searchInput, setSearchInput] = useState<string>(filters.search ?? "")
  const [showFilters, setShowFilters] = useState<boolean>(false)

  // Debounce: 300ms after the user stops typing, push to the URL.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== (filters.search ?? "")) {
        setFilter("search", searchInput || undefined)
      }
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // Keep the input in sync if the URL changes externally (e.g. Reset).
  useEffect(() => {
    setSearchInput(filters.search ?? "")
  }, [filters.search])

  const toggleAmenity = (amenity: string): void => {
    const current = filters.amenities ?? []
    const next = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity]
    setFilter("amenities", next.length ? next : undefined)
  }

  const hasActiveFilters: boolean =
    !!filters.search ||
    !!filters.location ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.capacity !== undefined ||
    (filters.amenities?.length ?? 0) > 0

  const rooms = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Search bar */}
      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            showFilters ? "block" : "hidden md:block"
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

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={filters.location ?? "all"}
              onValueChange={(value) =>
                setFilter("location", value === "all" ? undefined : value)
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
            <Label>Price range (Rs/night)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minPrice ?? ""}
                onChange={(e) =>
                  setFilter(
                    "minPrice",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxPrice ?? ""}
                onChange={(e) =>
                  setFilter(
                    "maxPrice",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label>Minimum capacity</Label>
            <Select
              value={filters.capacity ? String(filters.capacity) : "any"}
              onValueChange={(value) =>
                setFilter(
                  "capacity",
                  value === "any" ? undefined : Number(value)
                )
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
                  <Label
                    htmlFor={`filter-${amenity}`}
                    className="text-sm font-normal"
                  >
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <RoomCardSkeleton key={index} />
              ))}
            </div>
          ) : rooms.length > 0 ? (
            <>
              <div
                className={`grid grid-cols-1 gap-6 transition-opacity md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                  isFetching ? "opacity-60" : "opacity-100"
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
  )
}

function EmptyState({
  onReset,
  hasFilters,
}: {
  onReset: () => void
  hasFilters: boolean
}) {
  return (
    <div className="rounded-lg border py-16 text-center">
      <p className="mb-2 text-lg font-medium">No rooms found</p>
      <p className="mb-4 text-muted-foreground">
        {hasFilters
          ? "Try adjusting your filters or search terms."
          : "There are no rooms available yet -- check back soon."}
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onReset}>
          Reset all filters
        </Button>
      )}
    </div>
  )
}

export default RoomListing
