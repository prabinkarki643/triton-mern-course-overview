# Lesson 13: Building the Complete Todo App

## What You Will Learn
- Planning the app structure and features
- Setting up the full project stack with TypeScript
- Building the complete Todo app with all features
- Combining everything from Lessons 1-12
- Using TypeScript interfaces and types throughout
- Building for production

---

## 13.1 App Features

Our finished Todo app will include:

- **Add tasks** with title and priority (validated with Zod)
- **Toggle completion** with checkboxes
- **Edit tasks** via a dialog
- **Delete tasks** with confirmation
- **Filter tasks** by All / Active / Completed
- **Priority badges** (Low, Medium, High)
- **Task count** and statistics
- **Responsive design** that works on mobile and desktop
- **Clean UI** with shadcn/ui and Tailwind CSS
- **Full TypeScript** type safety across every component

---

## 13.2 Project Setup

Create the project using the shadcn preset, which includes Tailwind CSS and shadcn/ui out of the box:

```bash
npx shadcn@latest init --preset new-york --template vite
cd todo-app
```

Add the required shadcn/ui components:

```bash
npx shadcn@latest add button input card checkbox badge dialog label
```

Install form libraries:

```bash
npm install react-hook-form zod @hookform/resolvers
```

---

## 13.3 Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (auto-generated)
│   ├── Header.tsx
│   ├── AddTodoForm.tsx
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   ├── FilterButtons.tsx
│   ├── EditTaskDialog.tsx
│   └── Statistics.tsx
├── context/
│   └── TodoContext.tsx
├── schemas/
│   └── todoSchema.ts
├── types/
│   └── todo.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## 13.4 Step 1: Shared Types

First, define the core types that will be used throughout the app:

```typescript
// src/types/todo.ts
export interface Todo {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  createdAt: string;
}

export type FilterType = "all" | "active" | "completed";

export interface TodoStats {
  total: number;
  completed: number;
  active: number;
  percentage: number;
}
```

---

## 13.5 Step 2: Validation Schema

```typescript
// src/schemas/todoSchema.ts
import { z } from 'zod'

export const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
  priority: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "Please select a priority" })
  }),
});

export type TodoFormData = z.infer<typeof todoSchema>;
```

---

## 13.6 Step 3: Todo Context

```tsx
// src/context/TodoContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Todo, FilterType, TodoStats } from '../types/todo'

interface TodoContextType {
  tasks: Todo[];
  filteredTasks: Todo[];
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  stats: TodoStats;
  addTask: (title: string, priority?: Todo["priority"]) => void;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
  editTask: (id: number, title: string, priority: Todo["priority"]) => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const useTodo = (): TodoContextType => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error("useTodo must be used within a TodoProvider");
  }
  return context;
};

interface TodoProviderProps {
  children: ReactNode;
}

export function TodoProvider({ children }: TodoProviderProps) {
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  const addTask = (title: string, priority: Todo["priority"] = "medium"): void => {
    const newTask: Todo = {
      id: Date.now(),
      title,
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
  };

  const toggleTask = (id: number): void => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: number): void => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const editTask = (id: number, title: string, priority: Todo["priority"]): void => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, title, priority } : task
      )
    );
  };

  const filteredTasks: Todo[] = tasks.filter(task => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const stats: TodoStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    active: tasks.filter(t => !t.completed).length,
    percentage: tasks.length > 0
      ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
      : 0,
  };

  const value: TodoContextType = {
    tasks,
    filteredTasks,
    filter,
    setFilter,
    stats,
    addTask,
    toggleTask,
    deleteTask,
    editTask,
  };

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
}
```

---

## 13.7 Step 4: Components

### Header

```tsx
// src/components/Header.tsx
import { useTodo } from '../context/TodoContext'

function Header(): JSX.Element {
  const { stats } = useTodo();

  return (
    <header className="text-center mb-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Todo App
      </h1>
      <p className="text-muted-foreground">
        {stats.total === 0
          ? "No tasks yet. Add one to get started!"
          : `${stats.active} remaining | ${stats.completed} completed`
        }
      </p>
    </header>
  )
}

export default Header
```

