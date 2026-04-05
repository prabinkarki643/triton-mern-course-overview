# Lesson 17: Connecting Frontend to Backend with Axios and React Query

## What You Will Learn
- Why Axios is better than the Fetch API for real applications
- Creating a configured Axios instance with TypeScript
- Building a typed API service layer with Axios
- What React Query is and why it simplifies server state management
- Setting up React Query with `QueryClientProvider`
- Using `useQuery` for fetching data and `useMutation` for changes
- Replacing manual state management with React Query's automatic caching
- Environment variables for API URLs

---

## 17.1 The Big Picture

Until now:
- **Frontend** (React + TypeScript) stores todos in memory with Context API
- **Backend** (Express + TypeScript) stores todos in MongoDB with Mongoose

Now we will connect them using **Axios** for HTTP requests and **React Query** for managing server state:

```
React App (localhost:5173)     Express API (localhost:3001)     MongoDB
         |                              |                          |
         |-- Axios GET /api/todos ----> |-- Todo.find() ---------> |
         |                              |                          |
         |<-- [{ _id: "...", ... }] ----|<-- [documents] ----------|
         |                              |                          |
         | React Query caches result    |                          |
         | and manages loading/error    |                          |
```

---

## 17.2 Why Axios Over Fetch

The Fetch API is built into every browser, but it has some rough edges. Axios solves all of them:

| Feature | Fetch API | Axios |
|---------|-----------|-------|
| JSON parsing | Manual: `response.json()` | Automatic |
| Error handling | Only rejects on network errors | Rejects on 4xx and 5xx status codes |
| Request/response interceptors | Not built in | Built in |
| Base URL | Must include full URL every time | Configure once |
| Request timeout | Not built in | Built in |
| Request cancellation | Complex `AbortController` | Simple cancel tokens |
| TypeScript support | Requires manual typing | Generic response types |

### Fetch API Problems

```ts
// Problem 1: Fetch does NOT throw on HTTP errors
const response = await fetch('/api/todos');
// response.ok could be false, but no error is thrown
// You must check manually every time:
if (!response.ok) throw new Error('Request failed');

// Problem 2: Manual JSON parsing every time
const data = await response.json();

// Problem 3: No base URL -- full path repeated everywhere
const response = await fetch('http://localhost:3001/api/todos');
```

### Axios Solutions

```ts
// Axios throws automatically on 4xx/5xx
// JSON is parsed automatically
// Base URL configured once
const { data } = await api.get<Todo[]>('/todos');
// data is already typed as Todo[]
```

---

## 17.3 Installing Axios and React Query

In your webapp project:

```bash
npm install axios @tanstack/react-query
```

- `axios` -- HTTP client with interceptors, automatic JSON, and typed responses
- `@tanstack/react-query` -- server state manager with caching, loading states, and automatic refetching

---

## 17.4 Creating an Axios Instance

Instead of using Axios directly everywhere, create a configured instance:

```ts
// webapp/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

export default api;
```

**What this gives you:**
- `baseURL` -- every request automatically prepends this URL, so you write `/todos` instead of `http://localhost:3001/api/todos`
- `headers` -- Content-Type is set once, not repeated on every request
- `timeout` -- requests automatically fail after 10 seconds instead of hanging forever

---

## 17.5 Shared Types

Define the types that represent your data. These mirror the Mongoose model from the backend:

```ts
// webapp/src/types/todo.ts

export interface Todo {
  _id: string;              // MongoDB ObjectId as a string
  title: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;        // ISO date string from the API
  updatedAt: string;        // ISO date string from the API
}

export interface CreateTodoData {
  title: string;
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateTodoData {
  title?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
}

export interface TodoFilters {
  completed?: boolean;
  priority?: string;
  search?: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  active: number;
  percentage: number;
}
```

**Note:** MongoDB uses `_id` as a `string` (ObjectId) rather than a numeric `id`.

---

## 17.6 API Service Layer with Axios

Create a service that wraps all API calls with proper types:

