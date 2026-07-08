// src/controllers/roomController.ts
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Room, { IRoom } from "../models/Room";
import { paths } from "../config/paths";

// Amenities can arrive as a JSON string (from multipart forms) or a
// comma-separated list. Normalise both into a plain string[].
function parseAmenities(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((v): v is string => typeof v === "string");
  }
  if (typeof input !== "string" || input.trim() === "") return [];

  const trimmed: string = input.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string");
      }
    } catch {
      // fall through to CSV parse
    }
  }
  return trimmed
    .split(",")
    .map((a: string) => a.trim())
    .filter(Boolean);
}

// POST /api/rooms -- create a room with initial images (owner only)
export const createRoom = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const { title, description, location, price, capacity, amenities } =
      req.body;

    const room: IRoom = await Room.create({
      title,
      description,
      location,
      price, // already coerced by validator
      capacity, // already coerced by validator
      amenities: parseAmenities(amenities),
      images: files.map((file) => file.filename),
      owner: req.user!.userId,
    });

    res.status(201).json({ data: room });
  } catch (error: unknown) {
    console.error("createRoom error:", error);
    res.status(500).json({ message: "Failed to create room" });
  }
};

// GET /api/rooms -- paginated, filterable, searchable list
export const getRooms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { location, minPrice, maxPrice, capacity, search, sort, page, limit } =
      req.query as {
        location?: string;
        minPrice?: number;
        maxPrice?: number;
        capacity?: number;
        search?: string;
        sort?: "price_asc" | "price_desc" | "newest" | "oldest";
        page?: number;
        limit?: number;
      };

    const filter: Record<string, unknown> = {};

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceRange: Record<string, number> = {};
      if (minPrice !== undefined) priceRange.$gte = minPrice;
      if (maxPrice !== undefined) priceRange.$lte = maxPrice;
      filter.price = priceRange;
    }
    if (capacity !== undefined) {
      filter.capacity = { $gte: capacity };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Sort
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };
    else if (sort === "oldest") sortOption = { createdAt: 1 };

    // Pagination -- coerce to number in case a downstream serialiser
    // stringified them; express-validator's .toInt() may return
    // untyped strings on the type-erased req.query object.
    const pageNum: number = Number(page) || 1;
    const limitNum: number = Number(limit) || 10;
    const skip: number = (pageNum - 1) * limitNum;

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate("owner", "name email")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Room.countDocuments(filter),
    ]);

    const totalPages: number = Math.ceil(total / limitNum);

    res.json({
      data: rooms,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error: unknown) {
    console.error("getRooms error:", error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

// GET /api/rooms/my-rooms -- current owner's rooms (paginated + filterable)
// Requires requireAuth so req.user is set.
export const getMyRooms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search, status, sort, page, limit } = req.query as {
      search?: string;
      status?: "active" | "inactive";
      sort?: string;
      page?: number;
      limit?: number;
    };

    // Owner filter -- always applied from JWT so no one else's rooms leak in
    const filter: Record<string, unknown> = {
      owner: req.user!.userId,
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (status === "active") filter.isAvailable = true;
    else if (status === "inactive") filter.isAvailable = false;

    // Sort
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };
    else if (sort === "oldest") sortOption = { createdAt: 1 };

    // Pagination
    const pageNum: number = Number(page) || 1;
    const limitNum: number = Number(limit) || 10;
    const skip: number = (pageNum - 1) * limitNum;

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate("owner", "name email")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Room.countDocuments(filter),
    ]);

    const totalPages: number = Math.ceil(total / limitNum);

    res.json({
      data: rooms,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error: unknown) {
    console.error("getMyRooms error:", error);
    res.status(500).json({ message: "Failed to fetch your rooms" });
  }
};

// GET /api/rooms/:id -- single room with owner populated
export const getRoomById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const room: IRoom | null = await Room.findById(req.params.id).populate(
      "owner",
      "name email"
    );

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    res.json({ data: room });
  } catch (error: unknown) {
    console.error("getRoomById error:", error);
    res.status(500).json({ message: "Failed to fetch room" });
  }
};

// PUT /api/rooms/:id -- update text fields only (JSON body, owner only)
export const updateRoom = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const room: IRoom | null = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.owner.toString() !== req.user!.userId) {
      res.status(403).json({ message: "You can only edit your own rooms" });
      return;
    }

    const { title, description, location, price, capacity, amenities } =
      req.body;

    if (title !== undefined) room.title = title;
    if (description !== undefined) room.description = description;
    if (location !== undefined) room.location = location;
    if (price !== undefined) room.price = price;
    if (capacity !== undefined) room.capacity = capacity;
    if (amenities !== undefined) room.amenities = parseAmenities(amenities);

    const updated: IRoom = await room.save();
    res.json({ data: updated });
  } catch (error: unknown) {
    console.error("updateRoom error:", error);
    res.status(500).json({ message: "Failed to update room" });
  }
};

// POST /api/rooms/:id/images -- append new images (owner only)
export const addRoomImages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const room: IRoom | null = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.owner.toString() !== req.user!.userId) {
      res.status(403).json({ message: "You can only edit your own rooms" });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length === 0) {
      res.status(400).json({ message: "No images provided" });
      return;
    }

    const newFilenames: string[] = files.map((file) => file.filename);
    room.images = [...room.images, ...newFilenames];

    const updated: IRoom = await room.save();
    res.status(200).json({ data: updated });
  } catch (error: unknown) {
    console.error("addRoomImages error:", error);
    res.status(500).json({ message: "Failed to add images" });
  }
};

// DELETE /api/rooms/:id/images/:imageName -- remove one image (owner only)
export const deleteRoomImage = async (
  req: Request<{ id: string; imageName: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id, imageName } = req.params;

    const room: IRoom | null = await Room.findById(id);

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.owner.toString() !== req.user!.userId) {
      res.status(403).json({ message: "You can only edit your own rooms" });
      return;
    }

    // Guard: only delete files we actually track for this room
    if (!room.images.includes(imageName)) {
      res.status(404).json({ message: "Image not found on this room" });
      return;
    }

    const imagePath: string = path.join(paths.roomImages, imageName);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    room.images = room.images.filter((name: string) => name !== imageName);
    await room.save();

    res.status(204).send();
  } catch (error: unknown) {
    console.error("deleteRoomImage error:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};

// DELETE /api/rooms/:id -- delete room + all image files (owner only)
export const deleteRoom = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const room: IRoom | null = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.owner.toString() !== req.user!.userId) {
      res.status(403).json({ message: "You can only delete your own rooms" });
      return;
    }

    // Wipe all image files for this room from disk
    for (const image of room.images) {
      const imagePath: string = path.join(paths.roomImages, image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Room.findByIdAndDelete(req.params.id);

    res.status(204).send();
  } catch (error: unknown) {
    console.error("deleteRoom error:", error);
    res.status(500).json({ message: "Failed to delete room" });
  }
};
