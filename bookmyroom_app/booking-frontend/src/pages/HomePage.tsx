// src/pages/HomePage.tsx
// Matches Lesson 24 section 24.4. Hero + search that pre-fills the
// listing page + featured rooms grid + "View All Rooms" CTA.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RoomCard from "@/components/rooms/RoomCard";
import RoomCardSkeleton from "@/components/rooms/RoomCardSkeleton";
import { useFeaturedRooms } from "@/hooks/useRooms";
import type { Room } from "@/types/room";

export function HomePage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState<string>("");
  const { data, isLoading } = useFeaturedRooms();

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      // Send the user to /rooms with the search pre-filled -- useRoomFilters
      // picks it up from the URL automatically.
      navigate(`/rooms?search=${encodeURIComponent(trimmed)}`);
    }
  };

  const rooms: Room[] = data?.data ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="bg-muted px-4 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Find the Perfect Room</h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
          Browse meeting rooms, event spaces and work areas across the country.
          Book instantly at the best prices.
        </p>

        <form
          onSubmit={handleSearch}
          className="mx-auto flex max-w-md gap-2"
        >
          <Input
            placeholder="Search by location or room name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </form>
      </section>

      {/* Featured rooms */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">Recently Added Rooms</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <RoomCardSkeleton key={index} />
            ))}
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room: Room) => (
              <RoomCard key={room._id} room={room} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center">
            No rooms available yet. Check back soon!
          </p>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate("/rooms")}>
            View All Rooms
          </Button>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
