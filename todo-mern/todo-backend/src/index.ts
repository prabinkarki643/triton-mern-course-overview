// backend/src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import { Todo } from "./types/todo";

const app = express();

const PORT = 4000;

// Middleware
app.use(cors()); // Allow requests from React app
app.use(express.json()); // Parse JSON request bodies

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
  res.json({data:todos});
});

// GET single todo
app.get("/api/todos/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const todo: Todo | undefined = todos.find((t) => t.id === id);
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }
  res.json({data:todo});
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