```ts
// webapp/src/services/todoApi.ts
import api from './api';
import { Todo, CreateTodoData, UpdateTodoData, TodoFilters } from '../types/todo';

export const todoApi = {
  // Get all todos (with optional filters)
  async getAll(filters: TodoFilters = {}): Promise<Todo[]> {
    const params: Record<string, string> = {};
    if (filters.completed !== undefined) {
      params.completed = String(filters.completed);
    }
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;

    const { data } = await api.get<Todo[]>('/todos', { params });
    return data;
  },

  // Get single todo
  async getById(id: string): Promise<Todo> {
    const { data } = await api.get<Todo>(`/todos/${id}`);
    return data;
  },

  // Create a new todo
  async create(todoData: CreateTodoData): Promise<Todo> {
    const { data } = await api.post<Todo>('/todos', todoData);
    return data;
  },

  // Update a todo
  async update(id: string, todoData: UpdateTodoData): Promise<Todo> {
    const { data } = await api.put<Todo>(`/todos/${id}`, todoData);
    return data;
  },

  // Delete a todo
  async delete(id: string): Promise<void> {
    await api.delete(`/todos/${id}`);
  },
};
```

**Notice the improvements over the Fetch API version:**
- **No manual JSON parsing** -- `api.get<Todo[]>()` returns typed data automatically
- **No manual error checking** -- Axios throws on 4xx/5xx responses
- **No base URL repeated** -- paths start with `/todos` instead of full URLs
- **No headers repeated** -- Content-Type is set in the Axios instance
- **Generic types** -- `api.get<Todo[]>()` tells TypeScript what the response contains
- **IDs are strings** -- MongoDB ObjectIds, not integers

---

## 17.7 What is React Query?

React Query (TanStack Query) is a **server state manager**. It handles all the complexity of fetching, caching, and synchronising data from your API.

### The Problem Without React Query

Without it, you manage everything manually:

```tsx
// Without React Query -- lots of boilerplate
const [todos, setTodos] = useState<Todo[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await todoApi.getAll();
      setTodos(data);
    } catch (err) {
      setError('Failed to fetch');
    } finally {
      setLoading(false);
    }
  };
  fetchTodos();
}, []);
```

That is 15 lines of boilerplate for a single fetch. And you still need to handle:
- Refetching when data changes
- Caching (not re-fetching data you already have)
- Keeping multiple components in sync
- Background refetching

### The Solution With React Query

```tsx
// With React Query -- clean and automatic
const { data: todos, isLoading, isError } = useQuery({
  queryKey: ['todos'],
  queryFn: () => todoApi.getAll(),
});
```

**Three lines.** React Query automatically handles:
- **Loading state** -- `isLoading` is `true` while fetching
- **Error state** -- `isError` is `true` if the request fails
- **Caching** -- data is cached and reused across components
- **Refetching** -- automatically refetches when the window regains focus
- **Synchronisation** -- all components using `['todos']` stay in sync

---

## 17.8 Setting Up React Query

Wrap your app with the `QueryClientProvider`:

```tsx
// webapp/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,      // Data is fresh for 1 minute
      retry: 1,                   // Retry failed requests once
      refetchOnWindowFocus: true, // Refetch when tab regains focus
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Configuration explained:**
- `staleTime` -- how long data is considered fresh. While fresh, React Query serves from cache without refetching
- `retry: 1` -- retry a failed request once before showing an error
- `refetchOnWindowFocus` -- when the user switches back to your tab, data is automatically refreshed

---

## 17.9 Using `useQuery` for Fetching Data

`useQuery` is used for **reading data** (GET requests). It manages loading, error, and data states automatically:

```tsx
import { useQuery } from '@tanstack/react-query';
import { todoApi } from '../services/todoApi';
import { Todo } from '../types/todo';

