# Full-Stack / MERN Stack Web Development Course

## Instructor Teaching Guide -- "BookMyRoom" Venue Booking App

**Course Goal**: Take students from TypeScript fundamentals to a deployed full-stack MERN Stack (MongoDB, Express, React, Node.js) booking application.

**Final Product**: "BookMyRoom" -- a room/venue booking platform with authentication, image uploads, payment integration (eSewa + COD), and dashboards.

**Prerequisites**: Students should have basic familiarity with HTML, CSS, and JavaScript (Lessons 01-03 from the existing curriculum). This guide begins at Lesson 04.

**Teaching Philosophy**: Theory first, analogy second, code third, practice fourth. Every concept is anchored to something students already understand from daily life before touching code.

---

## How to Use This Guide

Each lesson follows a consistent structure:

- **Topic** -- What this lesson covers
- **Teaching Approach** -- Analogies, live-coding tips, and where students commonly get confused
- **Key Concepts** -- Bullet list of non-negotiable understanding
- **Code Patterns** -- The main snippets to demonstrate (not exhaustive -- just the patterns that unlock understanding)
- **Exercise** -- What students build or practise
- **Duration** -- Estimated classroom time

---

# Phase 1: React Fundamentals via Todo App (Lessons 04-13)

---

## Lesson 04: TypeScript Basics

**Topic**: Types, interfaces, generics -- giving JavaScript a safety net.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "TypeScript is like labelling every box when you move house. JavaScript lets you throw everything into unlabelled boxes -- it works, but you will open the wrong box eventually. TypeScript makes you label every box so you always know what is inside."

**Live Coding Tips**:
- Start in the TypeScript Playground (typescriptlang.org/play) so students see errors instantly without any project setup.
- Write a function in plain JS first, then add types. Show the before/after.
- Deliberately introduce a type error and let students see the red squiggly line. Ask: "Would JavaScript have caught this?" (No -- it would crash at runtime.)

**Common Confusion Points**:
- `type` vs `interface` -- tell students: "Use `interface` for object shapes, `type` for everything else. You can debate the nuance later when you are experienced."
- Generics -- students will glaze over. Use the "box" analogy: `Box<string>` is a box that only holds strings, `Box<number>` only holds numbers. The box itself does not change shape.
- `any` -- explain it exists but ban it immediately. "Using `any` is like removing the labels from your boxes. Why bother with TypeScript at all?"

### Key Concepts

- Primitive types: `string`, `number`, `boolean`
- Arrays: `string[]` and `Array<string>`
- Object typing with `interface` and `type`
- Function parameter and return types
- Optional properties (`?`) and union types (`|`)
- Generics: `<T>` as a placeholder type
- `as const` and literal types (brief intro)
- Why `any` is dangerous and `unknown` is safer

### Code Patterns

```typescript
// 1. Basic types
let title: string = "Learn TypeScript";
let count: number = 42;
let isDone: boolean = false;

// 2. Interface for object shapes
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority?: "low" | "medium" | "high"; // optional + union
}

// 3. Typing functions
function addTodo(title: string, priority: Todo["priority"] = "medium"): Todo {
  return {
    id: Date.now(),
    title,
    completed: false,
    priority,
  };
}

// 4. Generics -- the "labelled box"
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

const firstTodo = getFirst<Todo>(todoList); // returns Todo | undefined
const firstName = getFirst<string>(["Alice", "Bob"]); // returns string | undefined

// 5. Arrays of objects
const todos: Todo[] = [
  { id: 1, title: "Buy milk", completed: false },
  { id: 2, title: "Walk dog", completed: true, priority: "high" },
];
```

### Exercise

Convert three plain JavaScript functions to TypeScript:
1. A function that filters an array of todos by completion status
2. A function that takes a todo ID and returns the matching todo (or `undefined`)
3. A function that creates a new todo object from user input

Students must define a `Todo` interface and ensure zero `any` usage.

---

## Lesson 05: Node.js & Tooling

**Topic**: npm, packages, Vite -- the tools that make modern development possible.

**Duration**: 60 minutes

### Teaching Approach

**Analogy**: "Node.js is JavaScript that escaped the browser. Normally JS can only run inside Chrome or Firefox. Node.js lets it run on your computer directly -- like how a fish learned to walk on land."

**npm Analogy**: "npm is like an app store for code. Instead of writing everything yourself, you install packages that other developers have already built and tested."

**Vite Analogy**: "Vite is your project's engine. It takes all your files, bundles them together, and serves them to the browser lightning-fast. Think of it like a kitchen that prepares all your ingredients so you can just cook."

**Live Coding Tips**:
- Open a terminal and run `node -v` and `npm -v` first. Confirm everyone has them installed.
- Create a project folder from scratch: `mkdir my-first-project && cd my-first-project && npm init -y`. Walk through every field in `package.json`.
- Install a package (e.g., `npm install chalk`) and show `node_modules`. Open it. Show students the thousands of files. Say: "This is why we never commit this folder."
- Show `.gitignore` and explain it immediately.

**Common Confusion Points**:
- `dependencies` vs `devDependencies` -- "dependencies are ingredients in your recipe that customers eat. devDependencies are the kitchen tools that help you cook but customers never see."
- `npx` vs `npm` -- "npm installs things. npx runs things without installing."
- Students often panic when they see `node_modules` size. Reassure them this is normal.

### Key Concepts

- What Node.js is and why it exists
- Terminal basics: `cd`, `mkdir`, `ls`, `pwd`
- `npm init`, `package.json` anatomy
- `npm install`, `npm install --save-dev`
- `node_modules` and why it is gitignored
- `npx` for running packages without installing
- Scripts in `package.json` (`"dev"`, `"build"`, `"start"`)
- Vite as a development server and build tool
- `.gitignore` essentials

### Code Patterns

```bash
# Terminal commands to demonstrate
node -v                          # Check Node version
npm -v                           # Check npm version
mkdir todo-app && cd todo-app    # Create project folder
npm init -y                      # Initialise package.json

npm install react react-dom      # Install dependencies
npm install -D typescript vite   # Install dev dependencies
```

```json
// package.json -- key fields to explain
{
  "name": "todo-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### Exercise

1. Create a new folder, initialise it with `npm init -y`
2. Install `chalk` as a dependency
3. Create an `index.js` file that uses `chalk` to print coloured text to the terminal
4. Add a `"start"` script to `package.json` that runs `node index.js`
5. Run it with `npm start`
6. Create a `.gitignore` that excludes `node_modules`

---

## Lesson 06: React Introduction

**Topic**: Setting up a React project with Vite + shadcn preset, understanding JSX/TSX and components.

**Duration**: 75 minutes

### Teaching Approach

**Analogy**: "If a website is a house, React lets you build it from LEGO bricks instead of pouring concrete. Each brick (component) can be reused, rearranged, and replaced without rebuilding the entire house."

**Live Coding Tips**:
- Use the shadcn preset to scaffold the project: `npx shadcn@latest init --preset <code> --template vite`. This gives students React + TypeScript + Tailwind + shadcn in one command -- no configuration headaches.
- Walk through the generated folder structure file by file. Do not skip any file. Students need to know what everything is.
- Open `App.tsx`, delete everything inside the return statement, and write `<h1>Hello BookMyRoom</h1>`. Show the browser update instantly (HMR).
- Show that JSX is "HTML inside TypeScript" -- but point out key differences: `className` not `class`, `htmlFor` not `for`, self-closing tags like `<img />`.

**Common Confusion Points**:
- "Is JSX HTML?" -- No, it compiles to JavaScript. Show the compiled output briefly.
- "Why `.tsx` and not `.ts`?" -- TSX files can contain JSX syntax. Plain `.ts` files cannot.
- Students will forget `className` and write `class`. This is the most common early mistake.

### Key Concepts

- What React is and the component model
- Setting up with `npx shadcn@latest init`
- Project structure: `src/`, `public/`, `index.html`, `main.tsx`, `App.tsx`
- JSX/TSX syntax rules
- `className` instead of `class`
- Curly braces `{}` for JavaScript expressions inside JSX
- The dev server and Hot Module Replacement (HMR)
- `npm run dev` to start, `npm run build` to produce output

### Code Patterns

```bash
# Project setup with shadcn preset
npx shadcn@latest init --preset new-york --template vite
```

```tsx
// App.tsx -- first React component
function App() {
  const appName = "BookMyRoom";
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-3xl font-bold">Welcome to {appName}</h1>
      <p>Copyright {currentYear}</p>
    </div>
  );
}

export default App;
```

```tsx
// main.tsx -- entry point (explain, don't modify)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Exercise

1. Scaffold a new React project using the shadcn preset
2. Modify `App.tsx` to display a welcome page for "BookMyRoom" with:
   - A heading with the app name
   - A short description paragraph
   - A footer with the current year (computed dynamically)
3. Add a variable for your name and display "Built by [Name]" using curly braces

---

## Lesson 07: Components and JSX

**Topic**: Function components, props, rendering lists, conditional rendering.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "Components are like recipe cards. Each card (component) has a name, takes specific ingredients (props), and always produces the same dish (UI). You can use the same recipe card as many times as you want."

**Live Coding Tips**:
- Start by building everything in one file. Then refactor into separate component files. Students need to see the "before messy" and "after clean" to understand why components exist.
- When teaching props, start with a hardcoded component, then ask: "What if we want different text?" Introduce props as the answer.
- For lists, write a `.map()` without a `key` first. Open the console and show the warning. Then add the key and explain why React needs it.

**Common Confusion Points**:
- Props are READ-ONLY. Students will try to modify them. Emphasise: "Props are like a letter you receive. You can read it, but you cannot change what someone else wrote."
- The `key` prop in lists -- "React uses keys like name tags at a conference. Without them, React cannot tell which person left and which arrived."
- Conditional rendering with `&&` -- students forget that `0 && <Component />` renders `0`, not nothing. Use `Boolean(value) &&` or ternary.

### Key Concepts

- Function components (capital letter naming convention)
- Props: passing data from parent to child
- TypeScript interface for props
- Rendering lists with `.map()` and the `key` prop
- Conditional rendering: `&&`, ternary `? :`, early return
- Component composition (components inside components)
- Extracting components into separate files

### Code Patterns

```tsx
// TodoItem.tsx -- component with typed props
interface TodoItemProps {
  id: number;
  title: string;
  completed: boolean;
  onToggle: (id: number) => void;
}

function TodoItem({ id, title, completed, onToggle }: TodoItemProps) {
  return (
    <div className="flex items-center gap-2 p-2">
      <input
        type="checkbox"
        checked={completed}
        onChange={() => onToggle(id)}
      />
      <span className={completed ? "line-through text-muted-foreground" : ""}>
        {title}
      </span>
    </div>
  );
}

export default TodoItem;
```

```tsx
// TodoList.tsx -- rendering a list
import TodoItem from "./TodoItem";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number) => void;
}

function TodoList({ todos, onToggle }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="text-muted-foreground">No todos yet. Add one above!</p>;
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          id={todo.id}
          title={todo.title}
          completed={todo.completed}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

export default TodoList;
```

```tsx
// Conditional rendering patterns
// Pattern 1: && operator
{isLoggedIn && <LogoutButton />}

// Pattern 2: Ternary
{isLoggedIn ? <Dashboard /> : <LoginForm />}

// Pattern 3: Early return
function AdminPanel({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return null;
  return <div>Admin controls here</div>;
}
```

### Exercise

Build three components for the Todo app:
1. `Header` -- displays the app title and a todo count (received via props)
2. `TodoItem` -- displays a single todo with a checkbox and title
3. `TodoList` -- receives an array of todos and renders `TodoItem` for each

Use conditional rendering to show "All done!" when all todos are completed.