### Add Todo Form

```tsx
// src/components/AddTodoForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { todoSchema, type TodoFormData } from '../schemas/todoSchema'
import { useTodo } from '../context/TodoContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

function AddTodoForm(): JSX.Element {
  const { addTask } = useTodo();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: "",
      priority: "medium",
    },
  });

  const onSubmit = (data: TodoFormData): void => {
    addTask(data.title, data.priority);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="What needs to be done?"
          className={cn(
            errors.title && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="flex gap-3 items-end">
        <div className="space-y-2 flex-1">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            {...register("priority")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <Button type="submit">Add Task</Button>
      </div>
    </form>
  )
}

export default AddTodoForm
```

### Filter Buttons

```tsx
// src/components/FilterButtons.tsx
import { useTodo } from '../context/TodoContext'
import { Button } from "@/components/ui/button"
import type { FilterType } from '../types/todo'

interface FilterOption {
  value: FilterType;
  label: string;
  count: number;
}

function FilterButtons(): JSX.Element {
  const { filter, setFilter, stats } = useTodo();

  const filters: FilterOption[] = [
    { value: "all", label: "All", count: stats.total },
    { value: "active", label: "Active", count: stats.active },
    { value: "completed", label: "Done", count: stats.completed },
  ];

  return (
    <div className="flex gap-1">
      {filters.map(f => (
        <Button
          key={f.value}
          variant={filter === f.value ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter(f.value)}
        >
          {f.label} ({f.count})
        </Button>
      ))}
    </div>
  )
}

export default FilterButtons
```

### Todo Item

```tsx
// src/components/TodoItem.tsx
import { useTodo } from '../context/TodoContext'
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import EditTaskDialog from './EditTaskDialog'
import { cn } from "@/lib/utils"
import type { Todo } from '../types/todo'

interface TodoItemProps {
  task: Todo;
}

const priorityVariant: Record<Todo["priority"], "destructive" | "default" | "secondary"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

function TodoItem({ task }: TodoItemProps): JSX.Element {
  const { toggleTask, deleteTask } = useTodo();

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      task.completed
        ? "bg-muted/50 border-muted"
        : "bg-card border-border hover:border-primary/20"
    )}>
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => toggleTask(task.id)}
      />

      <span className={cn(
        "flex-1 text-sm",
        task.completed && "line-through text-muted-foreground"
      )}>
        {task.title}
      </span>

      <Badge variant={priorityVariant[task.priority]} className="text-xs">
        {task.priority}
      </Badge>

      <EditTaskDialog task={task} />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => deleteTask(task.id)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
      >
        ×
      </Button>
    </div>
  )
}

export default TodoItem
```

### Edit Task Dialog

```tsx
// src/components/EditTaskDialog.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { todoSchema, type TodoFormData } from '../schemas/todoSchema'
import { useTodo } from '../context/TodoContext'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Todo } from '../types/todo'

interface EditTaskDialogProps {
  task: Todo;
}

function EditTaskDialog({ task }: EditTaskDialogProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const { editTask } = useTodo();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: task.title,
      priority: task.priority,
    },
  });

  const onSubmit = (data: TodoFormData): void => {
    editTask(task.id, data.title, data.priority);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          ✎
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority</Label>
            <select
              id="edit-priority"
              {...register("priority")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditTaskDialog
```

### Todo List

```tsx
// src/components/TodoList.tsx
import { useTodo } from '../context/TodoContext'
import TodoItem from './TodoItem'

function TodoList(): JSX.Element {
  const { filteredTasks } = useTodo();

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No tasks found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {filteredTasks.map(task => (
        <TodoItem key={task.id} task={task} />
      ))}
    </div>
  )
}

export default TodoList
```

### Statistics

