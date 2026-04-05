# Lesson 23: Owner Portal Frontend

## What You Will Learn
- Building an owner layout with sidebar navigation using shadcn components
- Listing the owner's rooms with React Query (`useQuery`)
- Creating a room with React Hook Form, Zod validation, and image uploads
- Building `FormData` for multipart file uploads with Axios
- Previewing selected images before uploading
- Editing and deleting rooms with `useMutation` and `invalidateQueries`
- Displaying uploaded images from the backend

---

## 23.1 The Big Picture

The owner portal is a protected area where room owners manage their listings. It has three main pages:

```
Owner Portal Layout
├── Sidebar Navigation
│   ├── My Rooms        (list all rooms belonging to this owner)
│   ├── Add Room        (create a new room with images)
│   └── Booking Requests (incoming bookings -- covered in Lesson 25)
│
├── My Rooms Page
│   ├── Room cards with images, price, status
│   ├── Edit button → Edit Room page
│   └── Delete button → Confirmation dialog
│
├── Add Room Page
│   ├── Text fields (title, description, location, price, capacity)
│   ├── Amenities checkboxes
│   ├── Image upload with previews
│   └── Submit → POST /api/rooms (multipart)
│
└── Edit Room Page
    ├── Pre-filled form with existing data
    ├── Current images displayed
    ├── Option to upload replacement images
    └── Submit → PUT /api/rooms/:id (multipart)
```

---

## 23.2 Installing Dependencies

We need React Query (TanStack Query) for server state management and Axios for HTTP requests:

```bash
cd webapp
npm install @tanstack/react-query axios
```

---

## 23.3 Setting Up Axios and React Query

### API Client

```typescript
// webapp/src/services/api.ts
import axios, { AxiosInstance } from "axios";

const API_URL: string = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001/api";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token: string | null = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export { API_URL };
```

### React Query Provider

Wrap your app with the QueryClientProvider so all components can use React Query:

