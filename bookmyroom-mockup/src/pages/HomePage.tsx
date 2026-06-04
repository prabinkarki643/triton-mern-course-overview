import { Search, MapPin, Calendar, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RoomCard from "@/components/RoomCard";
import { rooms } from "@/lib/mock-data";

function HomePage() {
  const featured = rooms.slice(0, 3);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-amber-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-200/40 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-rose-500" />
              <span>Over 500 unique stays across Nepal</span>
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Find your perfect{" "}
              <span className="bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                stay
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              From cosy apartments in Thamel to lakeside villas in Pokhara —
              book unique rooms and venues across Nepal in seconds.
            </p>
          </div>

          {/* SEARCH BAR */}
          <div className="mx-auto mt-10 max-w-4xl rounded-2xl bg-background p-2 shadow-xl ring-1 ring-foreground/10">
            <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto] md:gap-0 md:divide-x md:divide-border">
              <div className="flex items-center gap-2 px-3 py-2">
                <MapPin className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Location
                  </p>
                  <Input
                    placeholder="Where are you going?"
                    className="h-6 border-0 px-0 text-sm focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <Calendar className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Check-in
                  </p>
                  <Input
                    placeholder="Add date"
                    className="h-6 border-0 px-0 text-sm focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2">
                <Users className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Guests
                  </p>
                  <Input
                    placeholder="Add guests"
                    className="h-6 border-0 px-0 text-sm focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="flex items-center p-1">
                <Button
                  size="lg"
                  className="h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 text-white hover:from-rose-600 hover:to-pink-700 md:w-auto"
                >
                  <Search className="size-4" />
                  <span>Search</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick filters */}
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {["Kathmandu", "Pokhara", "Bhaktapur", "Lalitpur", "Nagarkot"].map(
              (loc) => (
                <button
                  key={loc}
                  className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted"
                >
                  {loc}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Featured rooms
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hand-picked stays our guests love most this season.
            </p>
          </div>
          <Button variant="ghost" className="hidden sm:inline-flex">
            View all
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((room) => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      </section>

      {/* ALL ROOMS */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Explore all stays
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {rooms.length} unique properties across Nepal
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
