# Lesson 16: Building the Todo API

## What You Will Learn
- Structuring an Express app properly (routes, controllers) with TypeScript
- Complete CRUD endpoints using Mongoose models with typed validation
- Error handling patterns and HTTP status codes
- Filtering, sorting, and searching with typed query parameters
- API best practices with full type safety

---

## 16.1 Structuring the Backend

As your API grows, keeping everything in one file becomes messy. Let us organise it:

```
backend/src/
├── models/
│   └── Todo.ts             # Mongoose schema and model
├── routes/
│   └── todoRoutes.ts       # Route definitions
├── controllers/
│   └── todoController.ts   # Request handling logic
├── middleware/
│   └── asyncHandler.ts     # Async error handling middleware
├── types/
│   └── todo.ts             # Shared interfaces and types
├── database.ts              # MongoDB connection
└── index.ts                # App entry point
```

**Separation of concerns:**
- **Routes** -- define URL paths and HTTP methods
- **Controllers** -- handle the request/response logic
- **Models** -- define the database structure with Mongoose schemas
- **Types** -- shared TypeScript interfaces
- **Middleware** -- shared logic that runs before controllers

---

## 16.2 Shared Types

Before writing controllers, define the types that represent request data:

```ts
// backend/src/types/todo.ts

export interface CreateTodoBody {
  title: string;
  priority?: "low" | "medium" | "high";
}

export interface UpdateTodoBody {
  title?: string;
  priority?: "low" | "medium" | "high";
  completed?: boolean;
}

export interface TodoQueryParams {
  completed?: string;
  priority?: string;
  search?: string;
  sort?: string;
}
```

These interfaces describe the shape of the data we expect from the client. They do not enforce validation on their own (Mongoose handles that via the schema), but they give us autocomplete and type checking.

---

## 16.3 The Controller

Controllers contain the actual logic for each endpoint. Every handler is typed with Express's `Request` and `Response` types, and uses Mongoose model methods:

```ts
// backend/src/controllers/todoController.ts
import { Request, Response } from "express";
import { Todo, ITodo } from "../models/Todo";
import { CreateTodoBody, UpdateTodoBody, TodoQueryParams } from "../types/todo";

// GET /api/todos
export const getAllTodos = async (req: Request, res: Response): Promise<void> => {
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
    res.json(todos);
  } catch (error: unknown) {
    console.error("getAllTodos error:", error);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
};

// GET /api/todos/:id
export const getTodoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const todo: ITodo | null = await Todo.findById(req.params.id);
    if (!todo) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    res.json(todo);
  } catch (error: unknown) {
    console.error("getTodoById error:", error);
    res.status(500).json({ error: "Failed to fetch todo" });
  }
};

// POST /api/todos
export const createTodo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, priority } = req.body as CreateTodoBody;

    const todo: ITodo = await Todo.create({
      title,
      priority: priority || "medium",
    });

    res.status(201).json(todo);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ValidationError") {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error("createTodo error:", error);
    res.status(500).json({ error: "Failed to create todo" });
  }
};

// PUT /api/todos/:id
export const updateTodo = async (req: Request, res: Response): Promise<void> => {
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
      { new: true, runValidators: true }
    );

    if (!todo) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    res.json(todo);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ValidationError") {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error("updateTodo error:", error);
    res.status(500).json({ error: "Failed to update todo" });
  }
};

// DELETE /api/todos/:id
export const deleteTodo = async (req: Request, res: Response): Promise<void> => {
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
```

**Key Mongoose patterns used:**
- **Model methods built in** -- Mongoose models have query methods like `Todo.find()`, `Todo.create()`, etc.
- **String IDs** -- MongoDB uses string ObjectIds, so no `parseInt(req.params.id)` needed
- **Schema validation** -- the schema rules (required, minlength, enum) catch invalid data automatically
- **`findByIdAndUpdate`** -- one database call to find and update (returns the updated document with `{ new: true }`)
- **`findByIdAndDelete`** -- returns the deleted document, so we can check if it existed
- **`$regex` search** -- MongoDB has built-in regular expression matching for text search

---

## 16.4 Clean Routes File

Now the routes file is clean and readable:

```ts
// backend/src/routes/todoRoutes.ts
import { Router } from "express";
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} from "../controllers/todoController";

const router = Router();

router.get("/", getAllTodos);
router.get("/:id", getTodoById);
router.post("/", createTodo);
router.put("/:id", updateTodo);
router.delete("/:id", deleteTodo);

export default router;
```

---

## 16.5 HTTP Status Codes Reference

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET or PUT |
| 201 | Created | Successful POST (new resource created) |
| 204 | No Content | Successful DELETE (nothing to return) |
| 400 | Bad Request | Invalid data from client (validation error) |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Something broke on the server |

---

## 16.6 Error Handling Middleware

Instead of repeating try/catch everywhere, create a typed wrapper:

```ts
// backend/src/middleware/asyncHandler.ts
import { Request, Response, NextFunction } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

Use it in controllers:

```ts
import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { Todo, ITodo } from "../models/Todo";

export const getAllTodos = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // No try/catch needed -- errors are automatically caught
  const todos: ITodo[] = await Todo.find().sort({ createdAt: -1 });
  res.json(todos);
});
```

Add a global error handler in `index.ts`:

```ts
import { Request, Response, NextFunction } from "express";

