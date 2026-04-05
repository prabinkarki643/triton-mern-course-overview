# Lesson 15: MongoDB and Mongoose

## What You Will Learn
- What MongoDB is and how it differs from relational databases
- Setting up a free MongoDB Atlas cloud database
- What Mongoose is (Object Document Mapper)
- Installing and connecting Mongoose with TypeScript
- Defining schemas and models with validation
- Performing CRUD operations (Create, Read, Update, Delete)
- Querying, sorting, filtering, and pagination

---

## 15.1 What is MongoDB?

MongoDB is a **document database**. Instead of storing data in rows and columns like a traditional database (such as MySQL or PostgreSQL), MongoDB stores data as **documents** -- flexible, JSON-like objects.

### Relational Database vs Document Database

| Concept | Relational (SQL) | MongoDB |
|---------|-------------------|---------|
| Data container | Table | Collection |
| Single record | Row | Document |
| Structure | Fixed columns (schema) | Flexible fields |
| Unique identifier | Primary key (integer) | `_id` (ObjectId) |
| Query language | SQL | MongoDB Query Language |
| Relationships | Foreign keys and JOINs | Embedded documents or references |

### What Does a Document Look Like?

A MongoDB document is essentially a JavaScript object:

```json
{
  "_id": "6614a3f2b5e4c8a1d2e3f456",
  "title": "Learn MongoDB",
  "priority": "high",
  "completed": false,
  "createdAt": "2025-04-01T10:30:00.000Z",
  "updatedAt": "2025-04-01T10:30:00.000Z"
}
```

**Key differences from SQL:**
- No fixed schema -- documents in the same collection can have different fields
- The `_id` field is automatically generated as a unique ObjectId (a 24-character hex string)
- Data is stored in **BSON** (Binary JSON), which supports more types than plain JSON
- No need for complex JOIN queries -- related data can be embedded directly inside documents

### Why MongoDB for Our Todo App?

- **Simple setup** -- MongoDB Atlas gives you a free cloud database in minutes
- **Natural fit for JavaScript/TypeScript** -- documents are just objects
- **Flexible** -- easy to add new fields without altering a table structure
- **Scales well** -- handles large amounts of data efficiently

---

## 15.2 MongoDB Atlas Setup

MongoDB Atlas is a **cloud-hosted database service**. It is the recommended way to use MongoDB because there is nothing to install on your computer.

### Step-by-Step Setup

