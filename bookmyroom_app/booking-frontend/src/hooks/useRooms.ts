// src/hooks/useRooms.ts
// Matches Lesson 23 section 23.6 -- one focused hook per action, toasts inside
// mutations, cache invalidation via the roomKeys factory.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { roomApi } from "@/services/roomApi";
import type { RoomFilters, UpdateRoomData } from "@/types/room";

// Centralised query keys -- one source of truth for cache invalidation
export const roomKeys = {
  all: ["rooms"] as const,
  lists: () => [...roomKeys.all, "list"] as const,
  list: (filters: RoomFilters) => [...roomKeys.lists(), filters] as const,
  mine: (filters: RoomFilters) => [...roomKeys.all, "mine", filters] as const,
  details: () => [...roomKeys.all, "detail"] as const,
  detail: (id: string) => [...roomKeys.details(), id] as const,
};

// --- QUERY HOOKS ---------------------------------------------------------

// Public rooms list (used in the public browse page in Lesson 24)
export function useRooms(filters: RoomFilters = {}) {
  return useQuery({
    queryKey: roomKeys.list(filters),
    queryFn: () => roomApi.getAll(filters),
    placeholderData: (previousData) => previousData,
  });
}

// Owner's rooms list (used in the My Rooms page)
export function useMyRooms(filters: RoomFilters = {}) {
  return useQuery({
    queryKey: roomKeys.mine(filters),
    queryFn: () => roomApi.getMine(filters),
    placeholderData: (previousData) => previousData,
  });
}

// Single room by id -- used by Edit page and public detail page
export function useRoom(id: string) {
  return useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => roomApi.getById(id),
    enabled: !!id,
  });
}

// --- MUTATION HOOKS ------------------------------------------------------

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => roomApi.create(formData),
    onSuccess: () => {
      toast.success("Room created successfully");
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create room");
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoomData }) =>
      roomApi.update(id, payload),
    onSuccess: (_room, variables) => {
      toast.success("Room updated successfully");
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(variables.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update room");
    },
  });
}

// Append new images to a room
export function useAddRoomImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      roomApi.addImages(id, formData),
    onSuccess: (_room, variables) => {
      toast.success("Images uploaded");
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload images");
    },
  });
}

// Remove one image from a room
export function useDeleteRoomImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, imageName }: { id: string; imageName: string }) =>
      roomApi.deleteImage(id, imageName),
    onSuccess: (_void, variables) => {
      toast.success("Image removed");
      queryClient.invalidateQueries({ queryKey: roomKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove image");
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roomApi.delete(id),
    onSuccess: () => {
      toast.success("Room deleted");
      queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete room");
    },
  });
}
