// src/components/rooms/RoomCard.tsx
// Matches Lesson 24 section 24.5. Reusable card shared by the Home and
// Listing pages -- image, title/location, description, amenity badges,
// price and capacity.
import { Link } from "react-router-dom"
import { MapPin, Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Room } from "@/types/room"
import { API_URL } from "@/services/api"

interface RoomCardProps {
  room: Room
}

function RoomCard({ room }: RoomCardProps) {
  // Strip the trailing /api so we can hit /uploads/rooms/... directly
  const baseUrl: string = API_URL.replace(/\/api\/?$/, "")

  return (
    <Link to={`/rooms/${room._id}`} className="group block">
      <Card className="overflow-hidden py-0 pb-6 transition-shadow hover:shadow-lg">
        {/* Room image */}
        <div className="aspect-video overflow-hidden">
          {room.images.length > 0 ? (
            <img
              src={`${baseUrl}/uploads/rooms/${room.images[0]}`}
              alt={room.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-1 text-lg">{room.title}</CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {room.location}
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {room.description}
          </p>

          {room.amenities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
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

        <CardFooter className="flex items-center justify-between">
          <span className="text-lg font-bold">
            Rs{room.price}
            <span className="text-sm font-normal text-muted-foreground">
              /night
            </span>
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            {room.capacity}
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}

export default RoomCard