```tsx
// webapp/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      retry: 1, // Retry failed requests once
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## 23.4 Room Types

Define TypeScript interfaces for rooms:

```typescript
// webapp/src/types/room.ts
export interface Room {
  _id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  capacity: number;
  amenities: string[];
  images: string[];
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RoomFormData {
  title: string;
  description: string;
  location: string;
  price: number;
  capacity: number;
  amenities: string[];
}

export interface RoomsResponse {
  success: boolean;
  data: Room[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface RoomResponse {
  success: boolean;
  data: Room;
}
```

---

## 23.5 Owner Layout with Sidebar

The owner portal uses a sidebar layout. We build this as a wrapper component:

```tsx
// webapp/src/components/owner/OwnerLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { Home, PlusCircle, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: "/owner/rooms", label: "My Rooms", icon: <Home className="h-4 w-4" /> },
  { to: "/owner/rooms/new", label: "Add Room", icon: <PlusCircle className="h-4 w-4" /> },
  { to: "/owner/bookings", label: "Booking Requests", icon: <CalendarCheck className="h-4 w-4" /> },
];

function OwnerLayout(): JSX.Element {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 p-4">
        <h2 className="mb-6 text-lg font-semibold">Owner Portal</h2>
        <nav className="space-y-1">
          {navItems.map((item: NavItem) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colours",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default OwnerLayout;
```

**How it works:**
- `NavLink` from React Router highlights the active page automatically
- `Outlet` renders whichever child route is currently active
- The sidebar stays visible on all owner pages

### Adding Owner Routes

```tsx
// webapp/src/App.tsx (relevant route section)
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OwnerLayout from "./components/owner/OwnerLayout";
import MyRooms from "./pages/owner/MyRooms";
import AddRoom from "./pages/owner/AddRoom";
import EditRoom from "./pages/owner/EditRoom";
import OwnerBookings from "./pages/owner/OwnerBookings";

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... public routes ... */}

        {/* Owner portal routes */}
        <Route path="/owner" element={<OwnerLayout />}>
          <Route path="rooms" element={<MyRooms />} />
          <Route path="rooms/new" element={<AddRoom />} />
          <Route path="rooms/:id/edit" element={<EditRoom />} />
          <Route path="bookings" element={<OwnerBookings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 23.6 My Rooms Page

This page lists all rooms belonging to the currently logged-in owner:

```tsx
// webapp/src/pages/owner/MyRooms.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import api, { API_URL } from "@/services/api";
import { Room, RoomsResponse } from "@/types/room";
import DeleteRoomDialog from "@/components/owner/DeleteRoomDialog";

function MyRooms(): JSX.Element {
  const { data, isLoading, error } = useQuery<RoomsResponse>({
    queryKey: ["ownerRooms"],
    queryFn: async (): Promise<RoomsResponse> => {
      const response = await api.get<RoomsResponse>("/rooms/my-rooms");
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-centre text-muted-foreground py-8">Loading your rooms...</div>;
  }

  if (error) {
    return (
      <div className="text-centre text-destructive py-8">
        Failed to load rooms. Please try again.
      </div>
    );
  }

  const rooms: Room[] = data?.data || [];

  return (
    <div>
      <div className="flex items-centre justify-between mb-6">
        <h1 className="text-2xl font-bold">My Rooms</h1>
        <Button asChild>
          <Link to="/owner/rooms/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Link>
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-centre py-12 text-muted-foreground">
          <p className="text-lg mb-2">You have not added any rooms yet.</p>
          <Button asChild variant="outline">
            <Link to="/owner/rooms/new">Add your first room</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room: Room) => (
            <Card key={room._id}>
              {/* Room image */}
              {room.images.length > 0 && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={`${API_URL.replace("/api", "")}/uploads/rooms/${room.images[0]}`}
                    alt={room.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-lg">{room.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{room.location}</p>
              </CardHeader>

              <CardContent>
                <div className="flex items-centre justify-between">
                  <span className="text-lg font-semibold">
                    &pound;{room.price}<span className="text-sm font-normal">/night</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Up to {room.capacity} guests
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/owner/rooms/${room._id}/edit`}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Link>
                </Button>
                <DeleteRoomDialog roomId={room._id} roomTitle={room.title} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyRooms;
```

**Key points:**
- `useQuery` fetches data and provides `isLoading` and `error` states automatically
- `queryKey: ["ownerRooms"]` uniquely identifies this query for caching and invalidation
- Images are displayed by constructing the full URL: `${API_URL}/uploads/rooms/filename.jpg`

---

## 23.7 Delete Room Dialog

We use shadcn's `AlertDialog` to confirm before deleting:

```tsx
// webapp/src/components/owner/DeleteRoomDialog.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import api from "@/services/api";

interface DeleteRoomDialogProps {
  roomId: string;
  roomTitle: string;
}

function DeleteRoomDialog({ roomId, roomTitle }: DeleteRoomDialogProps): JSX.Element {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.delete(`/rooms/${roomId}`);
    },
    onSuccess: () => {
      // Refresh the rooms list after deletion
      queryClient.invalidateQueries({ queryKey: ["ownerRooms"] });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Room</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{roomTitle}&rdquo;? This action cannot be undone.
            All images and booking history for this room will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Room"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteRoomDialog;
```

### The `useMutation` + `invalidateQueries` Pattern

This is one of the most important patterns in React Query:

1. **`useMutation`** handles the DELETE request
2. **`onSuccess`** runs after the request succeeds
3. **`invalidateQueries({ queryKey: ["ownerRooms"] })`** tells React Query that the `ownerRooms` data is now stale
4. React Query automatically **re-fetches** the rooms list
5. The UI updates to show the room has been removed

This pattern keeps your UI in sync with the server without manually updating local state.

---

## 23.8 Room Form Schema with Zod

Define validation rules for the room form:

```typescript
// webapp/src/schemas/roomSchema.ts
import { z } from "zod";

export const roomSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  location: z
    .string()
    .min(2, "Location is required"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(1, "Price must be at least 1")
    .max(10000, "Price cannot exceed 10,000"),
  capacity: z
    .number({ invalid_type_error: "Capacity must be a number" })
    .min(1, "Capacity must be at least 1")
    .max(50, "Capacity cannot exceed 50"),
  amenities: z
    .array(z.string())
    .default([]),
});

export type RoomFormValues = z.infer<typeof roomSchema>;
```

---

## 23.9 Add Room Page -- The Complete Form

This is the most complex form in the application. It combines text inputs, checkboxes, and file uploads:

```tsx
// webapp/src/pages/owner/AddRoom.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/services/api";
import { roomSchema, RoomFormValues } from "@/schemas/roomSchema";

const AMENITY_OPTIONS: string[] = [
  "WiFi",
  "Parking",
  "Air Conditioning",
  "Projector",
  "Whiteboard",
  "TV Screen",
  "Kitchen",
  "Accessible",
];

function AddRoom(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Image state (not part of the Zod schema -- files cannot be validated with Zod)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      price: 0,
      capacity: 1,
      amenities: [],
    },
  });

