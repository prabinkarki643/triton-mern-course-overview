// src/hooks/useBookings.ts
// Matches Lesson 25 section 25.10. Query keys factory + one focused hook
// per action; each mutation invalidates the correct slice of the cache
// and shows a Sonner toast.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingApi } from "@/services/bookingApi";
import type {
  BookingFilters,
  BookingStatus,
  CreateBookingData,
} from "@/types/booking";

export const bookingKeys = {
  all: ["bookings"] as const,
  myLists: () => [...bookingKeys.all, "my"] as const,
  myList: (filters: BookingFilters) =>
    [...bookingKeys.myLists(), filters] as const,
  ownerLists: () => [...bookingKeys.all, "owner"] as const,
  ownerList: (filters: BookingFilters) =>
    [...bookingKeys.ownerLists(), filters] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

// --- Queries -----------------------------------------------------------

export function useMyBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.myList(filters),
    queryFn: () => bookingApi.getMy(filters),
    placeholderData: (previousData) => previousData,
  });
}

export function useOwnerBookings(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.ownerList(filters),
    queryFn: () => bookingApi.getOwner(filters),
    placeholderData: (previousData) => previousData,
  });
}

// --- Mutations ---------------------------------------------------------

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBookingData) => bookingApi.create(payload),
    onSuccess: () => {
      toast.success("Booking request sent -- the owner will review it shortly");
      queryClient.invalidateQueries({ queryKey: bookingKeys.myLists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create booking");
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Extract<BookingStatus, "confirmed" | "cancelled">;
    }) => bookingApi.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "confirmed"
          ? "Booking confirmed"
          : "Booking cancelled"
      );
      // The same booking appears in both my- and owner- views; invalidate
      // the top-level key so every slice refreshes.
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });
}
