// backend/src/validators/todo.validator.ts
import { body, param, query } from "express-validator";

// Reusable: validates the :id route parameter is a valid MongoDB ObjectId
const todoIdParam = param("id")
  .isMongoId()
  .withMessage("Invalid todo ID format");

// POST /api/todos -- create a new todo
export const createTodoValidator = [
  body("title")
    .exists({ checkFalsy: true })
    .withMessage("Title is required")
    .bail()
    .isString()
    .withMessage("Title must be a string")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
];

// PUT /api/todos/:id -- update an existing todo (all fields optional)
export const updateTodoValidator = [
  todoIdParam,

  body("title")
    .optional()
    .isString()
    .withMessage("Title must be a string")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),

  body("completed")
    .optional()
    .isBoolean()
    .withMessage("Completed must be a boolean"),
];

// GET /api/todos/:id and DELETE /api/todos/:id -- just validate the ID
export const todoIdValidator = [todoIdParam];

// GET /api/todos -- validate optional query parameters
export const listTodosValidator = [
  query("completed")
    .optional()
    .isIn(["true", "false"])
    .withMessage("completed must be 'true' or 'false'"),

  query("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("priority must be low, medium, or high"),

  query("sort")
    .optional()
    .isIn(["title", "priority", "createdAt"])
    .withMessage("sort must be title, priority, or createdAt"),

  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("search must be a string under 100 characters"),
];