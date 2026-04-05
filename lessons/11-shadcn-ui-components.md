# Lesson 11: shadcn/ui Components

## What You Will Learn
- What shadcn/ui is and how it differs from traditional component libraries
- How shadcn/ui was configured during project creation in Lesson 6
- Adding individual components: Button, Input, Card, Checkbox, Badge, Dialog
- Customising components with Tailwind
- The `cn()` utility for conditional class names
- Building the Todo app UI with shadcn/ui

---

## 11.1 What is shadcn/ui?

shadcn/ui is **not a component library** in the traditional sense. It's a **collection of reusable components** that you copy into your project and own.

### Traditional Library vs shadcn/ui

| Traditional (e.g. Material UI) | shadcn/ui |
|-------------------------------|-----------|
| Install as npm package | Copy components into your project |
| Styles controlled by the library | You own and customise everything |
| Updates require package updates | Update files directly |
| Can be bloated | Only add what you need |
| Learning the library's API | Uses standard React + Tailwind |

**Key insight:** When you add a shadcn/ui component, it creates actual files in your project. You can read, edit, and customise them freely.

---

## 11.2 shadcn/ui Is Already Configured

When we created our project in Lesson 6, we ran:

```bash
npx shadcn@latest init --preset [CODE] --template vite
```

This command set up **both** Tailwind CSS and shadcn/ui for us in one step. It created:

- `components.json` - shadcn/ui configuration
- `src/lib/utils.ts` - utility functions (like `cn()` for merging class names)
- Updates to `src/index.css` with CSS variables for theming
- Path aliases configured in `tsconfig.json` so you can use `@/components/...`

**You don't need to run `npx shadcn@latest init` again.** The framework is ready. All you need to do now is add the individual components you want to use.

---

## 11.3 Adding Components

You add components one at a time as you need them:

```bash
# Add individual components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add checkbox
npx shadcn@latest add badge
npx shadcn@latest add dialog
npx shadcn@latest add label
```

Each command creates a file in `src/components/ui/`:

```
src/components/ui/
├── button.tsx
├── input.tsx
├── card.tsx
├── checkbox.tsx
├── badge.tsx
├── dialog.tsx
└── label.tsx
```

These are real TypeScript files that you own. Open them up and have a look - you'll see they're built with React and Tailwind, and you can edit them however you like.

---

## 11.4 Using the Button Component

```tsx
import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="space-y-4">
      {/* Default button */}
      <Button>Click Me</Button>

      {/* Variants */}
      <Button variant="default">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link Style</Button>

      {/* Sizes */}
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>

      {/* Disabled */}
      <Button disabled>Disabled</Button>

      {/* With onClick */}
      <Button onClick={() => console.log("clicked!")}>
        Do Something
      </Button>
    </div>
  );
}
```

---

## 11.5 Using the Input Component

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SearchBar() {
  return (
    <div className="space-y-2">
      <Label htmlFor="search">Search tasks</Label>
      <Input
        id="search"
        type="text"
        placeholder="Type to search..."
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          console.log(e.target.value)
        }
      />
    </div>
  );
}
```

The Input component is a styled `<input>` element. It accepts all the same props as a regular HTML input.

---

## 11.6 Using the Card Component

Cards are great for containing sections of content:

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function TodoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tasks</CardTitle>
        <CardDescription>Manage your daily tasks</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Todo list goes here */}
        <p>Your tasks will appear here.</p>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">3 tasks remaining</p>
      </CardFooter>
    </Card>
  );
}
```

---

## 11.7 Using the Checkbox Component

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

interface TodoItemProps {
  task: Task;
  onToggle: (id: number) => void;
}

function TodoItem({ task, onToggle }: TodoItemProps) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
      />
      <Label
        htmlFor={`task-${task.id}`}
        className={task.completed ? "line-through text-muted-foreground" : ""}
      >
        {task.title}
      </Label>
    </div>
  );
}
```

**Note:** shadcn/ui Checkbox uses `onCheckedChange` instead of `onChange`.

---

## 11.8 Using the Badge Component

Badges are perfect for showing categories or priority levels:

```tsx
import { Badge } from "@/components/ui/badge";

interface Task {
  id: number;
  title: string;
  priority?: "low" | "medium" | "high";
}

interface TodoItemProps {
  task: Task;
}

