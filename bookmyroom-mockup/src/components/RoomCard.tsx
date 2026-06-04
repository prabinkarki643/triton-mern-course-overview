import { Link } from "react-router-dom";
import { MapPin, Users, Star } from "lucide-react";
import type { Room } from "@/lib/mock-data";

interface RoomCardProps {
  room: Room;
}

function RoomCard({ room }: RoomCardProps) {
  return (
    <Link
      to={`/rooms/${room._id}`}
      className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-foreground/20"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={room.images[0]}
          alt={room.title}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {!room.isAvailable && (
          <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            Unavailable
          </div>
        )}
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          <span>4.8</span>
        </div>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-heading text-base font-semibold text-foreground">
          {room.title}
        </h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">{room.location}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            <span>Up to {room.capacity}</span>
          </div>
          <div className="text-right">
            <span className="font-heading text-base font-semibold text-foreground">
              Rs. {room.price.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground"> /night</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default RoomCard;