// After all routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    res.status(400).json({ error: err.message });
    return;
  }

  // Handle invalid ObjectId errors
  if (err.name === "CastError") {
    res.status(400).json({ error: "Invalid ID format" });
    return;
  }

  res.status(500).json({
    error: "Internal server error",
  });
});
```

---

## 16.7 API Endpoint Summary

| Method | URL | Body | Response | Description |
|--------|-----|------|----------|-------------|
| GET | `/api/todos` | -- | `[{...}, {...}]` | List all todos |
| GET | `/api/todos?completed=true` | -- | `[{...}]` | Filter by completion |
| GET | `/api/todos?priority=high` | -- | `[{...}]` | Filter by priority |
| GET | `/api/todos?search=learn` | -- | `[{...}]` | Search by title |
| GET | `/api/todos/:id` | -- | `{...}` | Get one todo |
| POST | `/api/todos` | `{title, priority}` | `{...}` | Create a todo |
| PUT | `/api/todos/:id` | `{title?, priority?, completed?}` | `{...}` | Update a todo |
| DELETE | `/api/todos/:id` | -- | (empty) | Delete a todo |

---

## 16.8 Testing the Complete API

Create a test file to verify all endpoints:

```http
### Health check
GET http://localhost:3001/api/health

### Create todos
POST http://localhost:3001/api/todos
Content-Type: application/json

{
  "title": "Buy groceries",
  "priority": "high"
}

###
POST http://localhost:3001/api/todos
Content-Type: application/json

{
  "title": "Read a book",
  "priority": "low"
}

###
POST http://localhost:3001/api/todos
Content-Type: application/json

{
  "title": "Learn Mongoose",
  "priority": "medium"
}

### Get all todos
GET http://localhost:3001/api/todos

### Filter by priority
GET http://localhost:3001/api/todos?priority=high

### Filter by completion
GET http://localhost:3001/api/todos?completed=false

### Search
GET http://localhost:3001/api/todos?search=learn

### Get single todo (replace with a real ID from the create responses)
GET http://localhost:3001/api/todos/6614a3f2b5e4c8a1d2e3f456

### Update todo (mark complete -- replace ID)
PUT http://localhost:3001/api/todos/6614a3f2b5e4c8a1d2e3f456
Content-Type: application/json

{
  "completed": true
}

### Update todo (change title -- replace ID)
PUT http://localhost:3001/api/todos/6614a3f2b5e4c8a1d2e3f457
Content-Type: application/json

{
  "title": "Read two books",
  "priority": "medium"
}

### Delete todo (replace ID)
DELETE http://localhost:3001/api/todos/6614a3f2b5e4c8a1d2e3f458

### Test validation (should fail -- title too short)
POST http://localhost:3001/api/todos
Content-Type: application/json

{
  "title": "Hi"
}

### Test not found (should return 404)
GET http://localhost:3001/api/todos/6614a3f2b5e4c8a1d2e3f999
```

**Note:** MongoDB uses ObjectId strings (24-character hex) instead of integer IDs. You will need to copy actual IDs from the create responses when testing.

---

## Practice Exercises

### Exercise 1: Build the Structured API
1. Refactor the code from Lesson 15 into separate files (controller, routes, types)
2. Add the `TodoQueryParams`, `CreateTodoBody`, and `UpdateTodoBody` interfaces
3. Import and use the `Todo` model from `models/Todo.ts` in the controller
4. Test all endpoints work correctly
5. Verify error cases return proper status codes

### Exercise 2: Add Filtering
Implement the query parameter features:
- `?completed=true` or `?completed=false`
- `?priority=high`
- `?search=keyword` (using MongoDB's `$regex`)
- `?sort=title` or `?sort=priority`
- Test each filter combination

### Exercise 3: Bulk Operations
Add two new endpoints with proper typing:
- `DELETE /api/todos/completed` -- delete all completed todos using `Todo.deleteMany({ completed: true })`
- `PUT /api/todos/toggle-all` -- toggle all todos' completion status

Hint for toggle-all: you may need two operations -- find the current state, then update:
```ts
const todos: ITodo[] = await Todo.find();
const allCompleted: boolean = todos.every((t: ITodo) => t.completed);
await Todo.updateMany({}, { completed: !allCompleted });
```

---

## Key Takeaways
1. **Separate routes from controllers** -- routes define paths, controllers handle logic
2. **Type your request bodies** with interfaces (`CreateTodoBody`, `UpdateTodoBody`)
3. **Type your query parameters** with an interface (`TodoQueryParams`)
4. **Mongoose handles validation** -- schema rules catch invalid data before it reaches the database
5. Use proper **HTTP status codes** (201 for create, 404 for not found, etc.)
6. **`Todo.findByIdAndUpdate()`** with `{ new: true }` replaces the find-then-save pattern
7. **`Todo.findByIdAndDelete()`** returns the deleted document so you can check if it existed
8. **Search uses `$regex`** -- MongoDB's built-in pattern matching for text search
9. Always return **meaningful error messages** so the frontend can display them
10. Test every endpoint and edge case before connecting to the frontend