---

## Lesson 08: State and Props

**Topic**: useState, event handling, controlled inputs, lifting state up.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "State is like a whiteboard in a classroom. Anyone can look at it (read), but only the teacher (the component that owns it) can write on it. When the teacher updates the whiteboard, everyone sees the change immediately."

**Lifting State Analogy**: "If two students need to share information, they do not pass notes directly. They tell the teacher (parent component), who writes it on the whiteboard (state) for everyone to see."

**Live Coding Tips**:
- Start with a simple counter: `const [count, setCount] = useState(0)`. Click a button, see the number change. This is the "aha" moment.
- Show what happens if you try `count = count + 1` directly -- nothing updates. Explain: "React only re-renders when you use the setter function."
- Build a controlled input: type in a text box, show the value updating in real-time below it.
- Demonstrate lifting state by having two child components that need to share data.

**Common Confusion Points**:
- State updates are asynchronous. `console.log` right after `setState` shows the old value. Demonstrate this.
- Mutating state directly (e.g., `todos.push(newTodo)`) does not trigger re-render. Always create new arrays/objects: `[...todos, newTodo]`.
- Controlled vs uncontrolled inputs -- students will forget `value` and `onChange` must be paired.

### Key Concepts

- `useState` hook: declaration, getter, setter
- State updates trigger re-renders
- Immutable state updates (spread operator for arrays and objects)
- Event handling: `onClick`, `onChange`, `onSubmit`
- Controlled inputs: `value` + `onChange`
- Lifting state up to a common parent
- `e.preventDefault()` on form submission

### Code Patterns

```tsx
// Counter -- simplest state example
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount((prev) => prev - 1)}>Decrement</button>
    </div>
  );
}
```

```tsx
// Controlled input + adding todos
import { useState } from "react";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newTodo: Todo = {
      id: Date.now(),
      title: input.trim(),
      completed: false,
    };

    setTodos([...todos, newTodo]);   // immutable update
    setInput("");                     // clear input
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  return (
    <div>
      <form onSubmit={addTodo}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a todo..."
        />
        <button type="submit">Add</button>
      </form>

      {todos.map((todo) => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span>{todo.title}</span>
          <button onClick={() => deleteTodo(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### Exercise

Build a working Todo app with these features (all in one file for now):
1. A text input and "Add" button to create todos
2. A list of todos with checkboxes to toggle completion
3. A delete button on each todo
4. A count showing "X of Y completed"
5. Use `useState` for both the todo list and the input value

---

## Lesson 09: Context API

**Topic**: Solving prop drilling with createContext, useContext, and a TodoContext.

**Duration**: 75 minutes

### Teaching Approach

**Analogy**: "Prop drilling is like passing a note through ten people to reach someone at the back of the room. Context is like using a loudspeaker -- everyone in the room hears it directly, no passing required."

**Live Coding Tips**:
- First, show the prop drilling problem. Build a 3-level deep component tree where the bottom component needs data from the top. Count how many components are just "passing through" props they do not use. This is the pain.
- Then refactor using Context. Show how the middle components no longer need the props at all.
- Create a dedicated `TodoContext.tsx` file with provider and custom hook.

**Common Confusion Points**:
- Context is NOT a replacement for all state. "Use Context for data that many components need. Use local state for data that one component needs."
- Students forget the Provider wrapper. If `useContext` returns undefined, it is almost always because the Provider is missing or in the wrong place.
- The custom hook pattern (`useTodoContext`) is optional but strongly recommended -- it provides better error messages and avoids importing both the context and useContext.

### Key Concepts

- The prop drilling problem
- `createContext` with a typed default value
- Provider component wrapping children
- `useContext` to consume context values
- Custom hook pattern: `useTodoContext()`
- When to use Context vs local state
- Context provider placement in the component tree

### Code Patterns

```tsx
// contexts/TodoContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

interface TodoContextType {
  todos: Todo[];
  addTodo: (title: string, priority: Todo["priority"]) => void;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

// Custom hook with safety check
export function useTodoContext() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error("useTodoContext must be used within a TodoProvider");
  }
  return context;
}

// Provider component
export function TodoProvider({ children }: { children: ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = (title: string, priority: Todo["priority"]) => {
    setTodos((prev) => [
      ...prev,
      { id: Date.now(), title, completed: false, priority },
    ]);
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <TodoContext.Provider value={{ todos, addTodo, toggleTodo, deleteTodo }}>
      {children}
    </TodoContext.Provider>
  );
}
```

```tsx
// App.tsx -- wrapping with Provider
import { TodoProvider } from "./contexts/TodoContext";
import Header from "./components/Header";
import TodoList from "./components/TodoList";
import AddTodoForm from "./components/AddTodoForm";

function App() {
  return (
    <TodoProvider>
      <div className="max-w-md mx-auto p-4">
        <Header />
        <AddTodoForm />
        <TodoList />
      </div>
    </TodoProvider>
  );
}
```

```tsx
// Any deeply nested component -- direct access, no prop drilling
import { useTodoContext } from "../contexts/TodoContext";

function TodoCount() {
  const { todos } = useTodoContext();
  const completed = todos.filter((t) => t.completed).length;

  return (
    <p>{completed} of {todos.length} completed</p>
  );
}
```

### Exercise

Refactor the Todo app from Lesson 08:
1. Create a `TodoContext` with all CRUD operations
2. Create a custom `useTodoContext` hook
3. Wrap the app in `TodoProvider`
4. Remove all prop drilling -- components should access context directly
5. Add a `TodoStats` component that shows total, completed, and remaining counts (it must use context, not receive props)

---

## Lesson 10: Tailwind CSS

**Topic**: Utility classes, responsive design, dark mode.

**Duration**: 60 minutes

### Teaching Approach

**Analogy**: "Traditional CSS is like writing a recipe from scratch every time you cook. Tailwind is like having a pantry full of pre-made ingredients -- `p-4` is a pinch of padding, `bg-blue-500` is a splash of blue, `rounded-lg` rounds the corners. You combine small utilities to build any design."

**Live Coding Tips**:
- Tailwind is already installed via the shadcn preset, so no setup needed. Jump straight into usage.
- Start by styling a plain `<div>` with raw CSS, then rebuild it with Tailwind classes. Show the difference in speed.
- Open the Tailwind docs (tailwindcss.com) and show students how to search for any CSS property. They do not need to memorise classes -- they need to know how to look them up.
- Resize the browser window to demonstrate responsive breakpoints (`sm:`, `md:`, `lg:`).

**Common Confusion Points**:
- "This is ugly, why are there so many classes?" -- Explain that it feels verbose at first but is faster once you get used to it. No context-switching between CSS and HTML files.
- Responsive prefixes are mobile-first. `text-sm md:text-lg` means "small text by default, large text on medium screens and above." Students often think `md:` means "only on medium screens."
- `space-y-4` and `gap-4` -- both create spacing but work differently (margins vs flexbox/grid gap).

### Key Concepts

- Utility-first philosophy
- Spacing: `p-`, `m-`, `px-`, `py-`, `gap-`
- Colours: `bg-`, `text-`, colour scales (50-950)
- Typography: `text-sm`, `font-bold`, `leading-`
- Layout: `flex`, `grid`, `items-center`, `justify-between`
- Borders and shadows: `rounded-`, `border`, `shadow-`
- Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Dark mode: `dark:` prefix
- Hover/focus states: `hover:`, `focus:`

### Code Patterns

```tsx
// Card component styled with Tailwind
function RoomCard() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm
                    hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold">Conference Room A</h3>
      <p className="text-sm text-muted-foreground mt-1">Capacity: 20 people</p>
      <div className="flex items-center justify-between mt-4">
        <span className="text-xl font-bold">Rs. 500/hr</span>
        <button className="rounded-md bg-primary px-4 py-2 text-sm
                           text-primary-foreground hover:bg-primary/90">
          Book Now
        </button>
      </div>
    </div>
  );
}
```

```tsx
// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
  {rooms.map((room) => (
    <RoomCard key={room.id} room={room} />
  ))}
</div>
```

```tsx
// Dark mode support
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <h1 className="text-2xl font-bold">BookMyRoom</h1>
</div>
```

### Exercise

Restyle the Todo app using only Tailwind classes:
1. Create a centred card layout for the whole app
2. Style the input and button with padding, borders, and hover states
3. Style completed todos with `line-through` and muted text colour
4. Make the layout responsive: single column on mobile, wider on desktop
5. Add dark mode support to at least the background and text colours

---

## Lesson 11: shadcn/ui Components

**Topic**: Button, Input, Card, Checkbox, Badge, Dialog -- production-quality UI without building from scratch.

**Duration**: 75 minutes

### Teaching Approach

**Analogy**: "shadcn/ui is not a library you install -- it is a menu you order from. When you 'add' a component, the actual source code is copied into YOUR project. You own it. You can change anything. It is like ordering a custom suit versus buying off the rack."

**Live Coding Tips**:
- Show the shadcn/ui website (ui.shadcn.com). Browse components together. Let students see what is available before adding anything.
- Add a component live: `npx shadcn@latest add button`. Open the generated file at `src/components/ui/button.tsx`. Show students: "This is YOUR code now. You can edit it."
- Replace a plain `<button>` with `<Button>`, then show the variants: `<Button variant="destructive">Delete</Button>`. The instant visual upgrade gets students excited.
- Build a Dialog step by step -- this is the most complex component they will use. Go slowly.

**Common Confusion Points**:
- "Is this like Bootstrap?" -- No. Bootstrap gives you compiled CSS. shadcn gives you actual React components that you own and can modify.
- Students will try to `npm install @shadcn/button` -- there is no package. Each component is added individually via the CLI.
- The `cn()` utility (for merging class names) -- explain briefly but do not deep-dive. "It merges Tailwind classes smartly. Use it when you need conditional classes."

### Key Concepts

- What shadcn/ui is (component collection, not library)
- Adding components: `npx shadcn@latest add <component>`
- `Button` -- variants, sizes, asChild
- `Input` -- with labels and descriptions
- `Card` -- CardHeader, CardContent, CardFooter
- `Checkbox` -- controlled with state
- `Badge` -- for status/category labels
- `Dialog` -- modal dialogs with trigger
- The `cn()` utility for class merging

### Code Patterns

```bash
# Adding components
npx shadcn@latest add button input card checkbox badge dialog
```

```tsx
// Todo item with shadcn components
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TodoItemProps {
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  onToggle: () => void;
  onDelete: () => void;
}

