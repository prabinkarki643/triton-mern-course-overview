// src/pages/RoomDetail.tsx
// Matches Lesson 24 section 24.11. Image gallery + description + amenities +
// owner + sticky booking card. The "Book Now" button routes to /rooms/:id/book
// (that page is built in Lesson 25 -- for now it just navigates there).
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Check, MapPin, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useRoom } from "@/hooks/useRooms"
import { API_URL } from "@/services/api"

function RoomDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: room, isLoading, error } = useRoom(id ?? "")
  const [activeImage, setActiveImage] = useState<number>(0)

  const baseUrl: string = API_URL.replace(/\/api\/?$/, "")

  if (isLoading) {
    return <RoomDetailSkeleton />
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="mb-4 text-lg text-destructive">Room not found.</p>
        <Button variant="outline" asChild>
          <Link to="/rooms">Back to Rooms</Link>
        </Button>
      </div>
    )
  }

  // The lesson uses room.owner.name, but the backend can return owner as
  // either an ObjectId string or a populated object. Handle both here so
  // the page never crashes on unpopulated data.
  const ownerName =
    typeof room.owner === "object" && room.owner !== null
      ? room.owner.name
      : "the host"

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link to="/rooms">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Rooms
        </Link>
      </Button>

      {/* Image gallery */}
      {room.images.length > 0 && (
        <div className="mb-8">
          <div className="mb-2 aspect-video overflow-hidden rounded-lg">
            <img
              src={`${baseUrl}/uploads/rooms/${room.images[activeImage]}`}
              alt={room.title}
              className="h-full w-full object-cover"
            />
          </div>

          {room.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {room.images.map((image: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`aspect-video overflow-hidden rounded-md ${
                    index === activeImage ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <img
                    src={`${baseUrl}/uploads/rooms/${image}`}
                    alt={`${room.title} - image ${index + 1}`}
                    className="h-full w-full object-cover transition-opacity hover:opacity-80"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: room information (2/3 width) */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{room.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{room.location}</span>
              <span className="mx-2">·</span>
              <Users className="h-4 w-4" />
              <span>Up to {room.capacity} guests</span>
            </div>
          </div>

          <Separator />

          <div>
            <h2 className="mb-3 text-xl font-semibold">About This Room</h2>
            <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
              {room.description}
            </p>
          </div>

          {room.amenities.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="mb-3 text-xl font-semibold">Amenities</h2>
                <div className="grid grid-cols-2 gap-3">
                  {room.amenities.map((amenity: string) => (
                    <div key={amenity} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h2 className="mb-3 text-xl font-semibold">Hosted By</h2>
            <p className="text-muted-foreground">{ownerName}</p>
          </div>
        </div>

        {/* Right: booking card (1/3 width) -- sticky on desktop */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-baseline gap-1">
                <span className="text-2xl">Rs{room.price}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  /night
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" size="lg" asChild>
                <Link to={`/rooms/${room._id}/book`}>Book Now</Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                You will not be charged yet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RoomDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="mb-4 h-8 w-24" />
      <Skeleton className="mb-8 aspect-video w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default RoomDetail
