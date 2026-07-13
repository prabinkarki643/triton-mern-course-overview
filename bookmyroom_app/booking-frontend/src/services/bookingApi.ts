// src/services/bookingApi.ts
// Matches Lesson 25 section 25.9. Unwrap the { data } envelope once, so
// the rest of the app deals in clean types.
import api from "./api";
import type {
  Booking,
  BookingFilters,
  BookingStatus,
  BookingsResponse,
  CreateBookingData,
} from "@/types/booking";

export const bookingApi = {
  async create(payload: CreateBookingData): Promise<Booking> {
    const { data } = await api.post<{ data: Booking }>("/bookings", payload);
    return data.data;
  },

  async getById(id: string): Promise<Booking> {
    const { data } = await api.get<{ data: Booking }>(`/bookings/${id}`);
    return data.data;
  },

  async getMy(filters: BookingFilters = {}): Promise<BookingsResponse> {
    const { data } = await api.get<BookingsResponse>("/bookings/my", {
      params: filters,
    });
    return data;
  },

  async getOwner(filters: BookingFilters = {}): Promise<BookingsResponse> {
    const { data } = await api.get<BookingsResponse>("/bookings/owner", {
      params: filters,
    });
    return data;
  },

  async updateStatus(
    id: string,
    status: Extract<BookingStatus, "confirmed" | "cancelled">
  ): Promise<Booking> {
    const { data } = await api.patch<{ data: Booking }>(
      `/bookings/${id}/status`,
      { status }
    );
    return data.data;
  },
};