function TodoList(): JSX.Element {
  const {
    data: todos,
    isLoading,
    isError,
    error,
  } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: () => todoApi.getAll(),
  });

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Error: {error instanceof Error ? error.message : 'Failed to fetch todos'}</p>
      </div>
    );
  }

  if (!todos || todos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((task: Todo) => (
        <TodoItem key={task._id} task={task} />
      ))}
    </div>
  );
}
```

**Understanding `queryKey`:**
- `['todos']` is a unique key that identifies this query
- React Query uses this key to cache the result
- Any component that uses the same key gets the same cached data
- When you invalidate this key, all components using it re-fetch

---

## 17.10 Using `useMutation` for Create, Update, and Delete

`useMutation` is used for **changing data** (POST, PUT, DELETE requests). After a mutation succeeds, you invalidate the query cache to trigger a re-fetch:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { todoApi } from '../services/todoApi';
import { CreateTodoData, UpdateTodoData, Todo } from '../types/todo';

// Inside a component:

const queryClient = useQueryClient();

// CREATE mutation
const createMutation = useMutation({
  mutationFn: (newTodo: CreateTodoData) => todoApi.create(newTodo),
  onSuccess: () => {
    // Invalidate the todos cache -- triggers a re-fetch
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});

// UPDATE mutation
const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: UpdateTodoData }) =>
    todoApi.update(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});

// DELETE mutation
const deleteMutation = useMutation({
  mutationFn: (id: string) => todoApi.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

**How invalidation works:**
1. User creates a new todo
2. `createMutation.mutate({ title: 'New task', priority: 'high' })` sends the POST request
3. On success, `invalidateQueries({ queryKey: ['todos'] })` marks the cache as stale
4. React Query automatically re-fetches from the API
5. All components using the `['todos']` key update with the new data

**Using mutations in event handlers:**

```tsx
// In AddTodoForm
const handleSubmit = (formData: CreateTodoData): void => {
  createMutation.mutate(formData, {
    onSuccess: () => {
      reset(); // Reset the form
    },
    onError: (error: Error) => {
      console.error('Failed to create todo:', error.message);
    },
  });
};

// Toggle completion
const handleToggle = (todo: Todo): void => {
  updateMutation.mutate({
    id: todo._id,
    data: { completed: !todo.completed },
  });
};

// Delete
const handleDelete = (id: string): void => {
  deleteMutation.mutate(id);
};
```

**Mutation states:**

```tsx
// Each mutation has loading and error states
<Button
  onClick={() => createMutation.mutate(formData)}
  disabled={createMutation.isPending}
>
  {createMutation.isPending ? 'Adding...' : 'Add Task'}
</Button>

{createMutation.isError && (
  <p className="text-destructive">
    {createMutation.error instanceof Error
      ? createMutation.error.message
      : 'Failed to add task'}
  </p>
)}
```

---

## 17.11 Replacing TodoContext with React Query

With React Query handling server state (todos, loading, errors), the Context API is only needed for **client-side state** like the current filter:

```tsx
// webapp/src/context/TodoContext.tsx
import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

type FilterType = 'all' | 'active' | 'completed';

interface TodoContextValue {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
}

interface TodoProviderProps {
  children: ReactNode;
}

const TodoContext = createContext<TodoContextValue | null>(null);

export const useTodoFilter = (): TodoContextValue => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodoFilter must be used within a TodoProvider');
  }
  return context;
};

export function TodoProvider({ children }: TodoProviderProps): JSX.Element {
  const [filter, setFilter] = useState<FilterType>('all');

  return (
    <TodoContext.Provider value={{ filter, setFilter }}>
      {children}
    </TodoContext.Provider>
  );
}
```

**What changed:**
- The Context no longer stores todos, loading, or error states -- React Query handles all of that
- The Context only manages the current filter (which is purely client-side state)
- The hook is renamed to `useTodoFilter` to reflect its reduced responsibility
- All CRUD operations moved to mutations in the components that need them

---

## 17.12 Custom Hooks for Clean Components

Create custom hooks that combine React Query with your API service for reuse across components:

```ts
// webapp/src/hooks/useTodos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todoApi } from '../services/todoApi';
import { Todo, CreateTodoData, UpdateTodoData, TodoStats } from '../types/todo';
import { useTodoFilter } from '../context/TodoContext';