function TodoItem({ title, completed, priority, onToggle, onDelete }: TodoItemProps) {
  const priorityColour = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  return (
    <Card className="mb-2">
      <CardContent className="flex items-center gap-3 p-4">
        <Checkbox checked={completed} onCheckedChange={onToggle} />
        <span className={completed ? "line-through text-muted-foreground flex-1" : "flex-1"}>
          {title}
        </span>
        <Badge className={priorityColour[priority]}>{priority}</Badge>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </CardContent>
    </Card>
  );
}
```

```tsx
// Dialog for adding a new todo
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function AddTodoDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Todo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a New Todo</DialogTitle>
        </DialogHeader>
        {/* Form goes here */}
      </DialogContent>
    </Dialog>
  );
}
```

### Exercise

Replace all custom UI in the Todo app with shadcn/ui components:
1. Use `Card` to wrap each todo item
2. Use `Checkbox` instead of raw `<input type="checkbox">`
3. Use `Button` for all buttons (with appropriate variants)
4. Use `Badge` to display priority levels
5. Use `Dialog` for the "Add Todo" form (opens in a modal)
6. Use `Input` for all text inputs

---

## Lesson 12: React Hook Form + Zod

**Topic**: Form schemas, useForm, validation, type inference with z.infer.

**Duration**: 90 minutes

### Teaching Approach

**Analogy -- Zod**: "Zod is like a bouncer at a club. Before any data gets into your app, Zod checks it against a list of rules. Too short? Rejected. Wrong format? Rejected. Missing required field? Rejected."

**Analogy -- React Hook Form**: "React Hook Form is like a smart clipboard. Instead of you manually tracking every field's value, error, and touched state, the clipboard does it all. You just describe the rules and it handles the rest."

**Live Coding Tips**:
- Start by building a form WITHOUT any library -- manual state for each field, manual validation in the submit handler. Let students feel the pain of managing multiple `useState` calls and writing `if (!title) setError("Title required")` for every field.
- Then rebuild the same form with React Hook Form + Zod. The reduction in code is dramatic and makes the "why" self-evident.
- Show `z.infer<typeof schema>` -- "You define your rules once in Zod, and TypeScript types are generated automatically. One source of truth."

**Common Confusion Points**:
- `register` vs controlled components -- React Hook Form uses `register` to avoid re-renders. Students who just learnt controlled inputs (Lesson 08) will be confused. Explain: "React Hook Form uses a smarter approach that avoids unnecessary re-renders."
- `zodResolver` is the bridge between Zod and React Hook Form. Students often forget to import and configure it.
- Error messages -- students need to know where to display them. Show the `errors` object and how to access `errors.title?.message`.

### Key Concepts

- Why form libraries exist (validation, performance, UX)
- Zod schema definition: `z.string()`, `z.number()`, `z.enum()`
- Zod refinements: `.min()`, `.max()`, `.email()`, `.optional()`
- `z.infer<typeof schema>` for automatic TypeScript types
- `useForm` hook: `register`, `handleSubmit`, `formState`
- `zodResolver` connecting Zod schemas to React Hook Form
- Displaying validation errors
- Resetting forms after submission

### Code Patterns

```bash
# Install dependencies
npm install react-hook-form zod @hookform/resolvers
```

```tsx
// schemas/todoSchema.ts
import { z } from "zod";

export const todoSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters"),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Please select a priority",
  }),
  dueDate: z.string().optional(),
});