1. **Go to** [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account

2. **Create a cluster:**
   - Choose the **Free (M0)** tier
   - Select a cloud provider and region close to you (e.g. AWS, London)
   - Click "Create Cluster" -- this takes a couple of minutes

3. **Create a database user:**
   - Go to Database Access in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Enter a username and a strong password
   - Set the role to "Read and write to any database"
   - Click "Add User"

4. **Allow network access:**
   - Go to Network Access in the left sidebar
   - Click "Add IP Address"
   - For development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production, you would restrict this to your server's IP address
   - Click "Confirm"

5. **Get your connection string:**
   - Go to Database in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Drivers" (Node.js)
   - Copy the connection string -- it looks like this:

```
mongodb+srv://<username>:<password>@cluster0.abc123.mongodb.net/<database>?retryWrites=true&w=majority
```

Replace `<username>`, `<password>`, and `<database>` with your actual values.

6. **Store the connection string securely:**

Create a `.env` file in your backend project root:

```env
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.abc123.mongodb.net/todo-app?retryWrites=true&w=majority
```

**Never commit this file to git.** Add it to your `.gitignore`.

---

## 15.3 What is Mongoose?

Mongoose is an **ODM (Object Document Mapper)** for MongoDB. It sits between your TypeScript code and MongoDB, providing:

- **Schemas** -- define the structure and validation rules for your documents
- **Models** -- provide methods to query and manipulate documents
- **Type safety** -- works with TypeScript interfaces for autocomplete and type checking
- **Validation** -- built-in rules like `required`, `minlength`, `enum`
- **Middleware** -- run code before or after certain operations (like saving)

### Without Mongoose (Raw MongoDB Driver)

```ts
// Manual and untyped
const result = await db.collection('todos').insertOne({
  title: 'Learn MongoDB',
  priority: 'high',
  completed: false,
});
```

### With Mongoose

```ts
// Typed, validated, and structured
const todo = await Todo.create({
  title: 'Learn MongoDB',
  priority: 'high',
});
// Mongoose automatically validates and adds timestamps
```

---

## 15.4 Installing Mongoose

In your backend project:

```bash
npm install mongoose
npm install -D @types/mongoose
```

- `mongoose` -- the ODM library that connects to MongoDB and provides schemas/models
- `@types/mongoose` -- TypeScript type definitions for full type safety

You also need `dotenv` to load environment variables from the `.env` file:

```bash
npm install dotenv
```

---

## 15.5 Project Structure

```
backend/
├── src/
│   ├── models/
│   │   └── Todo.ts
│   ├── routes/
│   │   └── todoRoutes.ts
│   ├── database.ts
│   └── index.ts
├── .env                   # Connection string (gitignored)
├── tsconfig.json
├── package.json
└── .gitignore
```

Notice we use `models/` instead of `entity/`. In Mongoose, we define **models** (not entities), which is the standard terminology in the MongoDB ecosystem.

---

## 15.6 Connecting to MongoDB

Create a database connection file:

```ts
// backend/src/database.ts
import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri: string = process.env.MONGODB_URI || '';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully');
  } catch (error: unknown) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error: Error) => {
  console.error('MongoDB connection error:', error);
});
```

**Key points:**
- `mongoose.connect(uri)` establishes the connection to your Atlas cluster
- The function throws an error if the connection string is missing
- `process.exit(1)` stops the server if the database connection fails -- there is no point running without a database
- Connection events let you monitor the database status

---

## 15.7 Defining the Todo Schema and Model

A **schema** defines the structure, types, and validation rules for documents in a collection. A **model** is a class that provides methods to interact with that collection.

```ts
// backend/src/models/Todo.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface defines the shape of a Todo document
export interface ITodo extends Document {
  title: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema defines validation rules and defaults
const todoSchema = new Schema<ITodo>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title must be under 100 characters'],
      trim: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Model provides methods to query and manipulate documents
export const Todo = mongoose.model<ITodo>('Todo', todoSchema);
```

**Understanding each part:**

1. **`ITodo` interface** -- extends Mongoose's `Document` type, giving us type safety. Every Todo document will have these fields with these types.

2. **`todoSchema`** -- defines the rules:
   - `type: String` -- the field must be a string
   - `required: [true, 'message']` -- the field cannot be empty, with a custom error message
   - `minlength` / `maxlength` -- string length validation
   - `trim: true` -- automatically removes whitespace from the start and end
   - `enum` -- restricts the value to a specific set of options
   - `default` -- provides a value if none is given

3. **`timestamps: true`** -- Mongoose automatically manages `createdAt` and `updatedAt` fields. You never need to set these manually.

4. **`mongoose.model<ITodo>('Todo', todoSchema)`** -- creates the model. The first argument `'Todo'` becomes the collection name `todos` (Mongoose automatically lowercases and pluralises it).

---

## 15.8 Schema Types Reference

Mongoose supports several data types for schema fields:

| Type | TypeScript | Example |
|------|-----------|---------|
| `String` | `string` | `title: { type: String }` |
| `Number` | `number` | `age: { type: Number }` |
| `Boolean` | `boolean` | `completed: { type: Boolean }` |
| `Date` | `Date` | `dueDate: { type: Date }` |
| `ObjectId` | `Types.ObjectId` | `userId: { type: Schema.Types.ObjectId, ref: 'User' }` |
| `Array` | `string[]` | `tags: [{ type: String }]` |
| `Mixed` | `any` | `metadata: { type: Schema.Types.Mixed }` |

### Common Schema Options

| Option | Purpose | Example |
|--------|---------|---------|
| `required` | Field must be provided | `required: true` or `required: [true, 'Error message']` |
| `default` | Value if not provided | `default: 'medium'` or `default: Date.now` |
| `enum` | Restrict to specific values | `enum: ['low', 'medium', 'high']` |
| `minlength` | Minimum string length | `minlength: 3` |
| `maxlength` | Maximum string length | `maxlength: 100` |
| `min` | Minimum number value | `min: 0` |
| `max` | Maximum number value | `max: 100` |
| `trim` | Remove whitespace | `trim: true` |
| `lowercase` | Convert to lowercase | `lowercase: true` |
| `unique` | No duplicate values | `unique: true` |
| `ref` | Reference another model | `ref: 'User'` (for relationships) |
| `timestamps` | Auto-manage dates | `{ timestamps: true }` (schema option) |

---

## 15.9 Basic CRUD Operations

CRUD stands for Create, Read, Update, Delete. Here is how each operation works with Mongoose:

### Create

```ts
// Create a single document
const todo: ITodo = await Todo.create({
  title: 'Learn Mongoose',
  priority: 'high',
});
console.log(todo._id);       // "6614a3f2b5e4c8a1d2e3f456"
console.log(todo.createdAt); // 2025-04-01T10:30:00.000Z

// Create multiple documents at once
const todos: ITodo[] = await Todo.create([
  { title: 'Buy groceries', priority: 'medium' },
  { title: 'Read a book', priority: 'low' },
]);
```

### Read (Find)

```ts
// Find all documents in the collection
const allTodos: ITodo[] = await Todo.find();

// Find with conditions (filter)
const highPriority: ITodo[] = await Todo.find({ priority: 'high' });
const activeTodos: ITodo[] = await Todo.find({ completed: false });

// Find a single document by its ID
const todo: ITodo | null = await Todo.findById('6614a3f2b5e4c8a1d2e3f456');

// Find a single document by a condition
const firstHigh: ITodo | null = await Todo.findOne({ priority: 'high' });
```

### Update

```ts
// Find by ID and update -- returns the updated document
const updated: ITodo | null = await Todo.findByIdAndUpdate(
  '6614a3f2b5e4c8a1d2e3f456',
  { completed: true },
  { new: true, runValidators: true }
);

// Options explained:
// - new: true     → return the updated document (default returns the old one)
// - runValidators → apply schema validation to the update
```

### Delete

```ts
// Find by ID and delete -- returns the deleted document
const deleted: ITodo | null = await Todo.findByIdAndDelete('6614a3f2b5e4c8a1d2e3f456');

// Delete many documents at once
const result = await Todo.deleteMany({ completed: true });
console.log(result.deletedCount); // number of deleted documents
```

---

## 15.10 Querying with Mongoose

Mongoose provides a powerful query builder with chainable methods:

### Sorting

```ts
// Sort by creation date, newest first
const newest: ITodo[] = await Todo.find().sort({ createdAt: -1 });

// Sort by title alphabetically
const alphabetical: ITodo[] = await Todo.find().sort({ title: 1 });

// Sort by multiple fields
const sorted: ITodo[] = await Todo.find().sort({ priority: 1, createdAt: -1 });
```

**Sort values:** `1` = ascending (A to Z, oldest first), `-1` = descending (Z to A, newest first)

### Limiting and Pagination

```ts
// Get only the first 10 results
const firstTen: ITodo[] = await Todo.find().limit(10);

// Skip the first 10, then get the next 10 (page 2)
const pageTwo: ITodo[] = await Todo.find().skip(10).limit(10);
```

### Selecting Specific Fields

```ts
// Only return title and completed fields (plus _id)
const titles: ITodo[] = await Todo.find().select('title completed');

// Exclude specific fields
const noTimestamps: ITodo[] = await Todo.find().select('-createdAt -updatedAt');
```

### Filtering with Conditions

```ts
// Exact match
const highPriority: ITodo[] = await Todo.find({ priority: 'high' });

// Multiple conditions (AND)
const activeHigh: ITodo[] = await Todo.find({
  completed: false,
  priority: 'high',
});

// Text search (case-insensitive, contains)
const searched: ITodo[] = await Todo.find({
  title: { $regex: 'learn', $options: 'i' },
});
```

### Counting Documents

```ts
// Count all documents
const total: number = await Todo.countDocuments();

// Count with a filter
const completedCount: number = await Todo.countDocuments({ completed: true });
```

### Chaining It All Together

```ts
// Complex query: active high-priority todos, newest first, page 1
const results: ITodo[] = await Todo.find({ completed: false, priority: 'high' })
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(10)
  .select('title priority createdAt');
```

---

## 15.11 Connecting Everything

Update your Express server to connect to MongoDB before starting:

```ts
// backend/src/index.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDatabase } from './database';
import todoRoutes from './routes/todoRoutes';

const app = express();
const PORT: number = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/todos', todoRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Connect to database, then start server
connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
```

**Key points:**
- `import 'dotenv/config'` loads the `.env` file automatically -- it must be the first import
- The server only starts **after** the database connection is established
- If the database connection fails, `connectDatabase()` calls `process.exit(1)`, so the server never starts

---

## 15.12 Basic Todo Routes with Mongoose

```ts
// backend/src/routes/todoRoutes.ts
import { Router, Request, Response } from 'express';
import { Todo, ITodo } from '../models/Todo';

const router = Router();

// GET all todos
router.get('/', async (_req: Request, res: Response) => {
  try {
    const todos: ITodo[] = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// GET single todo
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const todo: ITodo | null = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(todo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

// POST create todo
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, priority } = req.body as {
      title: string;
      priority?: string;
    };

    const todo: ITodo = await Todo.create({
      title,
      priority: priority || 'medium',
    });
    res.status(201).json(todo);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create todo' });
    }
  }
});

// PUT update todo
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, priority, completed } = req.body as {
      title?: string;
      priority?: string;
      completed?: boolean;
    };

    const todo: ITodo | null = await Todo.findByIdAndUpdate(
      req.params.id,
      { title, priority, completed },
      { new: true, runValidators: true }
    );

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(todo);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update todo' });
    }
  }
});

// DELETE todo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const todo: ITodo | null = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default router;
```

**Key Mongoose patterns:**
- Mongoose models have query methods built in (`find`, `findById`, `create`, etc.)
- MongoDB uses string-based ObjectIds (not integer IDs)
- Validation errors come from Mongoose schema rules, not manual checks
- `findByIdAndUpdate` with `{ new: true }` returns the updated document in one step
- `findByIdAndDelete` returns the deleted document (or `null` if not found)

---

## 15.13 Update .gitignore

```gitignore
node_modules
dist
.env
```

Never commit your `.env` file to git -- it contains your database credentials.

---

## Practice Exercises

### Exercise 1: Set Up the Database
1. Create a free MongoDB Atlas account and cluster
2. Create a database user and allow network access
3. Install Mongoose and dotenv in your backend project
4. Create the `.env` file with your connection string
5. Create the `database.ts` connection file
6. Create the Todo model in `models/Todo.ts`
7. Start the server and verify "Connected to MongoDB successfully" appears

### Exercise 2: Test CRUD Operations
Using curl or the REST Client extension:
1. Create 5 different todos with various priorities
2. Fetch all todos and verify they are saved
3. Update one todo to mark it as completed
4. Delete a todo and verify it is gone
5. Restart the server -- verify todos persist (unlike the in-memory version)
6. Try creating a todo with a title shorter than 3 characters -- verify the validation error

### Exercise 3: Add Sorting and Filtering
Add query parameters to the GET all route:
- `/api/todos?completed=true` -- filter by completion status
- `/api/todos?priority=high` -- filter by priority
- `/api/todos?sort=title` -- sort by title instead of date

Hint: Use `req.query` to read query parameters and build a filter object for `Todo.find()`.

---

## Key Takeaways
1. **MongoDB** is a document database that stores data as flexible JSON-like documents, organised into collections
2. **MongoDB Atlas** provides a free cloud-hosted database -- no local installation needed
3. **Mongoose** is an ODM that provides schemas, models, validation, and type safety for MongoDB
4. **Schemas** define the structure and rules for documents -- types, required fields, defaults, and validation
5. **Models** provide methods like `create()`, `find()`, `findById()`, `findByIdAndUpdate()`, and `findByIdAndDelete()`
6. The **`timestamps: true`** option automatically manages `createdAt` and `updatedAt` fields
7. **Queries are chainable** -- combine `.find()`, `.sort()`, `.limit()`, `.skip()`, and `.select()`
8. MongoDB uses **ObjectId** strings instead of auto-incrementing integer IDs
9. Always wrap database operations in **try/catch** for error handling
10. Data persists in the cloud -- it survives server restarts, computer restarts, and is accessible from anywhere
