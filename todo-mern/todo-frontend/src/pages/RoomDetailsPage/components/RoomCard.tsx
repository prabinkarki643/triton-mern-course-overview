interface Room {
  id: number
  title: string
}

function RoomCard({ room }: { room: Room }) {
  return <h1>Room Card {room.title}</h1>
}

export default RoomCard