// Automatic TypeScript type from schema
export type TodoFormData = z.infer<typeof todoSchema>;
// Result: { title: string; priority: "low" | "medium" | "high"; dueDate?: string }
```

```tsx
// AddTodoForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { todoSchema, TodoFormData } from "../schemas/todoSchema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function AddTodoForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: "",
      priority: "medium",
    },
  });

  const onSubmit = (data: TodoFormData) => {
    console.log("Valid data:", data);
    // addTodo(data.title, data.priority);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          {...register("title")}
          placeholder="What needs doing?"
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <select {...register("priority")} className="w-full rounded-md border p-2">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {errors.priority && (
          <p className="text-sm text-destructive mt-1">{errors.priority.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add Todo"}
      </Button>
    </form>
  );
}
```

### Exercise

Build a validated "Add Todo" form:
1. Create a Zod schema with: `title` (min 3 chars, max 100), `priority` (enum: low/medium/high), `dueDate` (optional string)
2. Use `z.infer` to generate the TypeScript type
3. Build the form with `useForm` and `zodResolver`
4. Display inline error messages below each field
5. Clear the form after successful submission
6. Disable the submit button while submitting

---

## Lesson 13: Building the Todo App

**Topic**: Full CRUD, filters, priorities -- the complete Todo application.

**Duration**: 120 minutes (2 hours)

### Teaching Approach

**Analogy**: "This is your graduation project for Phase 1. You have learnt individual notes -- now you are playing a whole song. Every concept from Lessons 04-12 comes together here."

**Live Coding Tips**:
- Plan on the whiteboard FIRST. Draw the component tree: App > TodoProvider > [Header, AddTodoForm, FilterBar, TodoList > TodoItem]. Students should see the full architecture before writing a single line.
- Build incrementally. Start with the context and basic add/display. Then add toggle. Then delete. Then edit. Then filters. Then styling. Commit after each feature (show git workflow).
- Do NOT copy-paste from previous lessons. Rebuild from scratch with students. Repetition is how they learn.

**Common Confusion Points**:
- Filtering -- students will try to filter the state array directly. Explain: "Never modify your source of truth. Filter creates a NEW array for display. The original stays intact."
- Edit mode -- toggling between display and edit for a todo item. Use local state (`isEditing`) within the TodoItem component.
- Students will want to over-engineer. Keep them focused: "We are building a Todo app, not a project management platform."

### Key Concepts

- Planning a full application (component tree, data flow)
- Context with full CRUD (Create, Read, Update, Delete)
- Filtering without mutating state
- Local vs global state decisions
- Edit mode with inline editing
- Priority system with visual indicators (Badge colours)
- Responsive layout
- Production build (`npm run build`)

### Code Patterns

```tsx
// Complete TodoContext with all operations
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  createdAt: Date;
}

interface TodoContextType {
  todos: Todo[];
  addTodo: (title: string, priority: Todo["priority"]) => void;
  toggleTodo: (id: number) => void;
  deleteTodo: (id: number) => void;
  editTodo: (id: number, title: string) => void;
  filter: "all" | "active" | "completed";
  setFilter: (filter: "all" | "active" | "completed") => void;
  filteredTodos: Todo[];
}
```

```tsx
// Filter logic inside provider
const filteredTodos = useMemo(() => {
  switch (filter) {
    case "active":
      return todos.filter((t) => !t.completed);
    case "completed":
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
}, [todos, filter]);
```

```tsx
// FilterBar component
function FilterBar() {
  const { filter, setFilter, todos } = useTodoContext();

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  return (
    <div className="flex gap-2">
      {(["all", "active", "completed"] as const).map((f) => (
        <Button
          key={f}
          variant={filter === f ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter(f)}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
        </Button>
      ))}
    </div>
  );
}
```

### Exercise

Build the complete Todo app from scratch with:
1. `TodoContext` with add, toggle, delete, and edit operations
2. `AddTodoForm` with React Hook Form + Zod validation
3. `TodoList` displaying todos with shadcn Card, Checkbox, Badge
4. `FilterBar` with All/Active/Completed filters
5. `Header` with app title and statistics
6. Inline editing (double-click a todo to edit its title)
7. Priority badges with colour coding
8. Responsive design with Tailwind
9. Run `npm run build` and verify no errors

---

# Phase 2: Backend + Integration (Lessons 14-17)

---

## Lesson 14: Express.js Introduction

**Topic**: REST APIs, routes, middleware, CORS.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "Express is like a receptionist at a hotel. Guests (HTTP requests) arrive and say what they want: 'I need a room' (GET /rooms), 'I want to book' (POST /bookings), 'Cancel my reservation' (DELETE /bookings/123). The receptionist routes each request to the right department and sends back a response."

**REST Analogy**: "REST is a set of rules for how the receptionist works. GET means 'show me.' POST means 'create something new.' PUT means 'replace this entirely.' PATCH means 'update just this part.' DELETE means 'remove this.' The URL tells you WHAT, the method tells you HOW."

**Live Coding Tips**:
- Start a server in 5 lines of code. Students should see "Server running on port 3000" within 2 minutes of starting the lesson.
- Use Postman or Thunder Client (VS Code extension) to send requests. The browser can only do GET easily -- students need a tool for POST/PUT/DELETE.
- Show middleware by adding a simple logger: `app.use((req, res, next) => { console.log(req.method, req.url); next(); })`. Every request now logs. This makes the concept tangible.
- Explain CORS by trying to call the API from the React app and getting blocked. Then add `cors()` and show it working. The error-first approach makes CORS memorable.

**Common Confusion Points**:
- `req.body` is `undefined` without `express.json()` middleware. Students will always hit this. Show the error, then add the middleware.
- Forgetting to call `next()` in middleware -- the request hangs forever.
- Route order matters. A catch-all route before specific routes will swallow everything.
- Status codes -- students will send 200 for everything. Teach: 200 = OK, 201 = Created, 400 = Bad Request, 404 = Not Found, 500 = Server Error.

### Key Concepts

- What Express.js is and how HTTP works
- Creating a server: `express()`, `app.listen()`
- Route handlers: `app.get()`, `app.post()`, `app.put()`, `app.delete()`
- Route parameters: `/todos/:id`
- Request object: `req.params`, `req.body`, `req.query`
- Response object: `res.json()`, `res.status()`
- Middleware: `app.use()`, `next()`
- Built-in middleware: `express.json()`
- CORS: what it is and `cors()` middleware
- HTTP status codes

### Code Patterns

```bash
# Project setup
mkdir todo-backend && cd todo-backend
npm init -y
npm install express cors
npm install -D typescript @types/express @types/cors @types/node ts-node nodemon
npx tsc --init
```

```json
// tsconfig.json key settings
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

```typescript
// src/index.ts -- basic Express server
import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// In-memory storage (temporary -- database comes next lesson)
interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

let todos: Todo[] = [];

// Routes
app.get("/api/todos", (req, res) => {
  res.json(todos);
});

app.post("/api/todos", (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  const newTodo: Todo = { id: Date.now(), title, completed: false };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.put("/api/todos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }
  Object.assign(todo, req.body);
  res.json(todo);
});

app.delete("/api/todos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  todos = todos.filter((t) => t.id !== id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

```json
// package.json scripts
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Exercise

Build a basic Express server with:
1. GET `/api/todos` -- returns all todos
2. POST `/api/todos` -- creates a new todo (validate that title exists)
3. PUT `/api/todos/:id` -- updates a todo (return 404 if not found)
4. DELETE `/api/todos/:id` -- deletes a todo
5. A logging middleware that prints the method and URL of every request
6. Proper status codes for each response
7. Test all endpoints using Postman or Thunder Client

---

## Lesson 15: MongoDB & Mongoose

**Topic**: Document databases, schemas, models, CRUD operations, MongoDB Atlas.

**Duration**: 90 minutes

### Teaching Approach

**Analogy -- Documents vs Rows**: "In a spreadsheet (SQL), every row must have the same columns. In MongoDB, each document is like a page in a notebook -- it can have different information on each page. One room listing might have a parking field, another might not. MongoDB does not care."

**Analogy -- Schema is Blueprint, Model is Factory**: "A Mongoose Schema is like an architect's blueprint -- it defines what a building SHOULD look like. A Mongoose Model is like the construction factory that uses that blueprint to BUILD actual buildings (documents). You design once, build many."

**Live Coding Tips**:
- Set up MongoDB Atlas FIRST (free tier). Walk through the Atlas dashboard together. This takes 10-15 minutes but avoids local MongoDB installation headaches.
- Show the connection string and explain each part: `mongodb+srv://username:password@cluster.mongodb.net/database`
- Store the connection string in `.env` from day one. Teach `dotenv` immediately.
- Create a simple schema, save a document, then open Atlas Data Explorer to show students their data in the cloud. This is a powerful "it actually worked" moment.
- Show the difference between `find()`, `findOne()`, `findById()`, `findByIdAndUpdate()`, and `findByIdAndDelete()`.

**Common Confusion Points**:
- Collections vs tables -- "Collections are just groups of documents. Unlike SQL tables, documents in the same collection do not need to have the same fields."
- `_id` vs `id` -- MongoDB uses `_id` (with underscore). Mongoose adds a virtual `id` getter. Students will get confused. Standardise early.
- Async/await -- every Mongoose operation is asynchronous. Students will forget `await` and get back a Promise object instead of data.
- Connection timing -- the app must connect to MongoDB BEFORE starting the Express server. Show the pattern of `mongoose.connect().then(() => app.listen())`.

### Key Concepts

- What MongoDB is (document database, NoSQL)
- Documents, collections, databases
- MongoDB Atlas setup (free tier)
- Mongoose: ODM (Object Document Mapper)
- Schemas: field types, required, default, enum
- Models: creating from schemas
- CRUD: `create()`, `find()`, `findById()`, `findByIdAndUpdate()`, `findByIdAndDelete()`
- Connection with `mongoose.connect()`
- Environment variables with `dotenv`
- Timestamps (`createdAt`, `updatedAt`)

### Code Patterns

```bash
# Install dependencies
npm install mongoose dotenv
npm install -D @types/mongoose
```

```
# .env file (NEVER commit this)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todo-app
PORT=3001
```

```typescript
// src/config/database.ts
import mongoose from "mongoose";

export async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}
```

```typescript
// src/models/Todo.ts
import mongoose, { Schema, Document } from "mongoose";

// TypeScript interface for the document
export interface ITodo extends Document {
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
}

// Schema -- the blueprint
const todoSchema = new Schema<ITodo>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title must be under 100 characters"],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  {
    timestamps: true, // auto-adds createdAt and updatedAt
  }
);

// Model -- the factory
const Todo = mongoose.model<ITodo>("Todo", todoSchema);

export default Todo;
```

```typescript
// CRUD operations -- demonstrate in a test file or controller
import Todo from "../models/Todo";

// Create
const newTodo = await Todo.create({
  title: "Learn MongoDB",
  priority: "high",
});

// Read all
const allTodos = await Todo.find();

// Read with filter
const activeTodos = await Todo.find({ completed: false });

// Read one by ID
const singleTodo = await Todo.findById("64abc123...");

// Update
const updated = await Todo.findByIdAndUpdate(
  "64abc123...",
  { completed: true },
  { new: true, runValidators: true } // return updated doc, run schema validation
);

// Delete
await Todo.findByIdAndDelete("64abc123...");
```

### Exercise

1. Set up a free MongoDB Atlas cluster
2. Create a `.env` file with the connection string
3. Create a `Todo` model with fields: `title`, `completed`, `priority`
4. Write a test script that:
   - Connects to MongoDB
   - Creates 3 todos
   - Finds all todos and logs them
   - Updates one todo's completion status
   - Deletes one todo
   - Disconnects
5. Verify the data in Atlas Data Explorer

---

## Lesson 16: Building the Todo API

**Topic**: Express + Mongoose, controllers, routes, validation.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "We are connecting the receptionist (Express) to the database filing cabinet (MongoDB). Before, the receptionist was writing notes on a napkin (in-memory array). Now, everything is properly filed and permanent."

**Live Coding Tips**:
- Start by replacing the in-memory array from Lesson 14 with Mongoose operations. Students see the same API, now backed by real data.
- Structure the code properly: separate files for routes, controllers, and models. Show students why: "When your app grows, having everything in one file becomes unmanageable."
- Add error handling with try/catch in every controller. Show what happens without it: the server crashes on one bad request.
- Test every endpoint as you build it. Do not wait until the end.

**Common Confusion Points**:
- Async controller functions -- every controller that talks to MongoDB must be `async` and use `await`.
- Validation errors from Mongoose vs application logic errors -- show how to catch Mongoose validation errors and return proper 400 responses.
- `findByIdAndUpdate` options: `{ new: true }` returns the updated document (not the old one). Students will be confused when they update but get back the old data.

### Key Concepts

- Project structure: routes/, controllers/, models/
- Controller pattern: extract logic from route handlers
- Async error handling with try/catch
- Mongoose validation in API responses
- Query parameters for filtering: `?completed=true&priority=high`
- Sorting: `?sort=-createdAt`
- Proper REST responses (correct status codes and response bodies)

### Code Patterns

```
// Project structure
backend/
├── src/
│   ├── index.ts            # Entry point
│   ├── config/
│   │   └── database.ts     # MongoDB connection
│   ├── models/
│   │   └── Todo.ts         # Mongoose model
│   ├── controllers/
│   │   └── todoController.ts
│   └── routes/
│       └── todoRoutes.ts
├── .env
├── package.json
└── tsconfig.json
```

```typescript
// src/controllers/todoController.ts
import { Request, Response } from "express";
import Todo from "../models/Todo";

export const getAllTodos = async (req: Request, res: Response) => {
  try {
    const { completed, priority, sort } = req.query;

    const filter: Record<string, any> = {};
    if (completed !== undefined) filter.completed = completed === "true";
    if (priority) filter.priority = priority;

    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const todos = await Todo.find(filter).sort(sortOption);
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch todos" });
  }
};

export const createTodo = async (req: Request, res: Response) => {
  try {
    const todo = await Todo.create(req.body);
    res.status(201).json(todo);
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return res.status(400).json({ errors: messages });
    }
    res.status(500).json({ error: "Failed to create todo" });
  }
};

export const updateTodo = async (req: Request, res: Response) => {
  try {
    const todo = await Todo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!todo) return res.status(404).json({ error: "Todo not found" });
    res.json(todo);
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return res.status(400).json({ errors: messages });
    }
    res.status(500).json({ error: "Failed to update todo" });
  }
};

export const deleteTodo = async (req: Request, res: Response) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ error: "Todo not found" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete todo" });
  }
};
```

```typescript
// src/routes/todoRoutes.ts
import { Router } from "express";
import {
  getAllTodos, createTodo, updateTodo, deleteTodo,
} from "../controllers/todoController";

const router = Router();

router.get("/", getAllTodos);
router.post("/", createTodo);
router.put("/:id", updateTodo);
router.delete("/:id", deleteTodo);

export default router;
```

```typescript
// src/index.ts -- updated entry point
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database";
import todoRoutes from "./routes/todoRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/todos", todoRoutes);

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

### Exercise

Build the complete Todo API with proper structure:
1. Create the folder structure: models/, controllers/, routes/
2. Implement all four CRUD endpoints with Mongoose
3. Add filtering by `completed` and `priority` via query parameters
4. Handle Mongoose validation errors with proper 400 responses
5. Handle "not found" with 404 responses
6. Test every endpoint with Postman, including edge cases (missing title, invalid ID, non-existent todo)

---

## Lesson 17: Axios & React Query

**Topic**: Axios instance, useQuery, useMutation, cache invalidation, replacing fetch.

**Duration**: 90 minutes

### Teaching Approach

**Analogy -- React Query**: "React Query is like a server state manager. You already know Context API manages your frontend state. React Query does the same thing but for data that lives on the server. It handles fetching, caching, refetching, loading states, and error states -- all the tedious stuff you would otherwise write by hand."

**Analogy -- Cache Invalidation**: "Imagine a bulletin board (cache) with the latest room listings. When someone adds a new room, you do not re-fetch every listing -- you just tell the board: 'The rooms list is outdated, refresh it.' That is cache invalidation."

**Live Coding Tips**:
- Start by showing the raw `fetch` approach: loading state, error state, data state, `useEffect`, cleanup. It is verbose and error-prone. Let students feel the pain.
- Then install React Query and Axios. Rebuild the same functionality. The code reduction is dramatic.
- Show React Query DevTools -- they are invaluable for understanding caching. Open them, show the cache entries, show how invalidation triggers refetch.
- Build an axios instance with a base URL. Show how all API calls become clean one-liners.

**Common Confusion Points**:
- `useQuery` vs `useMutation` -- queries are for reading (GET), mutations are for writing (POST/PUT/DELETE). Students will try to use `useQuery` for everything.
- Query keys -- the array that identifies a query. `["todos"]` and `["todos", { filter: "active" }]` are different queries. React Query caches based on keys.
- `onSuccess` / `onSettled` callbacks in mutations -- where to trigger cache invalidation.
- `enabled` option -- queries run automatically by default. Use `enabled: false` to prevent automatic fetching.

### Key Concepts

- Why Axios over fetch (interceptors, base URL, automatic JSON, error handling)
- Axios instance with base URL and defaults
- React Query setup: `QueryClient`, `QueryClientProvider`
- `useQuery` for data fetching: `queryKey`, `queryFn`, `isLoading`, `isError`, `data`
- `useMutation` for data modification: `mutationFn`, `onSuccess`
- Cache invalidation: `queryClient.invalidateQueries()`
- Optimistic updates (brief intro)
- Loading and error states in UI
- React Query DevTools

### Code Patterns

```bash
# Install dependencies
npm install axios @tanstack/react-query @tanstack/react-query-devtools
```

```typescript
// src/lib/axios.ts -- configured instance
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
```

```tsx
// src/main.tsx -- QueryClient setup
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

```typescript
// src/hooks/useTodos.ts -- custom hooks wrapping React Query
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";

interface Todo {
  _id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

// Fetch all todos
export function useTodos(filter?: string) {
  return useQuery({
    queryKey: ["todos", filter],
    queryFn: async () => {
      const params = filter && filter !== "all" ? { completed: filter === "completed" } : {};
      const { data } = await api.get<Todo[]>("/todos", { params });
      return data;
    },
  });
}

// Create a todo
export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTodo: { title: string; priority: string }) => {
      const { data } = await api.post<Todo>("/todos", newTodo);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

// Toggle todo completion
export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data } = await api.put<Todo>(`/todos/${id}`, { completed });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

// Delete a todo
export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
```

```tsx
// src/components/TodoList.tsx -- using the hooks
import { useTodos, useToggleTodo, useDeleteTodo } from "../hooks/useTodos";

function TodoList({ filter }: { filter: string }) {
  const { data: todos, isLoading, isError, error } = useTodos(filter);
  const toggleMutation = useToggleTodo();
  const deleteMutation = useDeleteTodo();

  if (isLoading) return <p>Loading todos...</p>;
  if (isError) return <p className="text-destructive">Error: {error.message}</p>;

  return (
    <div className="space-y-2">
      {todos?.map((todo) => (
        <Card key={todo._id}>
          <CardContent className="flex items-center gap-3 p-4">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() =>
                toggleMutation.mutate({
                  id: todo._id,
                  completed: !todo.completed,
                })
              }
              disabled={toggleMutation.isPending}
            />
            <span className="flex-1">{todo.title}</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(todo._id)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Exercise

Replace the Context-based Todo app with React Query:
1. Create an axios instance with a base URL
2. Set up `QueryClientProvider` in `main.tsx`
3. Create custom hooks: `useTodos`, `useCreateTodo`, `useToggleTodo`, `useDeleteTodo`
4. Replace all Context usage with React Query hooks
5. Add loading spinners and error messages
6. Enable React Query DevTools and inspect the cache
7. Test: create a todo, see it appear without manual refetch (cache invalidation at work)

---

# Phase 3: Booking App Build (Lessons 18-27)

---

## Lesson 18: React Router

**Topic**: BrowserRouter, Routes, Link, useParams, nested routes, layouts, 404 pages.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "React Router is like a building directory. When you walk into a shopping centre, you look at the directory board to find which floor each shop is on. React Router does the same for your app -- it maps URLs to components. `/rooms` shows the rooms page, `/rooms/123` shows a specific room, `/login` shows the login form."

**Live Coding Tips**:
- Start with a simple app with no routing. Show that the URL never changes. "Right now our app is like a building with one room. React Router gives us multiple rooms."
- Add React Router with just two routes first. Click a `<Link>` and watch the URL change WITHOUT a page reload. This is the key difference from traditional websites.
- Show `useParams` by creating a dynamic route: `/rooms/:id`. Log the params. Students see how the URL becomes data.
- Build a layout with a persistent navbar using nested routes and `<Outlet />`.

**Common Confusion Points**:
- `<Link>` vs `<a>` -- `<a>` causes a full page reload. `<Link>` does client-side navigation. This is the most important distinction.
- Nested routes and `<Outlet />` -- think of it as a picture frame. The layout is the frame, the `<Outlet>` is where different pictures (pages) are displayed.
- `useNavigate` vs `<Link>` -- `useNavigate` is for programmatic navigation (e.g., after form submission). `<Link>` is for clickable UI navigation.
- The 404 catch-all route must be LAST. Route matching is sequential.

### Key Concepts

- `BrowserRouter`, `Routes`, `Route`
- `Link` and `NavLink` (active styling)
- Route parameters: `/rooms/:id` and `useParams()`
- Nested routes and `Outlet`
- Layout routes (persistent navbar/sidebar)
- Programmatic navigation: `useNavigate()`
- 404 catch-all: `<Route path="*" element={<NotFound />} />`
- `useLocation` for reading current path

### Code Patterns

```bash
npm install react-router-dom
```

```tsx
// src/App.tsx -- route configuration
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="rooms/:id" element={<RoomDetail />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

```tsx
// src/components/Layout.tsx -- persistent layout with Outlet
import { Outlet, Link, NavLink } from "react-router-dom";

function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b bg-background">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <Link to="/" className="text-xl font-bold">BookMyRoom</Link>
          <div className="flex gap-4">
            <NavLink
              to="/rooms"
              className={({ isActive }) =>
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              }
            >
              Rooms
            </NavLink>
            <NavLink to="/login" className={({ isActive }) =>
              isActive ? "text-primary font-medium" : "text-muted-foreground"
            }>
              Login
            </NavLink>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4">
        <Outlet /> {/* Child routes render here */}
      </main>

      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        BookMyRoom &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
```

```tsx
// src/pages/RoomDetail.tsx -- using route params
import { useParams, useNavigate } from "react-router-dom";

function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Later: useQuery to fetch room by id

  return (
    <div>
      <Button variant="outline" onClick={() => navigate("/rooms")}>
        Back to Rooms
      </Button>
      <h1>Room {id}</h1>
    </div>
  );
}
```

### Exercise

Set up routing for the BookMyRoom app:
1. Create page components: Home, Rooms, RoomDetail, Login, Register, NotFound
2. Create a Layout with navigation bar and footer
3. Configure routes with nested layout
4. Use `NavLink` with active styling in the nav
5. Create a dynamic route `/rooms/:id` and display the ID on the page
6. Add a 404 page for unknown routes
7. Add a "Book Now" button on RoomDetail that navigates programmatically to a booking page

---

## Lesson 19: Booking App Setup

**Topic**: Project structure, Mongoose models (User, Room, Booking), MongoDB connection.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "Before building a house, you need architectural drawings. Before building BookMyRoom, we need our data models. What does a User look like? What information does a Room have? What does a Booking contain? These models are our foundation -- everything else builds on top."

**Live Coding Tips**:
- Draw the data model relationships on a whiteboard FIRST. User has many Rooms (if owner). User has many Bookings. Room has many Bookings. A Booking references both a User and a Room.
- Create the backend folder structure together. Explain every folder's purpose.
- Build models one at a time. After each model, create a test document in Atlas to verify it works.
- Show Mongoose `ref` for relationships: "This is how MongoDB connects documents. Unlike SQL joins, Mongoose uses `populate()` to fill in referenced data."

**Common Confusion Points**:
- MongoDB relationships vs SQL foreign keys -- MongoDB uses references (`ref`) and `populate()`, not JOINs. The reference stores just the `_id`.
- `enum` in Mongoose schemas -- students will misspell enum values and get cryptic errors. Show the error, explain it.
- `timestamps: true` -- remind students this automatically adds `createdAt` and `updatedAt`. No need to define them manually.

### Key Concepts

- Project folder structure for a full-stack app
- Mongoose model design for related data
- User model: name, email, password, role (user/owner)
- Room model: name, description, capacity, price, amenities, images, owner (ref)
- Booking model: room (ref), user (ref), date, timeSlot, status
- References between models using `mongoose.Schema.Types.ObjectId`
- The `ref` property and `populate()` concept
- Environment variables for database connection

### Code Patterns

```
// Backend project structure
backend/
├── src/
│   ├── index.ts
│   ├── config/
│   │   └── database.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Room.ts
│   │   └── Booking.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── roomController.ts
│   │   └── bookingController.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── roomRoutes.ts
│   │   └── bookingRoutes.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── upload.ts
│   └── utils/
│       └── helpers.ts
├── uploads/           # Room images
├── .env
├── package.json
└── tsconfig.json
```

```typescript
// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "owner";
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["user", "owner"],
      default: "user",
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);
```

```typescript
// src/models/Room.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IRoom extends Document {
  name: string;
  description: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  images: string[];
  location: string;
  owner: mongoose.Types.ObjectId;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    pricePerHour: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    amenities: [{ type: String }],
    images: [{ type: String }],
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IRoom>("Room", roomSchema);
```

```typescript
// src/models/Booking.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  room: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentMethod: "esewa" | "cod";
  paymentStatus: "unpaid" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: [true, "Booking date is required"],
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["esewa", "cod"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IBooking>("Booking", bookingSchema);
```

### Exercise

Set up the BookMyRoom backend:
1. Create the full folder structure
2. Set up MongoDB Atlas connection with `.env`
3. Build all three models: User, Room, Booking
4. Add proper validation to every field
5. Verify each model by creating a test document via a temporary script
6. Draw the relationship diagram showing how models reference each other

---

## Lesson 20: Auth Backend

**Topic**: bcrypt password hashing, JWT tokens, auth middleware, role-based access (owner/user).

**Duration**: 120 minutes (2 hours)

### Teaching Approach

**Analogy -- Password Hashing**: "bcrypt is like a one-way meat grinder. You put in a password ('mypassword123') and get out a hash ('$2b$10$xyz...'). You can never reverse the grinder to get the original meat back. When someone logs in, you grind their password attempt and compare the two ground results."

**Analogy -- JWT**: "A JWT is like a stamped wristband at a concert. When you enter (login), security stamps your wrist. For the rest of the night, you just show your wristband to access any area -- you do not need to show your ID again. The wristband has your name and access level encoded in it. It expires when the concert ends."

**Live Coding Tips**:
- Show password storage WITHOUT hashing first. Log the stored password. Ask: "If someone hacks our database, what do they see?" Then add bcrypt. Log the hash. "Now what do they see?"
- Decode a JWT at jwt.io to show students the three parts: header, payload, signature. "The payload is readable by anyone. The signature proves it was not tampered with."
- Build the auth middleware step by step. First, just check if the header exists. Then verify the token. Then attach the user to `req`. Show the progression.
- Test with Postman: register, copy the token, add it to the Authorization header, access a protected route.

**Common Confusion Points**:
- `bcrypt.hash` vs `bcrypt.compare` -- hash when saving, compare when verifying. Students will try to hash the login password and compare strings directly (this fails because bcrypt salts are random).
- JWT expiry -- tokens expire. Students will get "jwt expired" errors and not understand why. Show how to set and handle expiry.
- Middleware order -- auth middleware must come BEFORE the route handlers that need protection.
- `req.user` does not exist by default. The auth middleware creates it. If students skip the middleware, `req.user` is undefined.

### Key Concepts

- Why we hash passwords (never store plain text)
- bcrypt: `hash()`, `compare()`, salt rounds
- JWT: `sign()`, `verify()`, payload, expiry
- Auth flow: Register -> hash password -> save. Login -> compare password -> issue JWT.
- Auth middleware: extract token from header, verify, attach user to request
- Role-based access: `owner` can create rooms, `user` can book rooms
- Protected routes vs public routes
- Error handling for auth (401 Unauthorised, 403 Forbidden)

### Code Patterns

```bash
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

```typescript
// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};
```

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Role-based middleware
export const authorise = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not authorised for this action" });
    }
    next();
  };
};
```

```typescript
// src/routes/authRoutes.ts
import { Router } from "express";
import { register, login } from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/login", login);

export default router;

// Usage in protected routes:
// router.post("/rooms", authenticate, authorise("owner"), createRoom);
```

### Exercise

Build the complete auth system:
1. Implement register endpoint with bcrypt password hashing
2. Implement login endpoint with password comparison and JWT generation
3. Create auth middleware that verifies JWT tokens
4. Create role-based middleware (`authorise("owner")`)
5. Add a protected route: `GET /api/auth/me` that returns the current user's profile
6. Test the full flow in Postman: register -> login -> access protected route with token -> try without token (should fail)

---

## Lesson 21: Auth Frontend

**Topic**: AuthContext, axios interceptors, login/register forms, protected routes.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "AuthContext is like a security badge system. When you log in, you get a badge (token) stored in your pocket (localStorage). Every time you enter a secure area (make an API request), the interceptor automatically shows your badge. If your badge expires or is missing, you are redirected to the reception desk (login page)."

**Live Coding Tips**:
- Build the AuthContext first. Store token in localStorage for persistence across page refreshes.
- Show the axios interceptor: "This automatically attaches the token to EVERY request. You never need to manually add headers."
- Build the login form with React Hook Form + Zod (reuse skills from Lesson 12). Show the full flow: fill form -> submit -> receive token -> redirect to dashboard.
- Create a `ProtectedRoute` wrapper component. Try accessing `/dashboard` without logging in -- redirect to login. Log in -- access granted.

**Common Confusion Points**:
- localStorage vs state -- "State is lost on page refresh. localStorage persists. We store the token in BOTH: localStorage for persistence, state for reactivity."
- Axios interceptors -- students will not understand why requests suddenly have tokens. Show the interceptor code, add a `console.log` inside it, and watch it fire on every request.
- Protected routes -- wrapping routes with a guard component. Students often forget the redirect.

### Key Concepts

- AuthContext: user state, login/logout/register functions
- Token storage in localStorage
- Axios request interceptor for automatic token attachment
- Axios response interceptor for 401 handling (auto-logout)
- Login and Register forms with validation
- ProtectedRoute component
- Redirect after login/logout
- Loading state during auth check

### Code Patterns

```tsx
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "owner";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: "user" | "owner";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check token validity on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    navigate(data.user.role === "owner" ? "/dashboard" : "/rooms");
  };

  const register = async (registerData: RegisterData) => {
    const { data } = await api.post("/auth/register", registerData);
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    navigate(data.user.role === "owner" ? "/dashboard" : "/rooms");
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

```tsx
// src/lib/axios.ts -- with interceptors
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
});

// Request interceptor -- attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor -- handle 401 (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "user" | "owner";
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
```

```tsx
// Route usage with protection
<Route
  path="/dashboard"
  element={
    <ProtectedRoute requiredRole="owner">
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Exercise

Build the complete auth frontend:
1. Create `AuthContext` with login, register, and logout
2. Set up axios interceptors for automatic token handling
3. Build a Login page with email/password form (React Hook Form + Zod)
4. Build a Register page with name, email, password, and role selection
5. Create a `ProtectedRoute` component
6. Protect the dashboard route (owner only) and bookings route (any authenticated user)
7. Update the navbar to show Login/Register when logged out, and user name + Logout when logged in

---

## Lesson 22: Rooms Backend + File Uploads

**Topic**: Room CRUD API, Multer setup, image upload, static file serving, pagination/filters.

**Duration**: 120 minutes (2 hours)

### Teaching Approach

**Analogy -- Multer**: "Multer is the bouncer that checks files before letting them into your server. You tell the bouncer: only let in images (no .exe files!), maximum 5MB each, store them in the 'uploads' folder. The bouncer handles all the messy work of receiving the file from the browser."

**Live Coding Tips**:
- Start with text-only Room CRUD (no images). Get it working and tested first. Then add Multer for image uploads as a second step. Do not introduce everything at once.
- Show Multer configuration step by step. Explain `diskStorage`, `fileFilter`, and `limits` individually.
- Test file upload with Postman -- switch to "form-data" mode, add a file field. Students need to see this workflow.
- Add pagination: `?page=1&limit=10`. Show how to calculate `skip` and return pagination metadata.

**Common Confusion Points**:
- `multipart/form-data` vs `application/json` -- when uploading files, the Content-Type changes. Multer handles this, but students need to understand why the request looks different.
- File paths -- uploaded files are stored on the server's filesystem. The API must serve them as static files. `app.use("/uploads", express.static("uploads"))`.
- Pagination math -- `skip = (page - 1) * limit`. Walk through with concrete numbers: page 2, limit 10 = skip 10, take 10.

### Key Concepts

- Room CRUD endpoints (owner-only for create/update/delete)
- Multer configuration: storage, file filter, size limits
- Handling `multipart/form-data` requests
- Serving static files: `express.static()`
- Image URL construction in API responses
- Pagination: `page`, `limit`, `skip`, `totalPages`
- Filtering: by location, capacity, price range, amenities
- Search: text search on room name/description

### Code Patterns

```bash
npm install multer
npm install -D @types/multer
```

```typescript
// src/middleware/upload.ts
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/rooms");
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueName}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
  }
};

export const uploadRoomImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).array("images", 5); // max 5 images
```

```typescript
// src/controllers/roomController.ts
import { Request, Response } from "express";
import Room from "../models/Room";

export const createRoom = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const images = files?.map((file) => `/uploads/rooms/${file.filename}`) || [];

    const room = await Room.create({
      ...req.body,
      amenities: JSON.parse(req.body.amenities || "[]"),
      images,
      owner: req.user!.id,
    });

    res.status(201).json(room);
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return res.status(400).json({ errors: messages });
    }
    res.status(500).json({ error: "Failed to create room" });
  }
};

export const getRooms = async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "10",
      location,
      minCapacity,
      maxPrice,
      search,
    } = req.query;

    const filter: Record<string, any> = { isAvailable: true };
    if (location) filter.location = { $regex: location, $options: "i" };
    if (minCapacity) filter.capacity = { $gte: parseInt(minCapacity as string) };
    if (maxPrice) filter.pricePerHour = { $lte: parseInt(maxPrice as string) };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate("owner", "name email")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Room.countDocuments(filter),
    ]);

    res.json({
      rooms,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
};
```

```typescript
// src/routes/roomRoutes.ts
import { Router } from "express";
import { authenticate, authorise } from "../middleware/auth";
import { uploadRoomImages } from "../middleware/upload";
import {
  createRoom, getRooms, getRoomById, updateRoom, deleteRoom,
} from "../controllers/roomController";

const router = Router();

router.get("/", getRooms);                    // Public
router.get("/:id", getRoomById);              // Public
router.post("/", authenticate, authorise("owner"), uploadRoomImages, createRoom);
router.put("/:id", authenticate, authorise("owner"), uploadRoomImages, updateRoom);
router.delete("/:id", authenticate, authorise("owner"), deleteRoom);

export default router;
```

```typescript
// src/index.ts -- serve static uploads
import path from "path";

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
```

### Exercise

Build the Rooms API:
1. Create all Room CRUD endpoints
2. Configure Multer for image uploads (JPEG/PNG/WebP, max 5MB, max 5 images)
3. Serve uploaded images as static files
4. Add pagination to the GET /rooms endpoint
5. Add filtering by location, minimum capacity, and maximum price
6. Add text search on room name and description
7. Ensure only owners can create, update, and delete rooms
8. Test all endpoints with Postman, including file upload

---

## Lesson 23: Owner Portal Frontend

**Topic**: Room management UI, FormData uploads, image preview, useMutation.

**Duration**: 120 minutes (2 hours)

### Teaching Approach

**Analogy**: "The Owner Portal is like a landlord's control panel. Landlords need to list their properties, upload photos, edit details, and see who has booked. Regular users never see this -- it is behind the 'owner' role check."

**Live Coding Tips**:
- Build the room creation form first. Start with text fields only. Get it working with React Query mutation. Then add the file upload.
- Show `FormData` -- explain that when uploading files, we cannot use plain JSON. "FormData is like a special envelope that can carry both text AND files."
- Add image preview before upload: read files with `URL.createObjectURL()`. Students love seeing the preview appear instantly.
- Show the owner's room list with edit and delete buttons. Use `useMutation` for delete with a confirmation dialog.

**Common Confusion Points**:
- `FormData` vs JSON -- when using FormData, do NOT set Content-Type header. The browser sets it automatically with the correct boundary.
- Image preview with `URL.createObjectURL` -- remember to call `URL.revokeObjectURL` to prevent memory leaks (mention, but do not over-emphasise for beginners).
- File input `accept` attribute -- use it to restrict file picker to images: `accept="image/jpeg,image/png,image/webp"`.

### Key Concepts

- Owner-only dashboard layout
- Room creation form with image upload
- `FormData` for multipart requests
- Image preview before upload using `URL.createObjectURL`
- `useMutation` for create, update, delete operations
- Optimistic UI updates (brief intro)
- Room listing with edit/delete actions
- Form pre-population for editing

### Code Patterns

```tsx
// src/hooks/useRooms.ts -- owner room hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";

export function useOwnerRooms() {
  return useQuery({
    queryKey: ["owner-rooms"],
    queryFn: async () => {
      const { data } = await api.get("/rooms/my-rooms");
      return data;
    },
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post("/rooms", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-rooms"] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-rooms"] });
    },
  });
}
```

```tsx
// src/pages/owner/CreateRoom.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateRoom } from "../../hooks/useRooms";

const roomSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  capacity: z.coerce.number().min(1),
  pricePerHour: z.coerce.number().min(0),
  location: z.string().min(3),
  amenities: z.string(), // comma-separated, parsed before submission
});

type RoomFormData = z.infer<typeof roomSchema>;

function CreateRoom() {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const createRoom = useCreateRoom();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);

    // Generate previews
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
  };

  const onSubmit = (data: RoomFormData) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("capacity", data.capacity.toString());
    formData.append("pricePerHour", data.pricePerHour.toString());
    formData.append("location", data.location);
    formData.append("amenities", JSON.stringify(data.amenities.split(",").map((a) => a.trim())));

    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    createRoom.mutate(formData, {
      onSuccess: () => {
        reset();
        setImageFiles([]);
        setPreviews([]);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div>
        <Input {...register("name")} placeholder="Room name" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* ... other fields ... */}

      <div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleImageChange}
          className="block w-full text-sm"
        />
        {previews.length > 0 && (
          <div className="flex gap-2 mt-2">
            {previews.map((url, i) => (
              <img key={i} src={url} alt="Preview" className="w-20 h-20 object-cover rounded" />
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={createRoom.isPending}>
        {createRoom.isPending ? "Creating..." : "Create Room"}
      </Button>
    </form>
  );
}
```

### Exercise

Build the Owner Portal:
1. Create a dashboard page showing the owner's rooms in a grid
2. Build a "Create Room" form with all fields + image upload + previews
3. Add delete functionality with a confirmation dialog (shadcn AlertDialog)
4. Build an "Edit Room" page that pre-populates the form with existing data
5. Show room statistics: total rooms, total bookings, revenue (placeholder data for now)
6. Ensure the entire section is protected with `ProtectedRoute requiredRole="owner"`

---

## Lesson 24: Room Browsing

**Topic**: Room listing grid, filter sidebar, search, room detail page, responsive design.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "This is the shopfront. The Owner Portal is the back office. Now we are building what customers see when they visit BookMyRoom -- a clean, searchable directory of available rooms."

**Live Coding Tips**:
- Start with a simple grid of room cards. Get data fetching working first.
- Add filters one at a time: location dropdown, capacity slider, price range. Each filter updates the query parameters, which triggers a React Query refetch.
- Build the room detail page with all information, image gallery, and a "Book Now" button.
- Show responsive design in action: resize the browser. The grid should collapse from 3 columns to 2 to 1.

**Common Confusion Points**:
- URL query params as filter state -- use `useSearchParams` from React Router to sync filters with the URL. This enables sharing filtered URLs and browser back/forward navigation.
- Debounced search -- typing in the search box should not fire an API request on every keystroke. Introduce a simple debounce with `setTimeout`.

### Key Concepts

- Room listing with grid layout
- Server-side filtering via query parameters
- Search with debounce
- `useSearchParams` for URL-based filter state
- Room detail page with `useParams`
- Image gallery/carousel
- Responsive grid: 1 column mobile, 2 tablet, 3 desktop
- Loading skeletons for better UX
- Empty state: "No rooms found" with suggestions

### Code Patterns

```tsx
// src/hooks/useRoomBrowsing.ts
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "../lib/axios";

export function useRoomBrowsing() {
  const [searchParams] = useSearchParams();

  const filters = {
    page: searchParams.get("page") || "1",
    search: searchParams.get("search") || "",
    location: searchParams.get("location") || "",
    minCapacity: searchParams.get("minCapacity") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  };

  return useQuery({
    queryKey: ["rooms", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "")
      );
      const { data } = await api.get("/rooms", { params });
      return data;
    },
  });
}
```

```tsx
// src/components/RoomCard.tsx
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RoomCardProps {
  room: {
    _id: string;
    name: string;
    location: string;
    capacity: number;
    pricePerHour: number;
    images: string[];
    amenities: string[];
  };
}

function RoomCard({ room }: RoomCardProps) {
  const imageUrl = room.images[0]
    ? `${import.meta.env.VITE_API_URL}${room.images[0]}`
    : "/placeholder-room.jpg";

  return (
    <Card className="overflow-hidden">
      <img
        src={imageUrl}
        alt={room.name}
        className="w-full h-48 object-cover"
      />
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold">{room.name}</h3>
        <p className="text-sm text-muted-foreground">{room.location}</p>
        <div className="flex gap-1 mt-2 flex-wrap">
          {room.amenities.slice(0, 3).map((a) => (
            <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-muted-foreground">
            Up to {room.capacity} people
          </span>
          <span className="text-lg font-bold">Rs. {room.pricePerHour}/hr</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link to={`/rooms/${room._id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

```tsx
// src/pages/Rooms.tsx -- with filter sidebar
function RoomsPage() {
  const { data, isLoading } = useRoomBrowsing();
  const [searchParams, setSearchParams] = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // reset to page 1 on filter change
    setSearchParams(params);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Filter Sidebar */}
      <aside className="w-full md:w-64 space-y-4">
        <Input
          placeholder="Search rooms..."
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => updateFilter("search", e.target.value)}
        />
        <Input
          type="number"
          placeholder="Min. capacity"
          onChange={(e) => updateFilter("minCapacity", e.target.value)}
        />
        <Input
          type="number"
          placeholder="Max. price/hr"
          onChange={(e) => updateFilter("maxPrice", e.target.value)}
        />
      </aside>

      {/* Room Grid */}
      <div className="flex-1">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.rooms.map((room: any) => (
              <RoomCard key={room._id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Exercise

Build the public room browsing experience:
1. Create a `RoomCard` component with image, name, location, price, and amenities
2. Build the rooms listing page with a responsive grid
3. Add a filter sidebar with search, location, capacity, and price filters
4. Sync filters with URL search params
5. Add loading skeleton placeholders
6. Build the room detail page showing all information, image gallery, and a "Book Now" button
7. Handle empty state when no rooms match the filters

---

## Lesson 25: Booking System

**Topic**: Booking API (date conflict detection, populate), booking form, status flow (pending -> confirmed -> cancelled).

**Duration**: 120 minutes (2 hours)

### Teaching Approach

**Analogy**: "The booking system is like a restaurant reservation book. Before confirming a new reservation, the maitre d' checks the book: 'Is that table already taken at that time?' If yes, reject. If no, pencil it in as 'pending' until the customer confirms."

**Live Coding Tips**:
- Draw the booking status flow on the whiteboard: `pending -> confirmed -> cancelled`. Show which transitions are allowed. A cancelled booking cannot go back to pending.
- The most complex part is date conflict detection. Write the query step by step: "Find any existing booking where the room matches AND the date matches AND the time overlaps AND the status is not cancelled."
- Use `populate()` to show room name and user name in booking responses. Without it, students just see ObjectId strings.
- Build the booking form with a date picker and time slot selection.

**Common Confusion Points**:
- Date/time conflict logic -- this is algorithmically the hardest part of the project. Use concrete examples: "Booking A is 10:00-12:00. Can Booking B be 11:00-13:00? No, they overlap. Can Booking B be 12:00-14:00? Yes, they don't."
- `populate()` -- "This replaces the ObjectId with the actual document. Think of it as automatically looking up the reference."
- Status transitions -- not all transitions are valid. Only allow logical ones.

### Key Concepts

- Booking CRUD API
- Date/time conflict detection query
- `populate()` for joining referenced documents
- Booking status flow and valid transitions
- Booking form with date picker and time slots
- Price calculation based on duration
- User's booking history
- Owner's booking management (confirm/cancel)

### Code Patterns

```typescript
// src/controllers/bookingController.ts
import Booking from "../models/Booking";
import Room from "../models/Room";

export const createBooking = async (req: Request, res: Response) => {
  try {
    const { roomId, date, startTime, endTime, paymentMethod } = req.body;

    // Check room exists
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (!room.isAvailable) return res.status(400).json({ error: "Room is not available" });

    // Check for time conflicts
    const conflict = await Booking.findOne({
      room: roomId,
      date: new Date(date),
      status: { $ne: "cancelled" },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
    });

    if (conflict) {
      return res.status(409).json({
        error: "This time slot is already booked",
        conflictingBooking: {
          date: conflict.date,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        },
      });
    }

    // Calculate total price
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);
    const hours = endHour - startHour;
    const totalPrice = hours * room.pricePerHour;

    // Create booking
    const booking = await Booking.create({
      room: roomId,
      user: req.user!.id,
      date: new Date(date),
      startTime,
      endTime,
      totalPrice,
      paymentMethod,
      status: "pending",
    });

    // Populate room and user details
    const populatedBooking = await Booking.findById(booking._id)
      .populate("room", "name location pricePerHour")
      .populate("user", "name email");

    res.status(201).json(populatedBooking);
  } catch (error) {
    res.status(500).json({ error: "Failed to create booking" });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate("room", "owner");

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Only room owner can confirm, user or owner can cancel
    const isOwner = booking.room.owner.toString() === req.user!.id;
    const isBooker = booking.user.toString() === req.user!.id;

    if (status === "confirmed" && !isOwner) {
      return res.status(403).json({ error: "Only room owner can confirm bookings" });
    }

    if (status === "cancelled" && !isOwner && !isBooker) {
      return res.status(403).json({ error: "Not authorised to cancel this booking" });
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["cancelled"],
      cancelled: [],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot change status from '${booking.status}' to '${status}'`,
      });
    }

    booking.status = status;
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: "Failed to update booking" });
  }
};
```

```tsx
// src/pages/BookRoom.tsx -- booking form
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../lib/axios";

function BookRoom() {
  const { id: roomId } = useParams<{ id: string }>();
  const { data: room } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const { data } = await api.get(`/rooms/${roomId}`);
      return data;
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const { data } = await api.post("/bookings", bookingData);
      return data;
    },
  });

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00",
  ];

  const onSubmit = (data: any) => {
    const hours = parseInt(data.endTime) - parseInt(data.startTime);
    bookingMutation.mutate({
      roomId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      paymentMethod: data.paymentMethod,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book {room?.name}</CardTitle>
        <p className="text-muted-foreground">Rs. {room?.pricePerHour}/hour</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input type="date" {...register("date")} min={new Date().toISOString().split("T")[0]} />

          <div className="grid grid-cols-2 gap-4">
            <select {...register("startTime")}>
              {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select {...register("endTime")}>
              {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" value="esewa" {...register("paymentMethod")} />
              eSewa
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="cod" {...register("paymentMethod")} />
              Cash on Delivery
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={bookingMutation.isPending}>
            {bookingMutation.isPending ? "Booking..." : "Confirm Booking"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### Exercise

Build the complete booking system:
1. Create booking API with date/time conflict detection
2. Implement status transitions (pending -> confirmed -> cancelled)
3. Add `populate()` to show room and user details in responses
4. Build the booking form with date picker, time slot selection, and payment method
5. Show price calculation in real-time as user selects time slots
6. Build a "My Bookings" page showing the user's booking history with status badges
7. Build an owner view showing bookings for their rooms with confirm/cancel buttons

---

## Lesson 26: Payment Integration

**Topic**: eSewa simplified (HMAC-SHA256, redirect flow, verify) + COD, payment method selection.

**Duration**: 120 minutes (2 hours)

### Teaching Approach

**Walk-through-first approach**: "Before writing a single line of code, let us walk through the eSewa payment flow on the whiteboard. Understanding the flow is more important than the code."

**The eSewa Flow (draw this)**:
1. User clicks "Pay with eSewa" on our site
2. Our backend generates a signed payment form (HMAC-SHA256)
3. User is redirected to eSewa's payment page
4. User logs in to eSewa and confirms payment
5. eSewa redirects back to our site with a success/failure response
6. Our backend verifies the response with eSewa's API
7. If verified, mark booking as paid

**Live Coding Tips**:
- Build COD first -- it is trivial (just set paymentMethod to "cod" and status stays "pending"). This gives students a working payment path immediately.
- For eSewa, build the signature generation function in isolation first. Test it. Then integrate into the flow.
- Show the HMAC-SHA256 signing: "This is like a wax seal on a letter. It proves the payment request came from us and was not tampered with."
- Use eSewa's test/sandbox environment. Never use production credentials in class.

**Common Confusion Points**:
- The redirect flow -- students are used to AJAX requests. eSewa uses full page redirects. The user LEAVES your site, pays, and comes back. This is fundamentally different.
- HMAC-SHA256 -- do not dive deep into cryptography. Students need to know: "We create a signature using our secret key. eSewa verifies it matches. If someone changes the amount, the signature breaks."
- Success vs verification -- the redirect URL parameters can be faked. ALWAYS verify with eSewa's server before marking as paid.

### Key Concepts

- Payment flow: initiate -> redirect -> callback -> verify
- HMAC-SHA256 signature generation
- eSewa form data: `amount`, `tax_amount`, `total_amount`, `transaction_uuid`, `product_code`, `signed_field_names`, `signature`
- Redirect URLs: success and failure callbacks
- Server-side payment verification
- COD as alternative payment method
- Payment status tracking (unpaid/paid)
- Security: always verify server-side, never trust client

### Code Patterns

```bash
npm install crypto  # built into Node.js, no install needed
```

```typescript
// src/utils/esewa.ts
import crypto from "crypto";

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY!;
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";

interface EsewaPaymentData {
  amount: number;
  transactionUuid: string;
}

export function generateEsewaSignature(data: EsewaPaymentData): string {
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const signatureString = `total_amount=${data.amount},transaction_uuid=${data.transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;

  const signature = crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(signatureString)
    .digest("base64");

  return signature;
}

export function generateEsewaFormData(data: EsewaPaymentData) {
  const signature = generateEsewaSignature(data);

  return {
    amount: data.amount,
    tax_amount: 0,
    total_amount: data.amount,
    transaction_uuid: data.transactionUuid,
    product_code: ESEWA_PRODUCT_CODE,
    product_service_charge: 0,
    product_delivery_charge: 0,
    success_url: `${process.env.FRONTEND_URL}/payment/success`,
    failure_url: `${process.env.FRONTEND_URL}/payment/failure`,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature,
  };
}

export async function verifyEsewaPayment(encodedResponse: string): Promise<boolean> {
  try {
    const decodedData = JSON.parse(
      Buffer.from(encodedResponse, "base64").toString("utf-8")
    );

    // Verify the signature
    const signatureString = `total_amount=${decodedData.total_amount},transaction_uuid=${decodedData.transaction_uuid},product_code=${decodedData.product_code}`;
    const expectedSignature = crypto
      .createHmac("sha256", ESEWA_SECRET_KEY)
      .update(signatureString)
      .digest("base64");

    return expectedSignature === decodedData.signature;
  } catch {
    return false;
  }
}
```

```typescript
// src/controllers/paymentController.ts
import { Request, Response } from "express";
import Booking from "../models/Booking";
import { generateEsewaFormData, verifyEsewaPayment } from "../utils/esewa";

export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.user.toString() !== req.user!.id) {
      return res.status(403).json({ error: "Not your booking" });
    }

    if (booking.paymentMethod === "cod") {
      return res.json({ method: "cod", message: "Pay at venue" });
    }

    // Generate eSewa payment data
    const transactionUuid = `BMR-${booking._id}-${Date.now()}`;
    const esewaData = generateEsewaFormData({
      amount: booking.totalPrice,
      transactionUuid,
    });

    // Save transaction UUID to booking for later verification
    booking.transactionUuid = transactionUuid;
    await booking.save();

    res.json({
      method: "esewa",
      paymentUrl: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
      formData: esewaData,
    });
  } catch (error) {
    res.status(500).json({ error: "Payment initiation failed" });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { data: encodedResponse } = req.query;

    if (!encodedResponse) {
      return res.status(400).json({ error: "No payment data received" });
    }

    const isValid = await verifyEsewaPayment(encodedResponse as string);
    if (!isValid) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const decodedData = JSON.parse(
      Buffer.from(encodedResponse as string, "base64").toString("utf-8")
    );

    // Find booking by transaction UUID
    const booking = await Booking.findOne({
      transactionUuid: decodedData.transaction_uuid,
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    await booking.save();

    res.json({ message: "Payment verified successfully", booking });
  } catch (error) {
    res.status(500).json({ error: "Payment verification failed" });
  }
};
```

```tsx
// src/pages/PaymentPage.tsx -- frontend payment initiation
function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>();

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/payments/${bookingId}/initiate`);
      return data;
    },
    onSuccess: (data) => {
      if (data.method === "esewa") {
        // Create and submit a hidden form to eSewa
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.paymentUrl;

        Object.entries(data.formData).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      }
    },
  });

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={() => paymentMutation.mutate()} className="w-full">
          Pay with eSewa
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          You will be redirected to eSewa to complete payment
        </p>
      </CardContent>
    </Card>
  );
}
```

### Exercise

Implement the payment system:
1. Build the `generateEsewaSignature` function using HMAC-SHA256
2. Create the payment initiation endpoint
3. Create the payment verification endpoint
4. Build the frontend payment page with eSewa and COD options
5. Handle the eSewa success redirect: parse response, verify, update booking
6. Handle the failure redirect: display error message, offer retry
7. Test the full flow with eSewa's sandbox environment

---

## Lesson 27: Dashboard & Polish

**Topic**: MongoDB aggregation for stats, toast notifications, error boundaries, mobile navigation.

**Duration**: 120 minutes (2 hours)

### Teaching Approach

**Analogy -- Aggregation**: "MongoDB aggregation is like an assembly line in a factory. Raw materials (documents) enter one end, pass through stages (match, group, sort), and a finished product (statistics) comes out the other end. Each stage transforms the data a little more."

**Live Coding Tips**:
- Start with a simple aggregation: count all bookings grouped by status. Show the pipeline stages one at a time.
- Add toast notifications using shadcn's Sonner integration. Show success/error toasts after API mutations. "Toasts are like little post-it notes that pop up, tell you something, and disappear."
- Build an error boundary component. Deliberately throw an error inside a component to demonstrate the fallback UI.
- Show mobile navigation: hamburger menu that opens a sliding drawer.

**Common Confusion Points**:
- Aggregation pipeline stages -- the order matters. `$match` filters first, `$group` aggregates, `$sort` orders the results. Moving stages around changes the output.
- Error boundaries only catch rendering errors, not event handler errors or async errors. For those, use try/catch and toast notifications.

### Key Concepts

- MongoDB aggregation pipeline: `$match`, `$group`, `$sort`, `$project`
- Dashboard statistics: total revenue, booking counts, popular rooms
- Toast notifications (Sonner via shadcn)
- Error boundaries for graceful error handling
- Mobile-responsive navigation (hamburger menu, drawer)
- Final UI polish: consistent spacing, typography, colour usage
- Performance: React.lazy and Suspense for code splitting

### Code Patterns

```typescript
// src/controllers/dashboardController.ts
import Booking from "../models/Booking";
import Room from "../models/Room";

