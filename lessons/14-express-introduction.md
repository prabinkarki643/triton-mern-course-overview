# Lesson 14: Express.js Introduction

## What You Will Learn
- What Express.js is and what REST APIs are
- Setting up an Express project with TypeScript from scratch
- Creating routes for GET, POST, PUT, and DELETE
- Understanding middleware
- Typed request and response objects
- Testing your API

---

## 14.1 What is Express.js?

Express.js is a **web framework for Node.js** that makes it easy to build web servers and APIs.

Until now, our Todo app stores data in React state - when you refresh the page, everything is lost. To persist data, we need a **backend** - a server that stores and retrieves data from a database.

### What is a REST API?

A REST API is a way for applications to communicate. Your React app (the **client**) sends requests to your Express server (the **backend**), which responds with data.

```
React App (Frontend)  <-->  Express Server (Backend)  <-->  Database
    "Give me todos"   -->   Fetches from database     -->   Returns data
    <-- JSON response <--   Sends back to React       <--
```

### HTTP Methods (Verbs)

REST APIs use HTTP methods to indicate the action:

| Method | Purpose | Example |
|--------|---------|---------|
| GET | Read/fetch data | Get all todos |
| POST | Create new data | Add a new todo |
| PUT | Update existing data | Edit a todo |
| DELETE | Remove data | Delete a todo |

---

## 14.2 Setting Up an Express Project with TypeScript

Create a new folder for the backend:

```bash
mkdir backend
cd backend
npm init -y
```

Install Express and useful packages:

```bash
npm install express cors
npm install -D typescript ts-node @types/express @types/cors @types/node nodemon
```

- `express` - the web framework
- `cors` - allows the React app to talk to the server (Cross-Origin Resource Sharing)
- `typescript` - the TypeScript compiler
- `ts-node` - runs TypeScript files directly without a separate compile step
- `@types/express`, `@types/cors`, `@types/node` - TypeScript type definitions
- `nodemon` - auto-restarts the server when you change code (development tool)

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create a `nodemon.json` configuration file so nodemon watches TypeScript files:

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/index.ts"
}
```

Update `package.json` scripts:

```json
{
  "scripts": {
    "start": "ts-node src/index.ts",
    "dev": "nodemon",
    "build": "tsc",
    "serve": "node dist/index.js"
  }
}
```

---

## 14.3 Project Structure

```
backend/
├── src/
│   ├── types/
│   │   └── todo.ts
│   └── index.ts
├── tsconfig.json
├── nodemon.json
├── package.json
└── package-lock.json
```

---

## 14.4 Your First Express Server

```typescript
// backend/src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());               // Allow requests from React app
app.use(express.json());       // Parse JSON request bodies

// A simple route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Todo API!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Run it:

```bash
npm run dev
```

Open `http://localhost:3001` in your browser - you should see:

```json
{ "message": "Welcome to the Todo API!" }
```

---

## 14.5 Understanding Routes

A route is a combination of an **HTTP method** and a **URL path** that tells the server what to do.

```typescript
// Route structure:
// app.METHOD(PATH, HANDLER)

app.get('/api/todos', (req: Request, res: Response) => {
  // Handle GET request to /api/todos
});

app.post('/api/todos', (req: Request, res: Response) => {
  // Handle POST request to /api/todos
});

app.put('/api/todos/:id', (req: Request, res: Response) => {
  // Handle PUT request to /api/todos/123
});

app.delete('/api/todos/:id', (req: Request, res: Response) => {
  // Handle DELETE request to /api/todos/123
});
```

### Route Parameters

The `:id` part is a **route parameter** - a variable in the URL:

```typescript
app.get('/api/todos/:id', (req: Request, res: Response) => {
  const todoId = req.params.id; // "123" if URL is /api/todos/123
  res.json({ id: todoId });
});
```

---

## 14.6 Request and Response Objects

### The Request (`req`)

```typescript
app.post('/api/todos', (req: Request, res: Response) => {
  // req.body - the JSON data sent by the client
  const { title, priority } = req.body as { title: string; priority: string };
  console.log(title, priority);
  // "Learn Express", "high"

  // req.params - URL parameters
  // req.query - query string (?filter=active&sort=date)
  const filter = req.query.filter as string; // "active"
  console.log(filter);
});
```

### The Response (`res`)

```typescript
app.get('/api/todos', (req: Request, res: Response) => {
  // Send JSON response
  res.json({ data: [] });

  // Send with a specific status code
  res.status(201).json({ message: "Created!" });

  // Common status codes:
  // 200 - OK (default for res.json)
  // 201 - Created (after POST)
  // 400 - Bad Request (invalid data)
  // 404 - Not Found
  // 500 - Server Error
});
```

---

## 14.7 Building a Simple In-Memory Todo API

Before adding a database, let's build the API with an array in memory. First, define the Todo type:

```typescript
// backend/src/types/todo.ts
export interface Todo {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
}

export interface CreateTodoBody {
  title: string;
  priority?: Todo["priority"];
}

export interface UpdateTodoBody {
  title?: string;
  priority?: Todo["priority"];
  completed?: boolean;
}
```

Now build the full API:

