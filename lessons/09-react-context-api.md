# Lesson 9: React Context API

## What You Will Learn
- The problem Context solves (prop drilling)
- Creating and providing typed Context
- Consuming Context with `useContext` and TypeScript
- Building a fully typed TodoContext for our app
- When to use Context vs props

---

## 9.1 The Problem: Prop Drilling

In Lesson 8, we passed `tasks`, `onToggle`, and `onDelete` from `App` -> `TodoList` -> `TodoItem`. This works fine for 2-3 levels, but imagine a deeply nested component tree:

```
App (has tasks state)
  └── Layout
       └── Main
            └── TodoSection
                 └── TodoList
                      └── TodoItem (needs tasks + callbacks)
```

Every component in the chain must pass the props down, even if they do not use them. This is called **prop drilling** - it is messy, hard to maintain, and error-prone.

**Context solves this** by letting any component access shared data directly, without passing it through every intermediate component.

---

## 9.2 How Context Works

Think of Context like a radio broadcast:

1. **Create** the radio station (createContext)
2. **Broadcast** a signal (Provider with a typed value)
3. **Tune in** from any component (useContext)

```
App (Provider - broadcasts tasks)
  └── Layout
       └── Main
            └── TodoSection
                 └── TodoList
                      └── TodoItem (useContext - tunes in directly)
```

No prop drilling needed!

---

## 9.3 Creating Typed Context - Step by Step

### Step 1: Define the Context Type and Create the Context File

First, define an interface that describes everything the context will provide. This is the contract between the Provider and every consumer.

```tsx
// src/context/TodoContext.tsx
import { createContext, useContext, useState } from 'react'
import { Todo } from '../types/todo'

// 1. Define the shape of the context value
interface TodoContextType {
  tasks: Todo[];
  filteredTasks: Todo[];
  filter: string;
  setFilter: (filter: string) => void;
  addTask: (title: string) => void;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
  editTask: (id: number, newTitle: string) => void;
  completedCount: number;
}

// 2. Create the context with undefined as default
//    (undefined because there is no Provider yet at creation time)
const TodoContext = createContext<TodoContextType | undefined>(undefined);

// 3. Create a typed custom hook (makes consuming easier and safer)
export const useTodo = (): TodoContextType => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error("useTodo must be used within a TodoProvider");
  }
  return context;
};

// 4. Define the Provider's props
interface TodoProviderProps {
  children: React.ReactNode;
}

// 5. Create the Provider component
export function TodoProvider({ children }: TodoProviderProps) {
  const [tasks, setTasks] = useState<Todo[]>([
    { id: 1, title: "Learn HTML", completed: true },
    { id: 2, title: "Learn CSS", completed: true },
    { id: 3, title: "Learn JavaScript", completed: false },
  ]);

  const [filter, setFilter] = useState<string>("all");

  const addTask = (title: string): void => {
    const newTask: Todo = {
      id: Date.now(),
      title,
      completed: false,
    };
    setTasks((prev: Todo[]) => [...prev, newTask]);
  };

  const toggleTask = (id: number): void => {
    setTasks((prev: Todo[]) =>
      prev.map((task: Todo) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: number): void => {
    setTasks((prev: Todo[]) => prev.filter((task: Todo) => task.id !== id));
  };

  const editTask = (id: number, newTitle: string): void => {
    setTasks((prev: Todo[]) =>
      prev.map((task: Todo) =>
        task.id === id ? { ...task, title: newTitle } : task
      )
    );
  };

  // Derived state - filtered tasks based on current filter
  const filteredTasks: Todo[] = tasks.filter((task: Todo) => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true; // "all"
  });

  const completedCount: number = tasks.filter((t: Todo) => t.completed).length;

  // The value object matches the TodoContextType interface exactly
  const value: TodoContextType = {
    tasks,
    filteredTasks,
    filter,
    setFilter,
    addTask,
    toggleTask,
    deleteTask,
    editTask,
    completedCount,
  };

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
}
```

