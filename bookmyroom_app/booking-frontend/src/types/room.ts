// booking-frontend/src/types/room.ts
// Matches Lesson 23 section 23.4 -- shape returned by the backend + shapes we
// send back for filters + updates.

export type RoomStatus = "active" | "inactive";

export interface Room {
  _id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  capacity: number;
  amenities: string[];
  images: string[];
  isAvailable: boolean;
  owner: string | { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface RoomsResponse {
  data: Room[];
  meta: PaginationMeta;
}

export interface RoomFilters {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  status?: RoomStatus;
  sort?: string;
}

// Body of PUT /api/rooms/:id -- text fields only, all optional (matches L22.15)
export interface UpdateRoomData {
  title?: string;
  description?: string;
  location?: string;
  price?: number;
  capacity?: number;
  amenities?: string[];
  isAvailable?: boolean;
}

export interface CreateRoomData {
  title: string;
  description: string;
  price: number;
  location: string;
  amenities: string[];
  capacity: number;
}
