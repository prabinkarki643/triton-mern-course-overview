// src/routes/roomRoutes.ts
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateResult } from "../middleware/validate";
import upload from "../middleware/upload";
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  addRoomImages,
  deleteRoomImage,
} from "../controllers/roomController";
import {
  createRoomValidator,
  updateRoomValidator,
  roomIdValidator,
  roomImageDeleteValidator,
  listRoomsValidator,
} from "../validators/room.validator";

const router: Router = Router();

// Public routes -- anyone can browse rooms
router.get("/", listRoomsValidator, validateResult, getRooms);
router.get("/:id", roomIdValidator, validateResult, getRoomById);

// Owner-only routes
router.post(
  "/",
  requireAuth,
  requireRole("owner"),
  upload.array("images", 5),
  createRoomValidator,
  validateResult,
  createRoom
);
router.put(
  "/:id",
  requireAuth,
  requireRole("owner"),
  updateRoomValidator,
  validateResult,
  updateRoom
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("owner"),
  roomIdValidator,
  validateResult,
  deleteRoom
);

// Image management -- separate, focused endpoints
router.post(
  "/:id/images",
  requireAuth,
  requireRole("owner"),
  upload.array("images", 5),
  roomIdValidator,
  validateResult,
  addRoomImages
);
router.delete(
  "/:id/images/:imageName",
  requireAuth,
  requireRole("owner"),
  roomImageDeleteValidator,
  validateResult,
  deleteRoomImage
);

export default router;
