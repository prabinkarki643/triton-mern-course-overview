// src/services/roomApi.ts
// Matches Lesson 23 section 23.5. Pure HTTP -- no React Query knowledge.
import api from "./api";
import type {
  Room,
  RoomFilters,
  RoomsResponse,
  UpdateRoomData,
} from "@/types/room";

export const roomApi = {
  // GET /api/rooms -- public list with filters/pagination
  async getAll(filters: RoomFilters = {}): Promise<RoomsResponse> {
    const { data } = await api.get<RoomsResponse>("/rooms", { params: filters });
    return data;
  },

  // GET /api/rooms/my-rooms -- current owner's rooms (server pulls owner from JWT)
  async getMine(filters: RoomFilters = {}): Promise<RoomsResponse> {
    const { data } = await api.get<RoomsResponse>("/rooms/my-rooms", {
      params: filters,
    });
    return data;
  },

  // GET /api/rooms/:id -- single room (owner populated)
  async getById(id: string): Promise<Room> {
    const { data } = await api.get<{ data: Room }>(`/rooms/${id}`);
    return data.data;
  },

  // POST /api/rooms (multipart) -- text + initial images
  async create(formData: FormData): Promise<Room> {
    const { data } = await api.post<{ data: Room }>("/rooms", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  // PUT /api/rooms/:id -- text fields only, JSON body
  async update(id: string, payload: UpdateRoomData): Promise<Room> {
    const { data } = await api.put<{ data: Room }>(`/rooms/${id}`, payload);
    return data.data;
  },

  // POST /api/rooms/:id/images (multipart) -- append new images
  async addImages(id: string, formData: FormData): Promise<Room> {
    const { data } = await api.post<{ data: Room }>(
      `/rooms/${id}/images`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data.data;
  },

  // DELETE /api/rooms/:id/images/:imageName -- remove one image
  async deleteImage(id: string, imageName: string): Promise<void> {
    await api.delete(`/rooms/${id}/images/${imageName}`);
  },

  // DELETE /api/rooms/:id
  async delete(id: string): Promise<void> {
    await api.delete(`/rooms/${id}`);
  },
};
