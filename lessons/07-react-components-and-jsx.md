# Lesson 7: React Components and JSX

## What You Will Learn
- Creating function components with TypeScript
- Defining interfaces for component props
- Importing and using components
- Passing typed data with props
- Rendering lists with typed `.map()` and the `key` prop
- Conditional rendering
- Sharing types across your project

---

## 7.1 What Are Components?

Components are the building blocks of React. Each component is a **function that returns JSX** - a piece of UI. With TypeScript, we also define the **shape** of the data each component expects.

**Rules for components:**
1. Component names must start with a **capital letter** (`TodoItem`, not `todoItem`)
2. Must return **JSX** (or `null`)
3. One component per file (best practice)
4. Define an **interface** for props so TypeScript can check your data

### Creating a Shared Types File

Before building components, create a central place for your types. This keeps things organised and avoids duplication.

```typescript
// src/types/todo.ts
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority?: "high" | "medium" | "low";
}
```

Any component that works with todos can import this interface. The `?` after `priority` means it is optional.

### Creating a Component

```tsx
// src/components/Header.tsx
interface HeaderProps {
  title: string;
  subtitle?: string;
}

function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </header>
  )
}

export default Header
```

The `HeaderProps` interface tells TypeScript exactly what data this component accepts. If you pass the wrong type, TypeScript will warn you before the code even runs.

### Using a Component

```tsx
// src/App.tsx
import Header from './components/Header'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Header title="My Todo App" subtitle="Stay organised and productive" />
    </div>
  )
}

export default App
```

Components are used like HTML tags: `<Header />`. The capital letter tells React it is a component, not an HTML element.

---

## 7.2 Organising Components

Create a `components` folder and a `types` folder inside `src/`:

```
src/
├── components/
│   ├── Header.tsx
│   ├── TodoItem.tsx
│   ├── TodoList.tsx
│   └── AddTodoForm.tsx
├── types/
│   └── todo.ts
├── App.tsx
├── main.tsx
└── index.css
```

Each component in its own file keeps code organised and reusable. The `types/` folder holds shared interfaces.

---

## 7.3 Props - Passing Data to Components

Props (short for "properties") are how you pass data from a **parent** component to a **child** component. Think of props like function arguments - but with TypeScript, we define their types.

### Defining and Passing Props

```tsx
// Parent component
function App() {
  return (
    <div>
      <Header title="My Todo App" subtitle="Stay productive" />
    </div>
  )
}
```

### Receiving Props with an Interface

```tsx
// Child component - props are typed with an interface
interface HeaderProps {
  title: string;
  subtitle?: string;
}

function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </header>
  )
}

export default Header
```

The `?` after `subtitle` means it is optional - the component works without it.

### Default Prop Values

```tsx
interface HeaderProps {
  title?: string;
  subtitle?: string;
}

function Header({ title = "Todo App", subtitle = "" }: HeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </header>
  )
}
```

### Props Can Be Anything (All Typed)

```tsx
// Strings
<TodoItem title="Learn React" />

// Numbers
<TodoItem priority={1} />

// Booleans
<TodoItem completed={true} />
<TodoItem completed />  {/* shorthand for true */}

// Arrays
<TodoList tasks={["Task 1", "Task 2"]} />

// Objects
<TodoItem task={{ id: 1, title: "Learn React", completed: false }} />

// Functions
<TodoItem onDelete={() => console.log("deleted!")} />
```

Each of these would be defined in the component's props interface with its correct type.

---

## 7.4 Rendering Lists

In React, you render lists using the `.map()` array method. With TypeScript, you type the array so every item is validated.

### Basic List

```tsx
function TodoList() {
  const tasks: string[] = ["Learn HTML", "Learn CSS", "Learn JavaScript", "Learn React"];

  return (
    <ul className="space-y-2">
      {tasks.map((task: string, index: number) => (
        <li key={index} className="p-3 bg-white rounded-lg border">{task}</li>
      ))}
    </ul>
  )
}
```

### The `key` Prop

Every item in a list **must** have a unique `key` prop. This helps React track which items changed.