function TodoItem({ task }: TodoItemProps) {
  return (
    <div className="flex items-center gap-3">
      <span>{task.title}</span>

      {/* Badge variants */}
      <Badge variant="default">New</Badge>
      <Badge variant="secondary">Low</Badge>
      <Badge variant="destructive">Urgent</Badge>
      <Badge variant="outline">Tag</Badge>

      {/* Priority badge */}
      {task.priority === "high" && (
        <Badge variant="destructive">High</Badge>
      )}
      {task.priority === "medium" && (
        <Badge variant="default">Medium</Badge>
      )}
      {task.priority === "low" && (
        <Badge variant="secondary">Low</Badge>
      )}
    </div>
  );
}
```

---

## 11.9 Using the Dialog Component

Dialogs (modals) are useful for edit forms and confirmations:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Task {
  id: number;
  title: string;
}

interface EditTaskDialogProps {
  task: Task;
}

function EditTaskDialog({ task }: EditTaskDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update the task details below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task title</Label>
            <Input id="title" defaultValue={task.title} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 11.10 The cn() Utility

shadcn/ui includes a `cn()` helper for merging Tailwind classes conditionally:

```tsx
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

interface TodoItemProps {
  task: Task;
}

function TodoItem({ task }: TodoItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border",
      task.completed
        ? "bg-muted border-muted"
        : "bg-card border-border"
    )}>
      <span className={cn(
        "flex-1",
        task.completed && "line-through text-muted-foreground"
      )}>
        {task.title}
      </span>
    </div>
  );
}
```

`cn()` is like `className` but it handles:
- Conditional classes
- Merging without duplicates
- Resolving Tailwind class conflicts

---

## 11.11 Building the Todo App with shadcn/ui

Let's put it all together:

```tsx
// src/App.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "./components/Header";
import AddTodoForm from "./components/AddTodoForm";
import FilterButtons from "./components/FilterButtons";
import TodoList from "./components/TodoList";

function App() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <Header />
        <Card>
          <CardHeader>
            <CardTitle>Add a Task</CardTitle>
          </CardHeader>
          <CardContent>
            <AddTodoForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            <FilterButtons />
          </CardHeader>
          <CardContent>
            <TodoList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
```

```tsx
// src/components/AddTodoForm.tsx
import { useState } from "react";
import { useTodo } from "../context/TodoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function AddTodoForm() {
  const [inputValue, setInputValue] = useState<string>("");
  const { addTask } = useTodo();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputValue.trim() === "") return;
    addTask(inputValue.trim());
    setInputValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setInputValue(e.target.value)
        }
        placeholder="What needs to be done?"
      />
      <Button type="submit">Add</Button>
    </form>
  );
}

export default AddTodoForm;
```

```tsx
// src/components/TodoItem.tsx
import { useTodo } from "../context/TodoContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  completed: boolean;
  priority?: "low" | "medium" | "high";
}

interface TodoItemProps {
  task: Task;
}

function TodoItem({ task }: TodoItemProps) {
  const { toggleTask, deleteTask } = useTodo();

  return (
    <div className="flex items-center gap-3 py-3">
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => toggleTask(task.id)}
      />
      <span className={cn(
        "flex-1",
        task.completed && "line-through text-muted-foreground"
      )}>
        {task.title}
      </span>
      {task.priority && (
        <Badge variant={
          task.priority === "high" ? "destructive" :
          task.priority === "medium" ? "default" : "secondary"
        }>
          {task.priority}
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => deleteTask(task.id)}
        className="text-destructive hover:text-destructive"
      >
        Delete
      </Button>
    </div>
  );
}

export default TodoItem;
```

---

## Practice Exercises

### Exercise 1: Add and Explore Components
1. Add Button, Input, Card, and Checkbox components using `npx shadcn@latest add`
2. Open the files in `src/components/ui/` and read the code
3. Notice they are standard TypeScript React components using Tailwind

### Exercise 2: Restyle with shadcn/ui
Replace your custom Todo app components with shadcn/ui:
- Use `Card` for sections
- Use `Input` for the task input
- Use `Button` for actions
- Use `Checkbox` for task completion
- Use `Badge` for priority labels

### Exercise 3: Add an Edit Dialog
Create an edit dialog using shadcn/ui `Dialog` component that:
- Opens when clicking "Edit" on a task
- Shows the current task title in an input
- Has "Save" and "Cancel" buttons
- Updates the task via Context when saved

---

## Key Takeaways
1. shadcn/ui **copies components into your project** - you own and customise them
2. shadcn/ui was **already configured** during project creation in Lesson 6
3. Add components individually: `npx shadcn@latest add button`
4. Components live in `src/components/ui/` as `.tsx` files and are fully editable
5. Use the `cn()` utility for conditional class names
6. shadcn/ui components are built with Tailwind - customise with utility classes
7. Components follow standard React patterns (typed props, events, composition)
8. Only add components you actually need - keeps the project lean