```typescript
// backend/src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import type { Todo, CreateTodoBody, UpdateTodoBody } from './types/todo';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// In-memory storage (replaced by database later)
let todos: Todo[] = [
  { id: 1, title: "Learn HTML", priority: "high", completed: true },
  { id: 2, title: "Learn CSS", priority: "high", completed: true },
  { id: 3, title: "Learn JavaScript", priority: "high", completed: false },
];
let nextId = 4;

// GET all todos
app.get('/api/todos', (req: Request, res: Response) => {
  res.json(todos);
});

// GET single todo
app.get('/api/todos/:id', (req: Request, res: Response) => {
  const todo: Todo | undefined = todos.find(t => t.id === parseInt(req.params.id));
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }
  res.json(todo);
});

// POST create todo
app.post('/api/todos', (req: Request, res: Response) => {
  const { title, priority } = req.body as CreateTodoBody;

  // Basic validation
  if (!title || title.trim().length < 3) {
    return res.status(400).json({ error: "Title must be at least 3 characters" });
  }

  const validPriorities: Todo["priority"][] = ["low", "medium", "high"];
  const todoPriority: Todo["priority"] = priority && validPriorities.includes(priority)
    ? priority
    : "medium";

  const newTodo: Todo = {
    id: nextId++,
    title: title.trim(),
    priority: todoPriority,
    completed: false,
  };

  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// PUT update todo
app.put('/api/todos/:id', (req: Request, res: Response) => {
  const todo: Todo | undefined = todos.find(t => t.id === parseInt(req.params.id));
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }

  const { title, priority, completed } = req.body as UpdateTodoBody;

  if (title !== undefined) todo.title = title.trim();
  if (priority !== undefined) todo.priority = priority;
  if (completed !== undefined) todo.completed = completed;

  res.json(todo);
});

// DELETE todo
app.delete('/api/todos/:id', (req: Request, res: Response) => {
  const index: number = todos.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }

  todos.splice(index, 1);
  res.status(204).send(); // 204 = No Content (successful delete)
});

app.listen(PORT, () => {
  console.log(`Todo API running on http://localhost:${PORT}`);
});
```

---

## 14.8 Understanding Middleware

Middleware are functions that run **between** the request and your route handler. They can modify the request, response, or end the request early.

```typescript
import express, { Request, Response, NextFunction } from 'express';

// Built-in middleware
app.use(express.json());    // Parses JSON bodies
app.use(cors());            // Enables cross-origin requests

// Custom middleware - logs every request
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next(); // Pass to the next middleware/route
});

// Error handling middleware (must have 4 parameters)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});
```

**Middleware runs in order** - put them before your routes.

---

## 14.9 Testing Your API

### Using the Browser

For GET requests, just visit the URL:
- `http://localhost:3001/api/todos`

### Using curl (Terminal)

```bash
# GET all todos
curl http://localhost:3001/api/todos

# POST a new todo
curl -X POST http://localhost:3001/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Express", "priority": "high"}'

# PUT update a todo
curl -X PUT http://localhost:3001/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# DELETE a todo
curl -X DELETE http://localhost:3001/api/todos/1
```

### Using VS Code REST Client Extension

Create a file called `requests.http`:

```http
### Get all todos
GET http://localhost:3001/api/todos

### Create a todo
POST http://localhost:3001/api/todos
Content-Type: application/json

{
  "title": "Learn Express",
  "priority": "high"
}

### Update a todo
PUT http://localhost:3001/api/todos/1
Content-Type: application/json

{
  "completed": true
}

### Delete a todo
DELETE http://localhost:3001/api/todos/1
```

---

## Practice Exercises

### Exercise 1: Basic Server
Create an Express server with TypeScript that:
- Responds to GET `/` with a welcome message
- Has a GET `/api/health` route that returns `{ status: "ok" }`
- Logs every request to the console using typed middleware

### Exercise 2: In-Memory CRUD
Build the complete Todo API from section 14.7:
- Test each endpoint using curl or the REST Client extension
- Verify that POST creates todos with incrementing IDs
- Verify that PUT updates only the fields you send
- Verify that DELETE removes the todo
- Run `npx tsc --noEmit` to confirm there are no type errors

### Exercise 3: Validation
Add proper validation to the POST and PUT routes:
- Title is required and must be 3-100 characters
- Priority must be "low", "medium", or "high"
- Return appropriate error messages with 400 status codes
- Create a `ValidationError` interface for consistent error responses

---

## Key Takeaways
1. **Express.js** is a Node.js framework for building web servers and APIs
2. **TypeScript** adds type safety to request handlers, middleware, and data models
3. **REST APIs** use HTTP methods (GET, POST, PUT, DELETE) for CRUD operations
4. **Routes** map HTTP method + URL path to typed handler functions
5. **req.body** contains POST/PUT data (cast to your interface), **req.params** contains URL parameters
6. **res.json()** sends JSON responses, **res.status()** sets the HTTP status code
7. **Middleware** processes requests before they reach your routes, and must be typed with `NextFunction`
8. **CORS** must be enabled for the React frontend to communicate with the backend
9. **Shared interfaces** (`Todo`, `CreateTodoBody`, `UpdateTodoBody`) keep your data shapes consistent