export const getOwnerStats = async (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.id;

    // Get owner's room IDs
    const ownerRooms = await Room.find({ owner: ownerId }).select("_id");
    const roomIds = ownerRooms.map((r) => r._id);

    // Aggregation pipeline for booking stats
    const stats = await Booking.aggregate([
      // Stage 1: Match bookings for owner's rooms
      { $match: { room: { $in: roomIds } } },

      // Stage 2: Group by status
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    // Revenue over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueByDay = await Booking.aggregate([
      {
        $match: {
          room: { $in: roomIds },
          status: "confirmed",
          paymentStatus: "paid",
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Most popular rooms
    const popularRooms = await Booking.aggregate([
      { $match: { room: { $in: roomIds }, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$room",
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "_id",
          as: "roomDetails",
        },
      },
      { $unwind: "$roomDetails" },
      {
        $project: {
          roomName: "$roomDetails.name",
          bookingCount: 1,
          totalRevenue: 1,
        },
      },
    ]);

    res.json({
      stats,
      revenueByDay,
      popularRooms,
      totalRooms: ownerRooms.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};
```

```bash
# Add toast notifications
npx shadcn@latest add sonner
```

```tsx
// src/main.tsx -- add Toaster
import { Toaster } from "@/components/ui/sonner";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
    <ReactQueryDevtools />
  </QueryClientProvider>
);
```

```tsx
// Using toast in mutations
import { toast } from "sonner";

const createRoom = useCreateRoom();

const onSubmit = (data: FormData) => {
  createRoom.mutate(data, {
    onSuccess: () => {
      toast.success("Room created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create room");
    },
  });
};
```

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">{this.state.error?.message}</p>
            <Button onClick={() => this.setState({ hasError: false })}>
              Try again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

```tsx
// Mobile navigation with Sheet (drawer)
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <nav className="flex flex-col gap-4 mt-8">
          <Link to="/" className="text-lg">Home</Link>
          <Link to="/rooms" className="text-lg">Rooms</Link>
          <Link to="/my-bookings" className="text-lg">My Bookings</Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

### Exercise

Add the final polish to BookMyRoom:
1. Build the owner dashboard with statistics from the aggregation API (total bookings, revenue, popular rooms)
2. Add toast notifications to all mutations (create, update, delete, booking, payment)
3. Add an ErrorBoundary wrapper around the main app content
4. Build a mobile hamburger menu with a sliding drawer
5. Review the entire app for:
   - Consistent spacing and typography
   - Loading states on all data fetches
   - Error states on all API calls
   - Responsive design on all pages
6. Run `npm run build` and fix any TypeScript or build errors

---

# Phase 4: Deployment (Lesson 28)

---

## Lesson 28: Deployment

**Topic**: npm run build, MongoDB Atlas production, deploy backend to Render, frontend to Vercel.

**Duration**: 90 minutes

### Teaching Approach

**Analogy**: "Development is like rehearsing a play. Deployment is opening night. The script (code) is the same, but now real people are watching. We need a proper stage (server), lighting (environment variables), and a ticket booth (domain)."

**Live Coding Tips**:
- Run `npm run build` on both frontend and backend. Fix any errors before deploying. "If it does not build locally, it will not build on the server."
- Set up MongoDB Atlas production cluster first. Show the difference between development and production credentials.
- Deploy the backend to Render step by step. Walk through environment variable configuration. Show the deploy logs.
- Deploy the frontend to Vercel. Show the build settings (framework preset: Vite). Set `VITE_API_URL` to the Render backend URL.
- Test the deployed application end-to-end. Register, log in, create a room, book it.

**Common Confusion Points**:
- Environment variables -- students will hardcode localhost URLs and wonder why the deployed app does not work. "Environment variables change between environments. Localhost is development. Your Render URL is production."
- CORS in production -- the frontend URL on Vercel must be whitelisted in the backend CORS config.
- Build output -- Vite builds to `dist/`, not `build/`. Render needs to know the correct build command and output directory.
- MongoDB Atlas network access -- the Atlas cluster must allow connections from Render's IP addresses. Use `0.0.0.0/0` for simplicity (or configure properly for production).

### Key Concepts

- Production build: `npm run build`
- Environment variables for different environments
- MongoDB Atlas production configuration
- Backend deployment to Render (free tier)
- Frontend deployment to Vercel
- CORS configuration for production domains
- Post-deployment testing
- Custom domain setup (brief overview)

### Code Patterns

```bash
# Frontend build
cd webapp
npm run build       # Outputs to dist/

# Backend build
cd backend
npm run build       # Compiles TypeScript to dist/
```

```typescript
// src/index.ts -- production-ready CORS
import cors from "cors";

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
```

```json
// Backend package.json -- scripts for Render
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

```
# Render environment variables
MONGODB_URI=mongodb+srv://prod-user:prod-password@cluster.mongodb.net/bookmyroom-prod
JWT_SECRET=your-production-secret-key-minimum-32-characters
FRONTEND_URL=https://bookmyroom.vercel.app
ESEWA_SECRET_KEY=your-esewa-production-key
ESEWA_PRODUCT_CODE=your-esewa-product-code
PORT=10000
NODE_ENV=production
```

```
# Vercel environment variables (via dashboard)
VITE_API_URL=https://bookmyroom-api.onrender.com/api
```

```
# .env.example -- commit this (not the real .env)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
ESEWA_SECRET_KEY=your-esewa-key
ESEWA_PRODUCT_CODE=EPAYTEST
PORT=3001
NODE_ENV=development
```

### Deployment Checklist

```markdown
## Pre-Deployment Checklist

### Backend
- [ ] `npm run build` succeeds with zero errors
- [ ] All environment variables documented in `.env.example`
- [ ] CORS configured for production frontend URL
- [ ] MongoDB Atlas production cluster created
- [ ] Atlas network access allows Render IPs (or 0.0.0.0/0)
- [ ] JWT_SECRET is a strong, unique production key
- [ ] `NODE_ENV=production` is set
- [ ] Error messages do not expose internal details in production
- [ ] Start script uses compiled JS: `node dist/index.js`

### Frontend
- [ ] `npm run build` succeeds with zero errors
- [ ] `VITE_API_URL` points to the production backend
- [ ] No hardcoded localhost URLs anywhere in the code
- [ ] All images and assets load correctly
- [ ] Responsive design works on mobile

### Post-Deployment
- [ ] Register a new user -- verify it works
- [ ] Log in -- verify JWT works
- [ ] Create a room (as owner) with images -- verify uploads work
- [ ] Browse rooms -- verify listing works
- [ ] Make a booking -- verify conflict detection works
- [ ] Test payment flow (eSewa sandbox or COD)
- [ ] Check mobile responsiveness on a real phone
- [ ] Verify error handling (try invalid inputs)
```

### Exercise

Deploy the complete BookMyRoom application:
1. Create a production MongoDB Atlas cluster with a dedicated database user
2. Run `npm run build` on both frontend and backend -- fix all errors
3. Deploy the backend to Render:
   - Connect your GitHub repository
   - Set all environment variables
   - Verify the deploy logs show successful build and start
4. Deploy the frontend to Vercel:
   - Connect your GitHub repository
   - Set `VITE_API_URL` to your Render backend URL
   - Verify the build succeeds
5. Test the deployed app end-to-end:
   - Register, login, create a room, browse rooms, make a booking
6. Share the live URL with your classmates

---

# Appendix: Quick Reference Tables

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 18+ | Component-based UI |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| UI Components | shadcn/ui | Pre-built component collection |
| Forms | React Hook Form + Zod | Validation and form state |
| Routing | React Router | Client-side navigation |
| Server State | React Query (TanStack) | API data management and caching |
| HTTP Client | Axios | API requests with interceptors |
| Backend | Express.js | REST API server |
| Database | MongoDB + Mongoose | Document database with ODM |
| Auth | bcrypt + JWT | Password hashing and token auth |
| File Uploads | Multer | Multipart form handling |
| Payments | eSewa + COD | Payment processing |
| Frontend Hosting | Vercel | Static site deployment |
| Backend Hosting | Render | Node.js server deployment |

## Lesson Duration Summary

| Lesson | Topic | Duration |
|--------|-------|----------|
| 04 | TypeScript Basics | 90 min |
| 05 | Node.js & Tooling | 60 min |
| 06 | React Introduction | 75 min |
| 07 | Components and JSX | 90 min |
| 08 | State and Props | 90 min |
| 09 | Context API | 75 min |
| 10 | Tailwind CSS | 60 min |
| 11 | shadcn/ui Components | 75 min |
| 12 | React Hook Form + Zod | 90 min |
| 13 | Building the Todo App | 120 min |
| 14 | Express.js Introduction | 90 min |
| 15 | MongoDB & Mongoose | 90 min |
| 16 | Building the Todo API | 90 min |
| 17 | Axios & React Query | 90 min |
| 18 | React Router | 90 min |
| 19 | Booking App Setup | 90 min |
| 20 | Auth Backend | 120 min |
| 21 | Auth Frontend | 90 min |
| 22 | Rooms Backend + File Uploads | 120 min |
| 23 | Owner Portal Frontend | 120 min |
| 24 | Room Browsing | 90 min |
| 25 | Booking System | 120 min |
| 26 | Payment Integration | 120 min |
| 27 | Dashboard & Polish | 120 min |
| 28 | Deployment | 90 min |
| **Total** | | **~38.5 hours** |

## Key Analogies Reference

| Concept | Analogy |
|---------|---------|
| TypeScript | Labelling every moving box |
| npm | App store for code |
| Vite | Kitchen that prepares ingredients |
| React Components | LEGO bricks / Recipe cards |
| Props | Ingredients in a recipe |
| State | Classroom whiteboard |
| Lifting State | Students telling the teacher |
| Context API | Loudspeaker vs passing notes |
| Tailwind CSS | Pre-made pantry ingredients |
| shadcn/ui | Custom suit vs off-the-rack |
| Zod | Bouncer at a club |
| React Hook Form | Smart clipboard |
| Express | Hotel receptionist |
| REST Methods | Show me / Create / Replace / Update / Remove |
| MongoDB Documents vs SQL Rows | Notebook pages vs spreadsheet rows |
| Mongoose Schema | Architect's blueprint |
| Mongoose Model | Construction factory |
| JWT | Concert wristband |
| bcrypt | One-way meat grinder |
| Multer | Bouncer checking files |
| React Query | Server state manager |
| Cache Invalidation | Outdated bulletin board |
| React Router | Shopping centre directory |
| Outlet | Picture frame |
| MongoDB Aggregation | Factory assembly line |
| Deployment | Opening night of a play |