```tsx
// src/components/Statistics.tsx
import { useTodo } from '../context/TodoContext'

function Statistics(): JSX.Element | null {
  const { stats } = useTodo();

  if (stats.total === 0) return null;

  return (
    <div className="flex justify-between text-sm text-muted-foreground pt-4 border-t">
      <span>{stats.total} total</span>
      <span>{stats.percentage}% complete</span>
    </div>
  )
}

export default Statistics
```

---

## 13.8 Step 5: App Component

```tsx
// src/App.tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Header from './components/Header'
import AddTodoForm from './components/AddTodoForm'
import FilterButtons from './components/FilterButtons'
import TodoList from './components/TodoList'
import Statistics from './components/Statistics'

function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <Header />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add a Task</CardTitle>
          </CardHeader>
          <CardContent>
            <AddTodoForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Tasks</CardTitle>
            <FilterButtons />
          </CardHeader>
          <CardContent>
            <TodoList />
            <Statistics />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
```

---

## 13.9 Step 6: Entry Point

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { TodoProvider } from './context/TodoContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TodoProvider>
      <App />
    </TodoProvider>
  </React.StrictMode>,
)
```

---

## 13.10 Building for Production

When your app is ready:

```bash
npm run build
```

This creates a `dist/` folder with optimised files ready for deployment. You can preview it with:

```bash
npm run preview
```

---

## 13.11 What We've Built - Full Stack Recap

| Concept | Where It's Used |
|---------|----------------|
| HTML | The structure of every component's JSX |
| CSS / Tailwind | All styling throughout the app |
| JavaScript | Logic, array methods, event handling |
| TypeScript | Interfaces, typed state, typed props, typed context |
| Node.js / npm | Project setup, package management |
| React Components | Every .tsx file in components/ |
| Props | FilterButtons, TodoItem, EditTaskDialog (all with typed interfaces) |
| useState | TodoContext, EditTaskDialog, AddTodoForm (all with type parameters) |
| Context API | TodoContext - fully typed shared state across all components |
| shadcn/ui | Button, Input, Card, Checkbox, Badge, Dialog |
| React Hook Form | AddTodoForm, EditTaskDialog (with `TodoFormData` type) |
| Zod | todoSchema for form validation, `z.infer` for form types |

---

## Practice Exercises

### Exercise 1: Complete the App
Follow this lesson step by step and build the complete Todo app. Make sure:
- Adding tasks works with validation
- Toggling completion works
- Editing tasks opens a dialog with pre-filled values
- Deleting tasks removes them
- Filters show the correct tasks
- Statistics update correctly
- TypeScript reports no errors (`npx tsc --noEmit`)

### Exercise 2: Add Features
Enhance the app with:
- A search bar that filters tasks by title (type the search state as `useState<string>("")`)
- A "Clear Completed" button that removes all completed tasks
- Local storage persistence (save tasks to localStorage, load on page refresh)

### Exercise 3: Customise the Design
Make the app your own:
- Change the colour scheme
- Add animations for adding/removing tasks
- Add a dark mode toggle
- Make it look unique - not like a tutorial project

---

## Key Takeaways
1. **Planning first** - know your features and structure before coding
2. **Shared types** defined in a `types/` folder keep your app consistent
3. **Context** keeps state management clean and centralised, and TypeScript ensures the shape is correct
4. **Zod schemas** defined separately are reusable, and `z.infer` generates matching TypeScript types
5. **shadcn/ui** provides professional components you own and customise
6. **React Hook Form + Zod** handles validation without manual state management
7. **TypeScript interfaces for props** catch mistakes at compile time rather than at runtime
8. **Component composition** makes complex UIs manageable
9. Everything from Lessons 1-12 comes together in a real application
10. `npm run build` creates production-ready files

## What's Next?

In the upcoming lessons, we'll add a **backend** to our Todo app:
- **Express.js** with TypeScript for creating API endpoints
- **MongoDB** with **Mongoose** for database management
- **Axios** and **React Query** for connecting frontend to backend
- Full CRUD operations via REST API
