// backend/src/index.ts
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { CreateTodoBody, Todo, UpdateTodoBody } from "./types/todo";

const validPriorities: Todo["priority"][] = ["low", "medium", "high"];

const app = express();

const PORT = 4000;

// Middleware
app.use(cors()); // Allow requests from React app
app.use(express.json()); // Parse JSON request bodies

// Custom middleware - logs every request
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next(); // Pass to the next middleware/route
});

// In-memory storage (replaced by database later)
let todos: Todo[] = [
  { id: 1, title: "Learn HTML", priority: "high", completed: true },
  { id: 2, title: "Learn CSS", priority: "high", completed: true },
  { id: 3, title: "Learn JavaScript", priority: "high", completed: false },
];
let nextId = 4;

// A simple route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Hello from the backend!",
  });
});

//TODO APIS
// GET all todos
app.get("/api/todos", (req: Request, res: Response) => {
  res.json({ data: todos });
});

// GET single todo
app.get("/api/todos/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const todo: Todo | undefined = todos.find((t) => t.id === id);
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }
  res.json({ data: todo });
});

// POST create todo
app.post("/api/todos", (req: Request, res: Response) => {
  const { title, priority } = req.body as CreateTodoBody;

  // Basic validation
  if (!title || title.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Title must be at least 3 characters" });
  }
  const todoPriority =
    priority && validPriorities.includes(priority) ? priority : "medium";

  const newTodo: Todo = {
    id: nextId++,
    title: title.trim(),
    priority: todoPriority,
    completed: false,
  };

  todos.push(newTodo);
  res.status(201).json({ data: newTodo });
});

// PUT update todo
app.put("/api/todos/:id", (req: Request, res: Response) => {
  const todo: Todo | undefined = todos.find(
    (t) => t.id === parseInt(req.params.id as string),
  );
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }

  const { title, priority, completed } = req.body as UpdateTodoBody;

  if (title) {
    todo.title = title.trim();
  }
  if (priority) {
    todo.priority = priority;
  }
  if (completed !== undefined) {
    todo.completed = completed;
  }

  res.json({ data: todo });
});

// DELETE todo [1,2,3]
app.delete("/api/todos/:id", (req: Request, res: Response) => {
  const index: number = todos.findIndex(
    (t) => t.id === parseInt(req.params.id as string),
  );
  if (index === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }
  const tobeDeletedTodo = todos[index];

  todos.splice(index, 1);
  res.json({ data: tobeDeletedTodo, message: "Todo deleted" });
});

// Error handling middleware (must have 4 parameters)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: err.message || "Something went wrong!", stack: err.stack });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
