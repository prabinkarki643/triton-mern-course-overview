// backend/src/routes/todoRoutes.ts
import { Router } from "express";
import {
  createTodo,
  deleteTodo,
  getAllTodos,
  getTodoById,
  updateTodo,
} from "../controllers/todoController";
import {
  createTodoValidator,
  listTodosValidator,
  todoIdValidator,
  updateTodoValidator,
} from "../validators/todo.validator";
import { validateResult } from "../middleware/validate-result.middleware";

const todoRoutes = Router();

// GET all todos
todoRoutes.get("/", listTodosValidator, validateResult, getAllTodos);

// GET single todo
todoRoutes.get("/:id", todoIdValidator, validateResult, getTodoById);

// POST create todo
todoRoutes.post("/", createTodoValidator, validateResult, createTodo);

// PUT update todo
todoRoutes.put("/:id", updateTodoValidator, validateResult, updateTodo);

// DELETE todo
todoRoutes.delete("/:id", todoIdValidator, validateResult, deleteTodo);

export default todoRoutes;
