// src/pages/owner/AddRoom.tsx
// Matches Lesson 23 section 23.16. Uses the modern shadcn Field primitives
// together with React Hook Form's Controller -- no <Form> wrapper needed.
import { useNavigate } from "react-router-dom"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useCreateRoom } from "@/hooks/useRooms"
import { useImagePreviews } from "@/hooks/useImagePreviews"
import {
  roomFormSchema,
  AMENITY_OPTIONS,
  type RoomFormData,
} from "@/schemas/roomSchema"

function AddRoom() {
  const navigate = useNavigate()
  const { mutate: createRoom, isPending } = useCreateRoom()
  const { files, previews, onSelect } = useImagePreviews()

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
  })

  const onSubmit = (data: RoomFormData): void => {
    if (files.length === 0) {
      alert("Please select at least one image.")
      return
    }

    // Build FormData for multipart upload (JSON cannot carry files)
    const formData = new FormData()
    formData.append("title", data.title)
    formData.append("description", data.description)
    formData.append("location", data.location)
    formData.append("price", String(data.price))
    formData.append("capacity", String(data.capacity))
    // Amenities travels as a single JSON string -- the backend's parseAmenities
    // helper accepts JSON, CSV or arrays, but a JSON string is the safest
    // shape for multipart forms (Express + Multer don't auto-parse repeated
    // fields into arrays like URL-encoded bodies do).
    formData.append("amenities", JSON.stringify(data.amenities ?? []))
    files.forEach((file) => formData.append("images", file))

    createRoom(formData, {
      onSuccess: () => navigate("/owner/rooms"),
    })
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Add New Room</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          {/* Title */}
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Room Title</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Cosy 2BR apartment in central London"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Description */}
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
                  placeholder="Describe the room, its features, and what makes it special..."
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Location */}
          <Controller
            name="location"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="e.g. London, Manchester"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Price + Capacity side by side */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="price"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Price per Night (Rs)
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={1}
                    step="0.01"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Per-night rate shown to guests.
                  </FieldDescription>
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
                  <FieldDescription>
                    Maximum number of guests allowed.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* Amenities -- multi-checkbox */}
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
                              )
                          field.onChange(next)
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

          {/* Images -- managed outside the schema because Zod cannot validate files */}
          <Field>
            <FieldLabel htmlFor="images">Room Photos (1-5)</FieldLabel>
            <Input
              id="images"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => onSelect(e.target.files)}
            />
            <FieldDescription>
              Upload up to 5 images. JPG, PNG or WebP -- 5 MB max per file.
            </FieldDescription>

            {previews.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
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
            )}
          </Field>
        </FieldGroup>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Creating Room..." : "Create Room"}
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
    </div>
  )
}

export default AddRoom