export function useTodos() {
  const queryClient = useQueryClient();
  const { filter } = useTodoFilter();

  // Fetch all todos
  const {
    data: todos = [],
    isLoading,
    isError,
    error,
  } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: () => todoApi.getAll(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newTodo: CreateTodoData) => todoApi.create(newTodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTodoData }) =>
      todoApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => todoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Client-side filtering
  const filteredTodos: Todo[] = todos.filter((todo: Todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  // Calculate stats
  const stats: TodoStats = {
    total: todos.length,
    completed: todos.filter((t: Todo) => t.completed).length,
    active: todos.filter((t: Todo) => !t.completed).length,
    percentage: todos.length > 0
      ? Math.round(
          (todos.filter((t: Todo) => t.completed).length / todos.length) * 100
        )
      : 0,
  };

  return {
    todos: filteredTodos,
    allTodos: todos,
    stats,
    isLoading,
    isError,
    error,
    addTodo: createMutation.mutate,
    isAdding: createMutation.isPending,
    updateTodo: (id: string, data: UpdateTodoData) =>
      updateMutation.mutate({ id, data }),
    isUpdating: updateMutation.isPending,
    deleteTodo: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
```

**Now components are clean:**

```tsx
// webapp/src/components/TodoList.tsx
import { useTodos } from '../hooks/useTodos';
import { Todo } from '../types/todo';
import TodoItem from './TodoItem';

function TodoList(): JSX.Element {
  const { todos, isLoading, isError, error } = useTodos();

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Error: {error instanceof Error ? error.message : 'Failed to fetch'}</p>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((task: Todo) => (
        <TodoItem key={task._id} task={task} />
      ))}
    </div>
  );
}

export default TodoList;
```

---

## 17.13 Environment Variables

Do not hardcode the API URL. Use environment variables:

Create a `.env` file in your webapp root:

```env
VITE_API_URL=http://localhost:3001/api
```

**Important rules for Vite environment variables:**
- Must start with `VITE_` to be accessible in the browser
- Accessed via `import.meta.env.VITE_VARIABLE_NAME`
- Add `.env` to `.gitignore`

The Axios instance uses this automatically:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});
```

For production, create a `.env.production` file:

```env
VITE_API_URL=https://your-api-domain.com/api
```

Vite automatically uses the correct file based on the build mode.

---

## 17.14 CORS Configuration

CORS (Cross-Origin Resource Sharing) is needed because the frontend (port 5173) and backend (port 3001) are on different origins.

The backend already has this set up:

```ts
// backend/src/index.ts
import cors from 'cors';
app.use(cors());
```

For production, restrict it to your specific frontend URL:

```ts
app.use(cors({
  origin: 'https://your-frontend-domain.com',
}));
```

---

## 17.15 Running Both Servers

You need both the frontend and backend running simultaneously.

**Terminal 1 -- Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 -- Frontend:**
```bash
cd webapp
npm run dev
```

Now the React app at `localhost:5173` will communicate with the Express API at `localhost:3001`.

---

## 17.16 What Changed -- Before and After

### State Management Comparison

| Concern | Before (Context + Fetch) | After (React Query + Axios) |
|---------|--------------------------|------------------------------|
| Data fetching | Manual `useEffect` + `useState` | `useQuery` (3 lines) |
| Loading state | Manual `setLoading(true/false)` | Automatic `isLoading` |
| Error state | Manual `try/catch` + `setError` | Automatic `isError` |
| Creating data | Manual `fetch` + `setTasks` | `useMutation` + auto-invalidate |
| Caching | None -- re-fetch every time | Automatic with `staleTime` |
| Background refetch | Not implemented | Built in (window focus) |
| Multiple components | Share via Context | Share via query key |
| Code volume | ~80 lines for TodoContext | ~15 lines for useTodos hook |

### The Flow

**Before (Manual):**
```
User clicks "Add" -> fetch POST -> manually update state -> UI renders
                                -> manually handle loading
                                -> manually handle errors
```

**After (React Query):**
```
User clicks "Add" -> mutation.mutate() -> auto POST via Axios
                                       -> auto invalidate cache
                                       -> auto re-fetch todos
                                       -> auto update all components
                                       -> auto loading/error states
```

---

## 17.17 Complete File Summary

```
project/
├── webapp/                        # React Frontend (TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui
│   │   │   ├── Header.tsx
│   │   │   ├── AddTodoForm.tsx
│   │   │   ├── TodoList.tsx       # Uses useTodos hook
│   │   │   ├── TodoItem.tsx
│   │   │   ├── FilterButtons.tsx
│   │   │   ├── EditTaskDialog.tsx
│   │   │   └── Statistics.tsx
│   │   ├── context/
│   │   │   └── TodoContext.tsx    # Only manages filter state now
│   │   ├── hooks/
│   │   │   └── useTodos.ts       # NEW - React Query custom hook
│   │   ├── services/
│   │   │   ├── api.ts            # NEW - Axios instance
│   │   │   └── todoApi.ts        # API service layer (Axios)
│   │   ├── types/
│   │   │   └── todo.ts           # Shared TypeScript interfaces
│   │   ├── schemas/
│   │   │   └── todoSchema.ts
│   │   ├── App.tsx
│   │   └── main.tsx              # QueryClientProvider wraps the app
│   ├── .env                       # API URL
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                       # Express Backend (TypeScript)
│   ├── src/
│   │   ├── models/
│   │   │   └── Todo.ts           # Mongoose schema and model
│   │   ├── routes/
│   │   │   └── todoRoutes.ts
│   │   ├── controllers/
│   │   │   └── todoController.ts
│   │   ├── middleware/
│   │   │   └── asyncHandler.ts
│   │   ├── types/
│   │   │   └── todo.ts           # Backend request/response types
│   │   ├── database.ts
│   │   └── index.ts
│   ├── .env                       # MongoDB connection string
│   ├── tsconfig.json
│   └── package.json
│
├── CLAUDE.md
├── SUMMARY.md
└── lessons/
```

---

## Practice Exercises

### Exercise 1: Set Up Axios and React Query
1. Install `axios` and `@tanstack/react-query` in the webapp project
2. Create the Axios instance in `services/api.ts`
3. Create the `todoApi.ts` service layer using Axios
4. Set up `QueryClientProvider` in `main.tsx`
5. Create the `useTodos` custom hook

### Exercise 2: Replace Context with React Query
1. Update `TodoContext` to only manage the filter state
2. Update `TodoList` to use the `useTodos` hook
3. Update `AddTodoForm` to use `createMutation`
4. Update `TodoItem` to use update and delete mutations
5. Test that adding, completing, editing, and deleting all work
6. Refresh the page -- verify data persists

### Exercise 3: Loading and Mutation States
1. Show "Adding..." on the Add button while creating a todo
2. Disable the delete button while a deletion is in progress
3. Show a loading spinner on individual todo items during updates
4. Test by using the Network tab in browser DevTools to throttle the connection
5. Stop the backend server and verify error states appear correctly

### Exercise 4: Optimistic Updates (Advanced)
Instead of waiting for the re-fetch after a mutation, update the cache immediately:
```tsx
const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: UpdateTodoData }) =>
    todoApi.update(id, data),
  onMutate: async ({ id, data }) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // Snapshot previous value
    const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

    // Optimistically update the cache
    queryClient.setQueryData<Todo[]>(['todos'], (old) =>
      old?.map((todo) =>
        todo._id === id ? { ...todo, ...data } : todo
      ) ?? []
    );

    // Return the snapshot for rollback
    return { previousTodos };
  },
  onError: (_err, _variables, context) => {
    // Rollback on error
    if (context?.previousTodos) {
      queryClient.setQueryData(['todos'], context.previousTodos);
    }
  },
  onSettled: () => {
    // Always refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

This makes the app feel instant -- the UI updates before the server responds.

---

## Key Takeaways
1. **Axios** provides automatic JSON parsing, error handling on 4xx/5xx, base URL configuration, and typed responses
2. Create a **configured Axios instance** to avoid repeating base URL and headers
3. **React Query** manages server state -- fetching, caching, loading, errors, and synchronisation
4. **`useQuery`** handles GET requests with automatic loading/error states and caching
5. **`useMutation`** handles POST/PUT/DELETE with `onSuccess` callbacks to invalidate the cache
6. **Query keys** like `['todos']` identify cached data -- invalidating a key triggers a re-fetch for all components using it
7. **Context API is only needed for client-side state** (like filters) -- server state belongs in React Query
8. **Custom hooks** like `useTodos` keep components clean by combining queries and mutations
9. **Environment variables** (`VITE_*`) keep API URLs configurable across environments
10. **CORS** must be configured on the backend for cross-origin requests

## Course Complete!

Congratulations! You have built a full-stack Todo application with TypeScript:
- **HTML/CSS/JS** fundamentals
- **React** with components, state, and Context API
- **TypeScript** for type safety across the entire stack
- **Tailwind CSS** and **shadcn/ui** for professional UI
- **React Hook Form** and **Zod** for validated forms
- **Express.js** backend with a typed REST API
- **MongoDB** with **Mongoose** for document-based data persistence
- **Axios** and **React Query** for professional frontend-backend integration

You now have the foundation to build any web application!