```tsx
import { Todo } from '../types/todo'

// BAD - using index as key (works but not ideal)
{tasks.map((task: string, index: number) => (
  <li key={index} className="p-3 bg-white rounded-lg border">{task}</li>
))}

// GOOD - using a unique ID from a typed object
{tasks.map((task: Todo) => (
  <li key={task.id} className="p-3 bg-white rounded-lg border">{task.title}</li>
))}
```

**Rule:** Use a unique identifier (like an `id` field) as the key. Only use the index as a last resort.

### List with Components

```tsx
// src/components/TodoItem.tsx
import { Todo } from '../types/todo'
import { Checkbox } from "@/components/ui/checkbox"

interface TodoItemProps {
  task: Todo;
}

function TodoItem({ task }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      <Checkbox checked={task.completed} />
      <span className={`flex-1 ${task.completed ? "line-through text-gray-400" : ""}`}>
        {task.title}
      </span>
    </li>
  )
}

export default TodoItem
```

```tsx
// src/components/TodoList.tsx
import { Todo } from '../types/todo'
import TodoItem from './TodoItem'

interface TodoListProps {
  tasks: Todo[];
}

function TodoList({ tasks }: TodoListProps) {
  return (
    <ul className="space-y-2">
      {tasks.map((task: Todo) => (
        <TodoItem key={task.id} task={task} />
      ))}
    </ul>
  )
}

export default TodoList
```

```tsx
// src/App.tsx
import { Todo } from './types/todo'
import Header from './components/Header'
import TodoList from './components/TodoList'

function App() {
  const tasks: Todo[] = [
    { id: 1, title: "Learn HTML", completed: true },
    { id: 2, title: "Learn CSS", completed: true },
    { id: 3, title: "Learn JavaScript", completed: false },
    { id: 4, title: "Learn React", completed: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Header title="My Todo App" />
      <TodoList tasks={tasks} />
    </div>
  )
}

export default App
```

Because `tasks` is typed as `Todo[]`, TypeScript will catch mistakes like a missing `id` or a `completed` value that is not a boolean.

---

## 7.5 Conditional Rendering

Sometimes you want to show or hide elements based on conditions.

### Using && (AND operator)

Shows the element only if the condition is true:

```tsx
import { Todo } from '../types/todo'

interface TodoItemProps {
  task: Todo;
}

function TodoItem({ task }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      <span className="flex-1">{task.title}</span>
      {task.completed && (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Done</span>
      )}
    </li>
  )
}
```

### Using Ternary Operator

Choose between two elements:

```tsx
import { Todo } from '../types/todo'

interface TodoItemProps {
  task: Todo;
}

function TodoItem({ task }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      <span className={`flex-1 ${task.completed ? "line-through text-gray-400" : ""}`}>
        {task.title}
      </span>
      {task.completed ? (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Completed</span>
      ) : (
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Pending</span>
      )}
    </li>
  )
}
```

### Early Return

Return different JSX based on a condition:

```tsx
import { Todo } from '../types/todo'
import TodoItem from './TodoItem'

interface TodoListProps {
  tasks: Todo[];
}

function TodoList({ tasks }: TodoListProps) {
  if (tasks.length === 0) {
    return <p className="text-center text-gray-500 py-8">No tasks yet. Add one above!</p>
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task: Todo) => (
        <TodoItem key={task.id} task={task} />
      ))}
    </ul>
  )
}
```

---

## 7.6 Typed .map() and .filter()

TypeScript shines when you work with arrays. Because the array is typed, every callback parameter is automatically typed too.

### Typed .filter()

```tsx
import { Todo } from './types/todo'

const tasks: Todo[] = [
  { id: 1, title: "Learn HTML", completed: true },
  { id: 2, title: "Learn CSS", completed: true },
  { id: 3, title: "Learn JavaScript", completed: false },
  { id: 4, title: "Learn React", completed: false },
];

// TypeScript knows 'task' is a Todo - no need to annotate the callback
const activeTasks: Todo[] = tasks.filter((task) => !task.completed);
const completedTasks: Todo[] = tasks.filter((task) => task.completed);
```

### Typed .map()

```tsx
// Transform todos into a list of titles
const titles: string[] = tasks.map((task) => task.title);

// Transform todos into JSX elements
const listItems: JSX.Element[] = tasks.map((task) => (
  <li key={task.id} className="p-3 bg-white rounded-lg border">{task.title}</li>
));
```