**What is happening:**
- `TodoContextType` defines the exact shape of shared data - TypeScript will enforce this everywhere
- `createContext<TodoContextType | undefined>(undefined)` creates the context with a union type (it is `undefined` until a Provider wraps the tree)
- `useTodo()` returns `TodoContextType` - the `if (!context)` check means TypeScript knows the return value is never `undefined`
- `TodoProviderProps` types the `children` prop as `React.ReactNode` (the standard type for anything renderable)
- `TodoProvider` is a component that wraps your app and shares state

### Step 2: Wrap Your App with the Provider

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { TodoProvider } from './context/TodoContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TodoProvider>
      <App />
    </TodoProvider>
  </React.StrictMode>,
)
```

Now every component inside `<TodoProvider>` can access the todo state with full type safety.

### Step 3: Use Context in Components

```tsx
// src/components/Header.tsx
import { useTodo } from '../context/TodoContext'

function Header() {
  const { tasks, completedCount } = useTodo();

  return (
    <header className="text-center mb-6">
      <h1 className="text-3xl font-bold">My Todo App</h1>
      <p className="text-gray-500">{tasks.length} tasks | {completedCount} completed</p>
    </header>
  )
}

export default Header
```

```tsx
// src/components/AddTodoForm.tsx
import { useState } from 'react'
import { useTodo } from '../context/TodoContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function AddTodoForm() {
  const [inputValue, setInputValue] = useState<string>("");
  const { addTask } = useTodo();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (inputValue.trim() === "") return;
    addTask(inputValue.trim());
    setInputValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
        placeholder="What needs to be done?"
      />
      <Button type="submit">Add</Button>
    </form>
  )
}

export default AddTodoForm
```

```tsx
// src/components/TodoItem.tsx
import { Todo } from '../types/todo'
import { useTodo } from '../context/TodoContext'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface TodoItemProps {
  task: Todo;
}

function TodoItem({ task }: TodoItemProps) {
  const { toggleTask, deleteTask } = useTodo();

  return (
    <li className="flex items-center gap-3 p-3 rounded-lg border">
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => toggleTask(task.id)}
      />
      <span className={task.completed ? "flex-1 line-through text-gray-400" : "flex-1"}>
        {task.title}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-700"
        onClick={() => deleteTask(task.id)}
      >
        Delete
      </Button>
    </li>
  )
}

export default TodoItem
```

```tsx
// src/components/TodoList.tsx
import { Todo } from '../types/todo'
import { useTodo } from '../context/TodoContext'
import TodoItem from './TodoItem'

function TodoList() {
  const { filteredTasks } = useTodo();

  if (filteredTasks.length === 0) {
    return <p className="text-center text-gray-400 py-8">No tasks yet. Add one above!</p>
  }

  return (
    <ul className="space-y-2">
      {filteredTasks.map((task: Todo) => (
        <TodoItem key={task.id} task={task} />
      ))}
    </ul>
  )
}

export default TodoList
```

### Step 4: Clean Up App Component

```tsx
// src/App.tsx - now much simpler!
import Header from './components/Header'
import AddTodoForm from './components/AddTodoForm'
import TodoList from './components/TodoList'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <Header />
        <AddTodoForm />
        <TodoList />
      </div>
    </div>
  )
}