  const selectedAmenities: string[] = watch("amenities");

  // Handle amenity checkbox toggle
  const toggleAmenity = (amenity: string): void => {
    const current: string[] = selectedAmenities || [];
    const updated: string[] = current.includes(amenity)
      ? current.filter((a: string) => a !== amenity)
      : [...current, amenity];
    setValue("amenities", updated);
  };

  // Handle image selection with preview
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files: FileList | null = event.target.files;
    if (!files) return;

    const fileArray: File[] = Array.from(files);

    // Validate: maximum 5 images
    if (fileArray.length > 5) {
      alert("You can upload a maximum of 5 images.");
      return;
    }

    setSelectedFiles(fileArray);

    // Generate preview URLs
    const previews: string[] = fileArray.map((file: File) => URL.createObjectURL(file));

    // Revoke old preview URLs to prevent memory leaks
    imagePreviews.forEach((url: string) => URL.revokeObjectURL(url));

    setImagePreviews(previews);
  };

  // Submit mutation
  const createMutation = useMutation({
    mutationFn: async (data: RoomFormValues): Promise<void> => {
      // Build FormData for multipart upload
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("location", data.location);
      formData.append("price", String(data.price));
      formData.append("capacity", String(data.capacity));
      formData.append("amenities", JSON.stringify(data.amenities));

      // Append each image file
      selectedFiles.forEach((file: File) => {
        formData.append("images", file);
      });

      await api.post("/rooms", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownerRooms"] });
      navigate("/owner/rooms");
    },
  });

  const onSubmit = (data: RoomFormValues): void => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add New Room</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Room Title</Label>
          <Input id="title" placeholder="e.g., Spacious Meeting Room" {...register("title")} />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the room, its features, and what makes it special..."
            rows={4}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="e.g., London, Manchester" {...register("location")} />
          {errors.location && (
            <p className="text-sm text-destructive">{errors.location.message}</p>
          )}
        </div>

        {/* Price and Capacity side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price per Night (&pound;)</Label>
            <Input
              id="price"
              type="number"
              min={1}
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Maximum Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              max={50}
              {...register("capacity", { valueAsNumber: true })}
            />
            {errors.capacity && (
              <p className="text-sm text-destructive">{errors.capacity.message}</p>
            )}
          </div>
        </div>

        {/* Amenities Checkboxes */}
        <div className="space-y-2">
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-2">
            {AMENITY_OPTIONS.map((amenity: string) => (
              <div key={amenity} className="flex items-centre space-x-2">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={selectedAmenities?.includes(amenity) || false}
                  onCheckedChange={() => toggleAmenity(amenity)}
                />
                <Label htmlFor={`amenity-${amenity}`} className="text-sm font-normal">
                  {amenity}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label htmlFor="images">Room Images (max 5)</Label>
          <Input
            id="images"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            onChange={handleImageChange}
          />
          <p className="text-xs text-muted-foreground">
            Accepted formats: JPG, PNG, WebP. Maximum 5 MB per file.
          </p>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {imagePreviews.map((preview: string, index: number) => (
                <div key={index} className="aspect-video overflow-hidden rounded-md border">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error message */}
        {createMutation.isError && (
          <p className="text-sm text-destructive">
            Failed to create room. Please check your inputs and try again.
          </p>
        )}

        {/* Submit */}
        <Button type="submit" disabled={createMutation.isPending} className="w-full">
          {createMutation.isPending ? "Creating Room..." : "Create Room"}
        </Button>
      </form>
    </div>
  );
}

export default AddRoom;
```

### How Image Previews Work

When the user selects files, we create temporary URLs using `URL.createObjectURL()`. These URLs point to the files in the browser's memory -- they are not uploaded yet. This lets users see what they selected before submitting the form.

**Important:** Always call `URL.revokeObjectURL()` on old preview URLs to free up memory.

### How FormData Works

Regular JSON cannot carry files. `FormData` is a special browser API that constructs `multipart/form-data` -- the same encoding that HTML forms use when you include `enctype="multipart/form-data"`.

```typescript
const formData = new FormData();
formData.append("title", "My Room");        // Text field
formData.append("images", fileObject1);      // File field
formData.append("images", fileObject2);      // Another file, same field name
```

When Axios sends this with `"Content-Type": "multipart/form-data"`, Multer on the backend can parse both the text fields and the files.

---

## 23.10 Edit Room Page

The edit page is similar to the add page, but it pre-fills the form with existing room data and shows current images:

```tsx
// webapp/src/pages/owner/EditRoom.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import api, { API_URL } from "@/services/api";
import { RoomResponse } from "@/types/room";
import { roomSchema, RoomFormValues } from "@/schemas/roomSchema";

const AMENITY_OPTIONS: string[] = [
  "WiFi", "Parking", "Air Conditioning", "Projector",
  "Whiteboard", "TV Screen", "Kitchen", "Accessible",
];

function EditRoom(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // Fetch existing room data
  const { data: roomData, isLoading } = useQuery<RoomResponse>({
    queryKey: ["room", id],
    queryFn: async (): Promise<RoomResponse> => {
      const response = await api.get<RoomResponse>(`/rooms/${id}`);
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
  });

  const selectedAmenities: string[] = watch("amenities") || [];

  // Pre-fill form when data loads
  useEffect(() => {
    if (roomData?.data) {
      const room = roomData.data;
      reset({
        title: room.title,
        description: room.description,
        location: room.location,
        price: room.price,
        capacity: room.capacity,
        amenities: room.amenities,
      });
      setExistingImages(room.images);
    }
  }, [roomData, reset]);

  const toggleAmenity = (amenity: string): void => {
    const current: string[] = selectedAmenities || [];
    const updated: string[] = current.includes(amenity)
      ? current.filter((a: string) => a !== amenity)
      : [...current, amenity];
    setValue("amenities", updated);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files: FileList | null = event.target.files;
    if (!files) return;

    const fileArray: File[] = Array.from(files);
    if (fileArray.length > 5) {
      alert("You can upload a maximum of 5 images.");
      return;
    }

    setSelectedFiles(fileArray);
    imagePreviews.forEach((url: string) => URL.revokeObjectURL(url));
    setImagePreviews(fileArray.map((file: File) => URL.createObjectURL(file)));
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: RoomFormValues): Promise<void> => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("location", data.location);
      formData.append("price", String(data.price));
      formData.append("capacity", String(data.capacity));
      formData.append("amenities", JSON.stringify(data.amenities));

      // Only append images if new ones were selected
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file: File) => {
          formData.append("images", file);
        });
      }

      await api.put(`/rooms/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownerRooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", id] });
      navigate("/owner/rooms");
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground py-8">Loading room data...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Room</h1>

      <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
        {/* Same fields as AddRoom -- title, description, location, price, capacity, amenities */}
        <div className="space-y-2">
          <Label htmlFor="title">Room Title</Label>
          <Input id="title" {...register("title")} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={4} {...register("description")} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} />
          {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price per Night (&pound;)</Label>
            <Input id="price" type="number" {...register("price", { valueAsNumber: true })} />
            {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Maximum Capacity</Label>
            <Input id="capacity" type="number" {...register("capacity", { valueAsNumber: true })} />
            {errors.capacity && <p className="text-sm text-destructive">{errors.capacity.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-2">
            {AMENITY_OPTIONS.map((amenity: string) => (
              <div key={amenity} className="flex items-centre space-x-2">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={selectedAmenities.includes(amenity)}
                  onCheckedChange={() => toggleAmenity(amenity)}
                />
                <Label htmlFor={`amenity-${amenity}`} className="text-sm font-normal">
                  {amenity}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Current Images */}
        {existingImages.length > 0 && selectedFiles.length === 0 && (
          <div className="space-y-2">
            <Label>Current Images</Label>
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((image: string, index: number) => (
                <div key={index} className="aspect-video overflow-hidden rounded-md border">
                  <img
                    src={`${API_URL.replace("/api", "")}/uploads/rooms/${image}`}
                    alt={`Room image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Uploading new images will replace the existing ones.
            </p>
          </div>
        )}

        {/* Upload new images */}
        <div className="space-y-2">
          <Label htmlFor="images">Upload New Images (optional)</Label>
          <Input
            id="images"
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            onChange={handleImageChange}
          />
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {imagePreviews.map((preview: string, index: number) => (
                <div key={index} className="aspect-video overflow-hidden rounded-md border">
                  <img src={preview} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {updateMutation.isError && (
          <p className="text-sm text-destructive">Failed to update room. Please try again.</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/owner/rooms")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default EditRoom;
```

**Key differences from AddRoom:**
- We fetch existing room data with `useQuery` and pre-fill the form with `reset()`
- Current images are displayed so the owner can see what is already uploaded
- New images are optional -- if none are selected, the existing images remain
- On success, we invalidate both `ownerRooms` and the specific `room` query

---

## 23.11 Displaying Room Images

Throughout the portal, room images are displayed by constructing the URL from the filename stored in the database:

```typescript
// Pattern for constructing image URLs
const baseUrl: string = API_URL.replace("/api", "");
const imageUrl: string = `${baseUrl}/uploads/rooms/${room.images[0]}`;
```

If `API_URL` is `http://localhost:3001/api` and the filename is `1700000000000-kitchen.jpg`, the full URL becomes:
```
http://localhost:3001/uploads/rooms/1700000000000-kitchen.jpg
```

This works because we set up `express.static` in Lesson 22 to serve the `uploads` directory.

---

## 23.12 Complete File Summary

```
webapp/src/
├── components/
│   ├── owner/
│   │   ├── OwnerLayout.tsx        # Sidebar + Outlet wrapper
│   │   └── DeleteRoomDialog.tsx   # Confirmation dialog with useMutation
│   └── ui/                       # shadcn components
├── pages/
│   └── owner/
│       ├── MyRooms.tsx            # List owner's rooms with useQuery
│       ├── AddRoom.tsx            # Create room form with image upload
│       ├── EditRoom.tsx           # Edit room with pre-filled form
│       └── OwnerBookings.tsx      # Placeholder (Lesson 25)
├── schemas/
│   └── roomSchema.ts             # Zod validation for room form
├── services/
│   └── api.ts                    # Axios instance with JWT interceptor
├── types/
│   └── room.ts                   # Room interfaces
└── main.tsx                      # QueryClientProvider setup
```

---

## Practice Exercises

### Exercise 1: Complete Owner Portal
1. Set up Axios with JWT interceptor and React Query provider
2. Create the owner layout with sidebar navigation
3. Build the "My Rooms" page with room cards showing images and details
4. Build the "Add Room" page with all form fields, amenity checkboxes, and image upload with previews
5. Test creating a room and verify it appears in the "My Rooms" list

### Exercise 2: Edit and Delete
1. Build the "Edit Room" page that pre-fills with existing data
2. Test editing a room's title, price, and images
3. Add the delete confirmation dialog using shadcn AlertDialog
4. Verify that deleting a room removes it from the list immediately

### Exercise 3: Form Validation Feedback
Add toast notifications (shadcn `useToast`) for success and error states:
```tsx
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();

// In onSuccess:
toast({ title: "Room created successfully!" });

// In onError:
toast({ title: "Failed to create room", variant: "destructive" });
```

### Exercise 4: Image Management Improvement
Instead of replacing all images on edit, allow the owner to:
1. Remove individual existing images (click an "X" on each thumbnail)
2. Add new images alongside existing ones
3. Send the updated image list to the backend

Hint: Track removed images in state and send them as a JSON field:
```typescript
formData.append("removedImages", JSON.stringify(["old-file-1.jpg"]));
```

---

## Key Takeaways
1. **React Query's `useQuery`** fetches server data and provides `isLoading`, `error`, and `data` states automatically
2. **`useMutation`** handles create, update, and delete operations with `isPending` and `isError` states
3. **`invalidateQueries`** tells React Query to re-fetch data after a mutation, keeping the UI in sync with the server
4. **`FormData`** is required for multipart file uploads -- you cannot send files as JSON
5. **`URL.createObjectURL()`** creates temporary preview URLs for selected files before upload
6. **Image URLs** are constructed by combining the API base URL with the filename: `${baseUrl}/uploads/rooms/${filename}`
7. **React Hook Form's `reset()`** pre-fills forms with existing data when editing
8. **`valueAsNumber: true`** in `register()` ensures number inputs are parsed as numbers, not strings
9. **shadcn AlertDialog** provides a built-in confirmation pattern -- never delete without asking first
10. Always **revoke object URLs** with `URL.revokeObjectURL()` to prevent memory leaks
