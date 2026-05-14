// backend/src/controllers/todoController.ts
import { Request, Response } from "express";
import { Todo, ITodo } from "../models/Todo";
import { CreateTodoBody, UpdateTodoBody, TodoQueryParams } from "../types/todo";

// GET /api/todos
export const getAllTodos = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { completed, priority, search, sort } = req.query as TodoQueryParams;

    // Build filter object
    const filter: Record<string, unknown> = {};
    if (completed !== undefined) {
      filter.completed = completed === "true";
    }
    if (priority) {
      filter.priority = priority;
    }
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    // Determine sort order
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 }; // default: newest first
    if (sort === "title") {
      sortOption = { title: 1 };
    } else if (sort === "priority") {
      sortOption = { priority: 1 };
    }

    const todos: ITodo[] = await Todo.find(filter).sort(sortOption);
    res.json({ data: todos });
  } catch (error: unknown) {
    console.error("getAllTodos error:", error);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
};

// GET /api/todos/:id
export const getTodoById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const todo: ITodo | null = await Todo.findById(req.params.id);
    if (!todo) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    res.json({ data: todo });
  } catch (error: unknown) {
    console.error("getTodoById error:", error);
    res.status(500).json({ error: "Failed to fetch todo" });
  }
};

// POST /api/todos
// Validation is handled by createTodoValidator + validateResult middleware
export const createTodo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { title, priority } = req.body as CreateTodoBody;

    const todo: ITodo = await Todo.create({
      title,
      priority: priority || "medium",
    });

    res.status(201).json({ data: todo });
  } catch (error: unknown) {
    console.error("createTodo error:", error);
    res.status(500).json({ error: "Failed to create todo" });
  }
};

// PUT /api/todos/:id
// Validation is handled by updateTodoValidator + validateResult middleware
export const updateTodo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { title, priority, completed } = req.body as UpdateTodoBody;

    // Build update object with only the fields that were provided
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (priority !== undefined) updates.priority = priority;
    if (completed !== undefined) updates.completed = completed;

    const todo: ITodo | null = await Todo.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    );

    if (!todo) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    res.json({ data: todo });
  } catch (error: unknown) {
    console.error("updateTodo error:", error);
    res.status(500).json({ error: "Failed to update todo" });
  }
};

// DELETE /api/todos/:id
export const deleteTodo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const todo: ITodo | null = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    res.status(204).send();
  } catch (error: unknown) {
    console.error("deleteTodo error:", error);
    res.status(500).json({ error: "Failed to delete todo" });
  }
};
