// src/pages/owner/EditRoom.tsx
// Matches Lesson 23 section 23.17. Text fields save as JSON via useUpdateRoom;
// the image gallery uses useAddRoomImages / useDeleteRoomImage independently.
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRoom,
  useUpdateRoom,
  useAddRoomImages,
  useDeleteRoomImage,
} from "@/hooks/useRooms";
import { useImagePreviews } from "@/hooks/useImagePreviews";
import { API_URL } from "@/services/api";
import {
  roomFormSchema,
  AMENITY_OPTIONS,
  type RoomFormData,
} from "@/schemas/roomSchema";

function EditRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: room, isLoading } = useRoom(id ?? "");
  const { mutate: updateRoom, isPending: isSaving } = useUpdateRoom();
  const { mutate: addImages, isPending: isUploading } = useAddRoomImages();
  const { mutate: deleteImage } = useDeleteRoomImage();
  const { files, previews, onSelect, clear: clearPreviews } = useImagePreviews();

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      price: 0,
      capacity: 1,
      amenities: [],
    },
  });

  // Pre-fill the form once the room data arrives
  useEffect(() => {
    if (room) {
      form.reset({
        title: room.title,
        description: room.description,
        location: room.location,
        price: room.price,
        capacity: room.capacity,
        amenities: room.amenities,
      });
    }
  }, [room, form]);

  // Save text fields -- plain JSON, no FormData
  const onSubmit = (data: RoomFormData): void => {
    if (!id) return;
    updateRoom(
      { id, payload: data },
      { onSuccess: () => navigate("/owner/rooms") }
    );
  };

  // Upload the picked images, then clear the previews
  const handleUploadImages = (): void => {
    if (!id || files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    addImages(
      { id, formData },
      { onSuccess: () => clearPreviews() }
    );
  };

  // Remove a single image straight from the gallery
  const handleDeleteImage = (imageName: string): void => {
    if (!id) return;
    deleteImage({ id, imageName });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!room) {
    return <div className="text-destructive">Room not found.</div>;
  }

  // Strip the trailing /api from the base URL so we can point at /uploads/rooms/...
  const baseUrl: string = API_URL.replace(/\/api\/?$/, "");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Edit Room</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Room Title</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  rows={4}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="location"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="price"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Price per Night (£)
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    step="0.01"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Maximum Capacity</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    max={50}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            name="amenities"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Amenities</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITY_OPTIONS.map((amenity: string) => (
                    <label key={amenity} className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value?.includes(amenity) ?? false}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...(field.value ?? []), amenity]
                            : (field.value ?? []).filter(
                                (a: string) => a !== amenity
                              );
                          field.onChange(next);
                        }}
                      />
                      <span className="text-sm">{amenity}</span>
                    </label>
                  ))}
                </div>
                <FieldDescription>Select all that apply.</FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/owner/rooms")}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Image gallery -- managed independently from the form above */}
      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Photos</h2>
          <p className="text-muted-foreground text-sm">
            Hover an image to remove it, or add more below.
          </p>
        </div>

        {room.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {room.images.map((image) => (
              <div
                key={image}
                className="group relative aspect-video overflow-hidden rounded-md border"
              >
                <img
                  src={`${baseUrl}/uploads/rooms/${image}`}
                  alt="Room"
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDeleteImage(image)}
                  aria-label="Delete image"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No photos yet.</p>
        )}

        <div className="space-y-3">
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            onChange={(e) => onSelect(e.target.files)}
          />

          {previews.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="aspect-video overflow-hidden rounded-md border"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={handleUploadImages}
                disabled={isUploading}
              >
                {isUploading
                  ? "Uploading..."
                  : `Upload ${files.length} image(s)`}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default EditRoom;
