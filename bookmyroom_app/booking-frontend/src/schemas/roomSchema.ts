// src/schemas/roomSchema.ts
// Matches Lesson 23 section 23.14. Shared by both Add Room and Edit Room forms.
import { z } from "zod";

export const roomFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description cannot exceed 1000 characters"),
  location: z
    .string()
    .min(2, "Location is required")
    .max(100, "Location cannot exceed 100 characters"),
  price: z.coerce
    .number()
    .positive("Price must be greater than 0"),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(50, "Capacity cannot exceed 50"),
  amenities: z.array(z.string()).optional().default([]),
});

export type RoomFormData = z.infer<typeof roomFormSchema>;

export const AMENITY_OPTIONS: string[] = [
  "WiFi",
  "Parking",
  "Air Conditioning",
  "Projector",
  "Whiteboard",
  "TV Screen",
  "Kitchen",
  "Accessible",
];
