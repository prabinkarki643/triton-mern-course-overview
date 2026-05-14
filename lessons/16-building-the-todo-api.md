# Lesson 16: Building the Todo API

## What You Will Learn
- Structuring an Express app properly (routes, controllers, validators) with TypeScript
- Complete CRUD endpoints using Mongoose models
- **Request validation with `express-validator`** -- catch bad data before it hits the database
- Building reusable validator chains and validation middleware
- Error handling patterns and HTTP status codes
- Filtering, sorting, and searching with typed query parameters
- **Pagination** -- returning data in pages with `skip` + `limit` and a meta object
- API best practices with full type safety

---

## 16.1 Structuring the Backend

As your API grows, keeping everything in one file becomes messy. Let us organise it:

```
backend/src/
├── models/
│   └── Todo.ts                          # Mongoose schema and model
├── routes/
│   └── todoRoutes.ts                    # Route definitions
├── controllers/
│   └── todoController.ts                # Request handling logic
├── middleware/
│   └── validate-result.middleware.ts    # Validation result handler
├── validators/
│   └── todo.validator.ts                # express-validator chains for todos
├── types/
│   └── todo.ts                          # Shared interfaces and types
├── database.ts                           # MongoDB connection
└── index.ts                             # App entry point
```

**Separation of concerns:**
- **Routes** -- define URL paths and HTTP methods
- **Controllers** -- handle the request/response logic (clean, no validation noise)
- **Validators** -- declare validation rules per endpoint with `express-validator`
- **Middleware** -- shared logic that runs before controllers (auth, validation results, error handling)
- **Models** -- define the database structure with Mongoose schemas
- **Types** -- shared TypeScript interfaces

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
  page?: string;
  limit?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

These interfaces describe the shape of the data we expect from the client. They give us autocomplete and type checking — but they do **not** validate at runtime.

---

## 16.3 Request Validation with express-validator

We have two places where data validation can happen:

1. **Mongoose schema** -- catches bad data at the database layer
2. **express-validator** -- catches bad data at the route layer, *before* it reaches the controller

