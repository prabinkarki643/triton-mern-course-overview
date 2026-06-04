// booking-frontend/src/types/room.ts

export interface Room {
  _id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  amenities: string[];
  images: string[];
  owner: string | { _id: string; name: string; email: string };
  isAvailable: boolean;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomData {
  title: string;
  description: string;
  price: number;
  location: string;
  amenities: string[];
  capacity: number;
}