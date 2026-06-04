import { useParams, Link } from "react-router-dom";
import {
  MapPin,
  Users,
  Star,
  Check,
  Calendar,
  Wallet,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { rooms } from "@/lib/mock-data";

function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const room = rooms.find((r) => r._id === id);

  if (!room) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="font-heading text-2xl font-semibold">Room not found</h1>
        <p className="mt-2 text-muted-foreground">
          The room you are looking for does not exist.
        </p>
        <Button className="mt-6" render={<Link to="/">Back to home</Link>} />
      </div>
    );
  }

  const nights = 3;
  const subtotal = room.price * nights;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to all rooms
      </Link>

      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {room.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">4.8</span>
              <span>(126 reviews)</span>
            </div>
            <span className="hidden sm:inline">·</span>
            <div className="flex items-center gap-1">
              <MapPin className="size-4" />
              <span>{room.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* IMAGE GALLERY */}
      <div className="mb-10 grid gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="overflow-hidden rounded-2xl bg-muted sm:col-span-2 sm:row-span-2">
          <img
            src={room.images[0]}
            alt={room.title}
            className="aspect-[4/3] size-full object-cover"
          />
        </div>
        <div className="hidden overflow-hidden rounded-2xl bg-muted sm:block">
          <img
            src={room.images[1] ?? room.images[0]}
            alt={room.title}
            className="aspect-square size-full object-cover"
          />
        </div>
        <div className="hidden overflow-hidden rounded-2xl bg-muted sm:block">
          <img
            src={room.images[2] ?? room.images[0]}
            alt={room.title}
            className="aspect-square size-full object-cover"
          />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        {/* LEFT COLUMN */}
        <div className="space-y-8">
          {/* Host */}
          <div className="flex items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                  {room.ownerName
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-heading text-base font-semibold">
                  Hosted by {room.ownerName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Superhost · 3 years hosting
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground sm:flex">
              <Users className="size-4" />
              <span>Up to {room.capacity} guests</span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="font-heading text-lg font-semibold">
              About this place
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {room.description}
            </p>
          </div>

          <Separator />

          {/* Amenities */}
          <div>
            <h2 className="font-heading text-lg font-semibold">
              What this place offers
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {room.amenities.map((amenity) => (
                <div
                  key={amenity}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <Check className="size-4" />
                  </div>
                  <span className="text-sm font-medium">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Trust strip */}
          <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="text-sm text-muted-foreground">
              Your booking is protected. Cancel free of charge up to 48 hours
              before check-in.
            </div>
          </div>
        </div>

        {/* BOOKING CARD */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-card p-6 shadow-lg ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-heading text-2xl font-bold">
                  Rs. {room.price.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground"> /night</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <span className="font-medium">4.8</span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Check-in
                  </Label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="h-6 border-0 px-0 text-sm focus-visible:ring-0"
                      defaultValue="2026-06-12"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Check-out
                  </Label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="h-6 border-0 px-0 text-sm focus-visible:ring-0"
                      defaultValue="2026-06-15"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Guests</Label>
                <Select defaultValue="2">
                  <SelectTrigger className="mt-1 h-10 w-full">
                    <SelectValue placeholder="Select guests" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(room.capacity, 10) }).map(
                      (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1} guest{i + 1 > 1 ? "s" : ""}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Payment method
                </Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 ring-2 ring-rose-500/0 transition-all has-[input:checked]:border-rose-500 has-[input:checked]:ring-rose-500/30">
                    <input
                      type="radio"
                      name="payment"
                      defaultChecked
                      className="size-4 accent-rose-600"
                    />
                    <Wallet className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">eSewa</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 ring-2 ring-rose-500/0 transition-all has-[input:checked]:border-rose-500 has-[input:checked]:ring-rose-500/30">
                    <input
                      type="radio"
                      name="payment"
                      className="size-4 accent-rose-600"
                    />
                    <Wallet className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">COD</span>
                  </label>
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>
                  Rs. {room.price.toLocaleString()} x {nights} nights
                </span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Service fee</span>
                <span>Rs. {serviceFee.toLocaleString()}</span>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between font-heading text-base font-semibold">
                <span>Total</span>
                <span>Rs. {total.toLocaleString()}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-5 h-12 w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
              title="Mockup — no real booking"
            >
              Book Now
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              You will not be charged yet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomDetailPage;