**Why validate at the route layer too?**
- Return clear, structured error messages (e.g. "title must be at least 3 characters")
- Stop bad requests early (don't waste a database call)
- Sanitise input (trim whitespace, escape HTML, normalise email)
- Keep controllers focused on business logic, not input checking

### Install express-validator

```bash
npm install express-validator
```

No `@types` package needed -- `express-validator` ships with its own TypeScript types.

### Step 1: Create the Validation Result Middleware

This middleware runs after the validation chain. If any rules failed, it returns a 400 response with the errors. Otherwise, it calls `next()` and the controller runs.

```ts
// backend/src/middleware/validate-result.middleware.ts
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export const validateResult = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.type === "field" ? err.path : "unknown",
        message: err.msg,
      })),
    });
    return;
  }

  next();
};
```

**Why a separate middleware?** Validation chains describe *what* to check. The result middleware decides *what to do* when something fails. Separating them keeps each piece reusable.

### Step 2: Create the Todo Validators

Each validator is an array of `express-validator` chains. We export one chain per endpoint:

```ts
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
```

**Key validators explained:**

| Validator | What it does |
|-----------|-------------|
| `body("field")` | Validate a field in `req.body` |
| `param("id")` | Validate a URL parameter like `:id` |
| `query("priority")` | Validate a query parameter like `?priority=high` |
| `.exists({ checkFalsy: true })` | Field must be present and not empty/0/false |
| `.bail()` | Stop checking this field if the previous rule failed |
| `.optional()` | Skip validation if the field is missing |
| `.trim()` | Sanitiser -- removes leading/trailing whitespace |
| `.isMongoId()` | Must be a valid MongoDB ObjectId (24 hex chars) |
| `.isIn([...])` | Must be one of the allowed values |
| `.isInt({ min, max })` | Must be an integer within the range |
| `.toInt()` | Sanitiser -- converts the string value to a number |
| `.withMessage("...")` | Custom error message if the previous rule fails |

> **Important:** Sanitisers like `.trim()` actually *modify* `req.body`. The trimmed value is what your controller receives.

---

## 16.4 The Controller

Controllers contain the actual logic for each endpoint. Because validation runs in the middleware *before* the controller, the controller code stays focused on business logic -- no manual `if (!title)` checks needed.

Every handler is typed with Express's `Request` and `Response` types, and uses Mongoose model methods:

```ts
// backend/src/controllers/todoController.ts
import { Request, Response } from "express";
import { Todo, ITodo } from "../models/Todo";
import { CreateTodoBody, UpdateTodoBody, TodoQueryParams } from "../types/todo";

// GET /api/todos
export const getAllTodos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { completed, priority, search, sort, page, limit } =
      req.query as TodoQueryParams;

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

    // Pagination -- defaults: page 1, 10 items per page
    const pageNum: number = page ? Number(page) : 1;
    const limitNum: number = limit ? Number(limit) : 10;
    const skip: number = (pageNum - 1) * limitNum;

    // Run the query and a count in parallel for performance
    const [todos, total] = await Promise.all([
      Todo.find(filter).sort(sortOption).skip(skip).limit(limitNum),
      Todo.countDocuments(filter),
    ]);

    const totalPages: number = Math.ceil(total / limitNum);

    res.json({
      data: todos,
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

    res.json({ data: todo });
  } catch (error: unknown) {
    console.error("getTodoById error:", error);
    res.status(500).json({ error: "Failed to fetch todo" });
  }
};

// POST /api/todos
// Validation is handled by createTodoValidator + validateResult middleware
export const createTodo = async (req: Request, res: Response): Promise<void> => {
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

    res.json({ data: todo });
  } catch (error: unknown) {
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

## 16.5 Pagination

When your database has hundreds or thousands of todos, returning them all in one response is wasteful — slow for the server, slow for the network, slow for the user. **Pagination** breaks the list into smaller chunks called *pages*.

### How Pagination Works

Pagination is built from two query parameters:

| Parameter | Meaning |
|-----------|---------|
| `page` | Which page of results to return (1, 2, 3, ...) |
| `limit` | How many items per page (e.g. 10) |

To get the right items from the database, we calculate `skip`:

```
skip = (page - 1) * limit
```

| page | limit | skip | items returned |
|------|-------|------|---------------|
| 1 | 10 | 0 | Items 1-10 |
| 2 | 10 | 10 | Items 11-20 |
| 3 | 10 | 20 | Items 21-30 |
| 5 | 20 | 80 | Items 81-100 |

### MongoDB skip and limit

Mongoose provides `.skip()` and `.limit()` directly on the query:

```ts
const todos = await Todo.find(filter)
  .sort({ createdAt: -1 })
  .skip(20)   // skip the first 20 documents
  .limit(10); // return at most 10 documents
```

> **Always combine `.skip()` with `.sort()`** -- without an explicit sort order, MongoDB does not guarantee consistent results across pages.

### Returning Pagination Metadata

The frontend needs more than just the items — it needs to know how many total items exist, how many pages there are, and whether there is a next/previous page. We send this in a `meta` object alongside the `data`:

```json
{
  "data": [/* ... 10 todos ... */],
  "meta": {
    "page": 2,
    "limit": 10,
    "total": 47,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

### Getting the Total Count

`Todo.countDocuments(filter)` returns the count of matching documents. We use `Promise.all` to run the query and the count **in parallel** (saves one round trip):

```ts
const [todos, total] = await Promise.all([
  Todo.find(filter).sort(sortOption).skip(skip).limit(limitNum),
  Todo.countDocuments(filter),
]);

const totalPages = Math.ceil(total / limitNum);
```

> **Important:** Pass the same `filter` to `countDocuments` -- otherwise you'll get the total of *all* todos instead of just the ones matching your filters.

### Example Requests

```http
### First page (default limit of 10)
GET http://localhost:3001/api/todos?page=1

### Second page, 5 items per page
GET http://localhost:3001/api/todos?page=2&limit=5

### Combine pagination with filters
GET http://localhost:3001/api/todos?completed=false&priority=high&page=1&limit=20
```

### Why Validate page and limit?

We validate `page` and `limit` for two reasons:

1. **Safety** -- prevent `limit=1000000` from crashing the server
2. **Type conversion** -- query params arrive as strings; `.toInt()` converts them to numbers

This is why our validator includes `.isInt({ min: 1, max: 100 })` on `limit` and `.toInt()` to convert the value.

---

## 16.6 Clean Routes File with Validators

Now the routes file wires everything together: **validator → validateResult → controller**. Each request passes through validation before reaching the controller.

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
import { validateResult } from "../middleware/validate-result.middleware";
import {
  createTodoValidator,
  updateTodoValidator,
  todoIdValidator,
  listTodosValidator,
} from "../validators/todo.validator";

const router = Router();

router.get("/", listTodosValidator, validateResult, getAllTodos);
router.get("/:id", todoIdValidator, validateResult, getTodoById);
router.post("/", createTodoValidator, validateResult, createTodo);
router.put("/:id", updateTodoValidator, validateResult, updateTodo);
router.delete("/:id", todoIdValidator, validateResult, deleteTodo);

export default router;
```

**How the middleware chain works:**

```
Request → [validator chain] → [validateResult] → [controller]
                                      ↓
                              If validation failed:
                              respond 400 and stop
```

If validation passes, `next()` is called and the request flows to the controller. If anything fails, the client gets a clean 400 response with details — and the controller never runs.

### Example Validation Error Response

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "title", "message": "Title must be between 3 and 100 characters" },
    { "field": "priority", "message": "Priority must be low, medium, or high" }
  ]
}
```

The frontend can read this structure and show errors next to the relevant fields.

---

## 16.7 HTTP Status Codes Reference

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET or PUT |
| 201 | Created | Successful POST (new resource created) |
| 204 | No Content | Successful DELETE (nothing to return) |
| 400 | Bad Request | Invalid data from client (validation error) |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Something broke on the server |

---

## 16.8 Global Error Handler

Each controller already uses **try/catch** to handle errors from Mongoose calls (see section 16.4). That covers expected database errors -- but what about unexpected errors that slip through?

Add a **global error handler** in `index.ts` to catch anything that gets thrown without being caught:

```ts
import { Request, Response, NextFunction } from "express";

// After all routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);

  // Handle Mongoose validation errors (just in case schema validation fails)
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

**The pattern in this project:**
- **express-validator** catches bad input (400) before the controller runs
- **try/catch** in each controller catches database errors and returns appropriate responses
- **Global error handler** is the safety net for anything else

Some projects use a helper called `asyncHandler` to avoid writing try/catch in every controller. It is a valid pattern -- but for learning, **explicit try/catch is clearer**. You can see exactly where errors are caught and what happens next.

---

## 16.9 API Endpoint Summary

| Method | URL | Body | Response | Description |
|--------|-----|------|----------|-------------|
| GET | `/api/todos` | -- | `{ data: [...], meta: {...} }` | List todos (paginated) |
| GET | `/api/todos?page=2&limit=5` | -- | `{ data: [...], meta: {...} }` | Specific page |
| GET | `/api/todos?completed=true` | -- | `{ data: [...], meta: {...} }` | Filter by completion |
| GET | `/api/todos?priority=high` | -- | `{ data: [...], meta: {...} }` | Filter by priority |
| GET | `/api/todos?search=learn` | -- | `{ data: [...], meta: {...} }` | Search by title |
| GET | `/api/todos/:id` | -- | `{ data: {...} }` | Get one todo |
| POST | `/api/todos` | `{title, priority}` | `{...}` | Create a todo |
| PUT | `/api/todos/:id` | `{title?, priority?, completed?}` | `{...}` | Update a todo |
| DELETE | `/api/todos/:id` | -- | (empty) | Delete a todo |

---

## 16.10 Testing the Complete API

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

### Pagination -- first page, 5 per page
GET http://localhost:3001/api/todos?page=1&limit=5

### Pagination -- second page
GET http://localhost:3001/api/todos?page=2&limit=5

### Combine pagination with filters
GET http://localhost:3001/api/todos?completed=false&page=1&limit=10

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

### Test validation -- title too short (400 with structured details)
POST http://localhost:3001/api/todos
Content-Type: application/json

{
  "title": "Hi"
}

### Test validation -- invalid priority (400)
POST http://localhost:3001/api/todos
Content-Type: application/json

{
  "title": "Valid title",
  "priority": "urgent"
}

### Test validation -- invalid MongoId in URL (400)
GET http://localhost:3001/api/todos/not-a-real-id

### Test not found (should return 404 -- valid format, no match)
GET http://localhost:3001/api/todos/6614a3f2b5e4c8a1d2e3f999
```

**Note:** MongoDB uses ObjectId strings (24-character hex) instead of integer IDs. You will need to copy actual IDs from the create responses when testing.

---

## Practice Exercises

### Exercise 1: Build the Structured API
1. Refactor the code from Lesson 15 into separate files (controller, routes, types, validators)
2. Add the `TodoQueryParams`, `CreateTodoBody`, and `UpdateTodoBody` interfaces
3. Install `express-validator` and build the validator chains
4. Create the `validateResult` middleware
5. Wire validators into your routes (`validator → validateResult → controller`)
6. Test all endpoints work correctly
7. Verify validation failures return 400 with structured details, and not-found returns 404

### Exercise 2: Add Filtering and Pagination
Implement the query parameter features:
- `?completed=true` or `?completed=false`
- `?priority=high`
- `?search=keyword` (using MongoDB's `$regex`)
- `?sort=title` or `?sort=priority`
- `?page=2&limit=5` (pagination)
- Test each filter combination
- Verify the `meta` object returns correct `total`, `totalPages`, `hasNextPage`, `hasPrevPage`

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
1. **Separate routes, validators, and controllers** -- each file has one job
2. **`express-validator`** catches bad data *before* the controller runs
3. **Validator chains** declare rules per endpoint -- one array per route
4. **`validateResult` middleware** turns validation failures into clean 400 responses
5. **`.bail()`** stops a chain early when a critical rule fails; **`.trim()`** and **`.toInt()`** sanitise input
6. **Type your request bodies and query params** with interfaces (`CreateTodoBody`, `UpdateTodoBody`, `TodoQueryParams`)
7. **Mongoose schema validation** is a second safety net at the database layer
8. Use proper **HTTP status codes** (201 for create, 400 for validation, 404 for not found)
9. **`Todo.findByIdAndUpdate()`** with `{ new: true }` replaces the find-then-save pattern
10. **`Todo.findByIdAndDelete()`** returns the deleted document so you can check if it existed
11. **Search uses `$regex`** -- MongoDB's built-in pattern matching for text search
12. **Pagination** uses `.skip((page-1)*limit).limit(limit)` -- always combined with `.sort()`
13. **`Promise.all`** lets you run `find()` and `countDocuments()` in parallel for fewer round trips
14. Return a **`meta` object** alongside `data` with `page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPrevPage`
15. Always return **structured error messages** so the frontend can display field-level errors
