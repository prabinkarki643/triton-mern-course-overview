// src/pages/RoomDetailPage.tsx
import { useParams } from "react-router-dom"
import RoomCard from "./components/RoomCard"

function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="mx-auto max-w-2xl py-16">
      <h1 className="mb-4 text-3xl font-bold">Room Details</h1>
      <p className="text-muted-foreground">
        Showing details for room ID: <strong>{id}</strong>
      </p>
      {/* Later, you would fetch room data using this ID */}

      <RoomCard room={{ id: 1, title: `Room ${id}` }} />
    </div>
  )
}

export default RoomDetailPage
