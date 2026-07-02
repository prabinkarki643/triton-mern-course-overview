// src/validators/room.validator.ts
import { body, param, query } from "express-validator";

// Reusable: validates the :id route parameter
const roomIdParam = param("id")
  .isMongoId()
  .withMessage("Invalid room ID format");

// POST /api/rooms -- create a new room
export const createRoomValidator = [
  body("title")
    .exists({ checkFalsy: true })
    .withMessage("Title is required")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .exists({ checkFalsy: true })
    .withMessage("Description is required")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("location")
    .exists({ checkFalsy: true })
    .withMessage("Location is required")
    .bail()
    .isString()
    .trim(),

  body("price")
    .exists({ checkFalsy: true })
    .withMessage("Price is required")
    .bail()
    .isFloat({ min: 1 })
    .withMessage("Price must be at least 1")
    .toFloat(),

  body("capacity")
    .exists({ checkFalsy: true })
    .withMessage("Capacity is required")
    .bail()
    .isInt({ min: 1, max: 50 })
    .withMessage("Capacity must be between 1 and 50")
    .toInt(),

  body("amenities")
    .optional()
    .isString()
    .withMessage("Amenities must be a JSON string or comma-separated list"),
];

// PUT /api/rooms/:id -- update text fields (all fields optional)
export const updateRoomValidator = [
  roomIdParam,

  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("location")
    .optional()
    .isString()
    .trim(),

  body("price")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Price must be at least 1")
    .toFloat(),

  body("capacity")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Capacity must be between 1 and 50")
    .toInt(),

  body("amenities")
    .optional()
    .isArray()
    .withMessage("Amenities must be an array of strings"),
];

// GET /api/rooms/:id, DELETE /api/rooms/:id, POST /api/rooms/:id/images
export const roomIdValidator = [roomIdParam];

// DELETE /api/rooms/:id/images/:imageName -- validate ID + safe filename
export const roomImageDeleteValidator = [
  roomIdParam,
  param("imageName")
    .isString()
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage("Invalid image name format"),
];

// GET /api/rooms -- validate optional query parameters (filters + pagination)
export const listRoomsValidator = [
  query("location")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("location must be a string under 100 characters"),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minPrice must be a non-negative number")
    .toFloat(),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxPrice must be a non-negative number")
    .toFloat(),

  query("capacity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("capacity must be a positive integer")
    .toInt(),

  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("search must be a string under 100 characters"),

  query("sort")
    .optional()
    .isIn(["price_asc", "price_desc", "newest", "oldest"])
    .withMessage("sort must be price_asc, price_desc, newest, or oldest"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100")
    .toInt(),
];