export default App
```

Notice how `App` no longer manages any state or passes any props. Each component gets what it needs directly from the typed Context.

---

## 9.4 Before vs After Context

### Before (Prop Drilling)

```tsx
function App() {
  const [tasks, setTasks] = useState<Todo[]>([]);
  // ... all the add/toggle/delete functions ...

  return (
    <div>
      <Header taskCount={tasks.length} completedCount={completedCount} />
      <AddTodoForm onAdd={addTask} />
      <TodoList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
    </div>
  )
}
```

### After (Context)

```tsx
function App() {
  return (
    <div>
      <Header />
      <AddTodoForm />
      <TodoList />
    </div>
  )
}
```

Much cleaner! The state lives in `TodoProvider`, and each component accesses only what it needs via the typed `useTodo()` hook.

---

## 9.5 When to Use Context vs Props

| Use Props When | Use Context When |
|----------------|-----------------|
| Data only goes 1-2 levels deep | Data needs to reach many levels |
| Only a few components need the data | Many components across the tree need it |
| The data flow is clear and simple | Props are being passed through components that do not use them |
| Component is reusable and generic | Data is "global" to a section of your app |

**Examples of good Context use:**
- User authentication (logged-in user data)
- Theme (dark/light mode)
- Todo list state (our use case)
- Shopping cart
- Language/locale settings

**Do not overuse Context.** If only a parent and child need to share data, props are simpler and more explicit.

---

## 9.6 Adding Filter Functionality

Let us enhance our app with filter buttons that use the Context:

```tsx
// src/components/FilterButtons.tsx
import { useTodo } from '../context/TodoContext'
import { Button } from '@/components/ui/button'

function FilterButtons() {
  const { filter, setFilter } = useTodo();

  const filters: string[] = ["all", "active", "completed"];

  return (
    <div className="flex gap-1">
      {filters.map((f: string) => (
        <Button
          key={f}
          variant={filter === f ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter(f)}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </Button>
      ))}
    </div>
  )
}

export default FilterButtons
```

The `FilterButtons` component reads `filter` and `setFilter` from Context. TypeScript ensures `setFilter` is called with a `string`, matching the `TodoContextType` interface.

---

## 9.7 Why the Custom Hook Pattern Matters

You might wonder why we create `useTodo()` instead of using `useContext(TodoContext)` directly. There are two important reasons:

### 1. Type Safety

Without the custom hook, `useContext` returns `TodoContextType | undefined`. Every consumer would need to check for `undefined`:

```tsx
// Without custom hook - tedious and error-prone
const context = useContext(TodoContext);
if (!context) throw new Error("...");
const { tasks } = context;
```

With the custom hook, the check happens once and the return type is always `TodoContextType`:

```tsx
// With custom hook - clean and safe
const { tasks } = useTodo();
```

### 2. Better Error Messages

If a component tries to use `useTodo()` outside of a `<TodoProvider>`, it throws a clear error: "useTodo must be used within a TodoProvider". Without the hook, you would just get `undefined` values and confusing runtime errors.

---

## Practice Exercises

### Exercise 1: Refactor to Context
Take the Todo app from Lesson 8 and refactor it to use Context API:
1. Create `src/context/TodoContext.tsx` with the `TodoContextType` interface and all state functions
2. Wrap the app in `<TodoProvider>` in `main.tsx`
3. Update all components to use `useTodo()` instead of props

### Exercise 2: Add Filters
Add the filter functionality from section 9.6:
1. Add `filter` and `filteredTasks` to the Context (already in our `TodoContextType`)
2. Create a typed `FilterButtons` component
3. Update `TodoList` to use `filteredTasks` instead of `tasks`

### Exercise 3: Task Statistics
Create a `Statistics` component that shows:
- Total tasks
- Completed tasks
- Active tasks
- Completion percentage

All data should come from Context via `useTodo()`. Define an interface for any derived values if you extract them into a helper function.

---

## Key Takeaways
1. **Context** solves prop drilling - share typed data without passing through every level
2. **Type the context value** with an interface (`TodoContextType`) so every consumer is type-safe
3. Use `createContext<TodoContextType | undefined>(undefined)` because the default has no Provider
4. **Custom hooks** like `useTodo()` handle the `undefined` check and return a clean typed value
5. Type the **Provider's children** prop as `React.ReactNode`
6. The **Provider** wraps your component tree and broadcasts the typed value
7. Keep state logic inside the Provider - components just call the typed functions
8. Use Context for **widely shared** state; use props for **local** parent-child data