Because `tasks` is `Todo[]`, TypeScript already knows each `task` is a `Todo`. You get full autocomplete on `task.id`, `task.title`, `task.completed`, and `task.priority`.

---

## 7.7 Putting It All Together

Let us build the component structure for our Todo app with full TypeScript types:

**`src/types/todo.ts`**
```typescript
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority?: "high" | "medium" | "low";
}
```

**`src/components/Header.tsx`**
```tsx
interface HeaderProps {
  title: string;
  taskCount?: number;
  completedCount?: number;
}

function Header({ title, taskCount = 0, completedCount = 0 }: HeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">
        {taskCount} tasks | {completedCount} completed
      </p>
    </header>
  )
}

export default Header
```

**`src/components/TodoItem.tsx`**
```tsx
import { Todo } from '../types/todo'
import { Checkbox } from "@/components/ui/checkbox"

interface TodoItemProps {
  task: Todo;
}

function TodoItem({ task }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 p-3 bg-white rounded-lg border">
      <Checkbox checked={task.completed} />
      <span className={`flex-1 ${task.completed ? "line-through text-gray-400" : ""}`}>
        {task.title}
      </span>
      {task.priority === "high" && (
        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">High</span>
      )}
    </li>
  )
}

export default TodoItem
```

**`src/components/TodoList.tsx`**
```tsx
import { Todo } from '../types/todo'
import TodoItem from './TodoItem'

interface TodoListProps {
  tasks: Todo[];
}

function TodoList({ tasks }: TodoListProps) {
  if (tasks.length === 0) {
    return <p className="text-center text-gray-500 py-8">No tasks yet!</p>
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task: Todo) => (
        <TodoItem key={task.id} task={task} />
      ))}
    </ul>
  )
}

export default TodoList
```

**`src/App.tsx`**
```tsx
import { Todo } from './types/todo'
import Header from './components/Header'
import TodoList from './components/TodoList'

function App() {
  const tasks: Todo[] = [
    { id: 1, title: "Learn HTML", completed: true, priority: "high" },
    { id: 2, title: "Learn CSS", completed: true, priority: "medium" },
    { id: 3, title: "Learn JavaScript", completed: false, priority: "high" },
    { id: 4, title: "Learn React", completed: false, priority: "medium" },
  ];

  const completedCount: number = tasks.filter((t: Todo) => t.completed).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-lg mx-auto">
      <Header
        title="My Todo App"
        taskCount={tasks.length}
        completedCount={completedCount}
      />
      <TodoList tasks={tasks} />
    </div>
  )
}

export default App
```

---

## Practice Exercises

### Exercise 1: Create Typed Components
Break the following into separate components: `Header`, `TodoItem`, `TodoList`, `Footer`. Each in its own `.tsx` file in `src/components/`. Define a props interface for each one.

### Exercise 2: Props Practice
Create a `UserCard` component with this interface:
```typescript
interface UserCardProps {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}
```
Display them with appropriate styling. Use it in App to show 3 different users.

### Exercise 3: List Rendering with Types
Given this typed data:
```typescript
interface Course {
  id: number;
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  enrolled: boolean;
}

const courses: Course[] = [
  { id: 1, name: "HTML Basics", level: "beginner", enrolled: true },
  { id: 2, name: "CSS Flexbox", level: "beginner", enrolled: true },
  { id: 3, name: "JavaScript ES6", level: "intermediate", enrolled: false },
  { id: 4, name: "React Fundamentals", level: "intermediate", enrolled: false },
];
```
Create a `CourseList` component that renders each course, shows the level as a badge, and shows "Enrolled" or "Enrol Now" based on the `enrolled` property. Define a `CourseItemProps` interface for the child component.

---

## Key Takeaways
1. **Components** are functions that return JSX - one per file, capital letter name
2. **Interfaces** define the shape of props - TypeScript catches mistakes at compile time
3. Create a **shared types file** (`src/types/todo.ts`) so all components use the same definitions
4. **Props** pass data from parent to child - destructure them and type them with an interface
5. Use typed `.map()` with a unique **`key`** prop to render lists
6. Use typed `.filter()` to select subsets of your data
7. **Conditional rendering**: use `&&` for show/hide, ternary for either/or, early return for completely different output
8. Break your UI into small, reusable, **well-typed** components
