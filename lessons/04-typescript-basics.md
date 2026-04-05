# Lesson 4: TypeScript Basics

## What You Will Learn
- What TypeScript is and why it exists
- Setting up TypeScript
- Type annotations for variables
- Typing functions
- Interfaces and type aliases
- Arrays and objects with types
- Union types and optional properties
- Generics basics
- TypeScript with React preview (typed props, useState)

---

## 4.1 What is TypeScript?

TypeScript is JavaScript with **types**. It catches errors **before** you run the code, the same way a spell-checker catches mistakes before you send an email. Without it, you only discover bugs when your code crashes in the browser. With TypeScript, your editor underlines the problem the moment you type it.

### How It Works

TypeScript files use the `.ts` extension (or `.tsx` for React components). You write TypeScript, and a **compiler** converts it into plain JavaScript. Browsers and Node.js only ever run JavaScript - they never see your type annotations. Think of it as writing in pencil (TypeScript) and then submitting the final copy in ink (JavaScript). The pencil marks helped you get it right, but they do not appear in the finished document.

```
You write:   greeting.ts   (TypeScript)
Compiler:    tsc greeting.ts
Output:      greeting.js   (JavaScript - this is what runs)
```

### Why Bother?

Consider this JavaScript function from Lesson 3:

```js
function add(a, b) {
    return a + b;
}

add(5, "3"); // "53" - string concatenation, not addition!
```

JavaScript happily runs this and gives you `"53"` instead of `8`. No warning, no error. In a real application, bugs like this waste hours of debugging.

TypeScript prevents it entirely:

```typescript
function add(a: number, b: number): number {
    return a + b;
}

add(5, "3"); // Error: Argument of type 'string' is not assignable to parameter of type 'number'
```

The error appears in your editor **before you even save the file**. That is the value of TypeScript.

---

## 4.2 Setting Up TypeScript

You do not need to set up TypeScript manually for this course. When we create our React project with Vite later (Lesson 6+), it comes with TypeScript ready to go. But here is how it works under the hood:

### Installing TypeScript

```bash
# Install globally (for trying things out)
npm install -g typescript

# Check version
tsc --version
```

### Compiling a File

```bash
# Create a file called hello.ts
# Then compile it
tsc hello.ts
# This creates hello.js
```

### Trying TypeScript Online

The easiest way to experiment right now is the **TypeScript Playground**: [typescriptlang.org/play](https://www.typescriptlang.org/play). No installation needed - just type code and see the results.

---

## 4.3 Basic Type Annotations

A type annotation tells TypeScript what kind of value a variable holds. You add it after the variable name with a colon:

```typescript
const name: string = "Prabin";
const age: number = 25;
const isStudent: boolean = true;
const items: string[] = ["HTML", "CSS", "JS"];
const count: number[] = [1, 2, 3];
```

### The Core Types

| Type | Description | Examples |
|------|-------------|----------|
| `string` | Text | `"hello"`, `'world'`, `` `template` `` |
| `number` | Integers and decimals | `42`, `3.14`, `-10` |
| `boolean` | True or false | `true`, `false` |
| `string[]` | Array of strings | `["a", "b", "c"]` |
| `number[]` | Array of numbers | `[1, 2, 3]` |
| `null` | Intentionally empty | `null` |
| `undefined` | Not yet assigned | `undefined` |
| `any` | Opt out of type checking | Avoid this - defeats the purpose |

### Type Inference

TypeScript is clever. If you assign a value immediately, it can **infer** the type without you writing it:

```typescript
// You write this:
const name = "Prabin";

// TypeScript already knows it is a string.
// Hovering over 'name' in your editor shows: const name: string

// This would still cause an error:
// name = 42; // Error: Type 'number' is not assignable to type 'string'
```

### When to Annotate Explicitly

**Let TypeScript infer** when the type is obvious from the value:

```typescript
// Inference is enough here - the type is obvious
const title = "Learn TypeScript";
const taskCount = 0;
const isComplete = false;
```

**Annotate explicitly** when the type is not obvious, or when you declare a variable without an immediate value:

```typescript
// No initial value - TypeScript cannot infer
let currentFilter: string;
currentFilter = "all";

// Function parameters - always annotate these
function greet(name: string) {
    return `Hello, ${name}!`;
}

// Complex types - makes your intent clear
const tasks: Todo[] = [];
```

---

## 4.4 Functions with Types

Functions need types for their **parameters** and their **return value**.

### Basic Function Types

```typescript
// Regular function with types
function greet(name: string): string {
    return `Hello, ${name}!`;
}

// Arrow function with types
const add = (a: number, b: number): number => a + b;

// void - the function does not return anything
const logMessage = (message: string): void => {
    console.log(message);
};
```

The pattern is: each parameter gets a type after a colon, and the return type goes after the closing parenthesis.

### Practical Examples with Our Todo App

```typescript
// Generate a unique ID
const generateId = (): number => {
    return Date.now();
};

// Format a task title for display
const formatTitle = (title: string, completed: boolean): string => {
    return completed ? `[Done] ${title}` : title;
};

// Count tasks by completion status
const countCompleted = (tasks: { completed: boolean }[]): number => {
    return tasks.filter(task => task.completed).length;
};
```

### Return Type Inference

TypeScript can usually infer the return type, so you do not always need to write it:

```typescript
// TypeScript knows this returns a string
const greet = (name: string) => `Hello, ${name}!`;

// TypeScript knows this returns a number
const add = (a: number, b: number) => a + b;
```

However, explicitly writing return types is good practice for **public functions** and **anything non-trivial** - it acts as documentation and catches mistakes if you accidentally return the wrong type.

---

## 4.5 Interfaces and Type Aliases

When you work with objects, you need a way to describe their **shape** - what properties they have and what types those properties are.

### Interfaces

An interface defines the structure of an object. Think of it as a **blueprint** - every object that uses this interface must have all the required properties with the correct types.

```typescript
interface Todo {
    id: number;
    title: string;
    completed: boolean;
    priority: "low" | "medium" | "high";
    description?: string; // optional - the ? means it can be missing
}
```

Now TypeScript will enforce this shape everywhere you use it:

```typescript
// This is valid - all required properties present
const task: Todo = {
    id: 1,
    title: "Learn TypeScript",
    completed: false,
    priority: "high",
};

// This is also valid - includes the optional description
const taskWithDesc: Todo = {
    id: 2,
    title: "Build Todo App",
    completed: false,
    priority: "medium",
    description: "Create a full-stack Todo application",
};

// This would cause an error - missing 'priority'
// const badTask: Todo = {
//     id: 3,
//     title: "Broken Task",
//     completed: false,
// };
// Error: Property 'priority' is missing in type

// This would also cause an error - wrong type for 'completed'
// const wrongType: Todo = {
//     id: 4,
//     title: "Wrong",
//     completed: "yes", // Error: Type 'string' is not assignable to type 'boolean'
//     priority: "low",
// };
```

### Optional Properties

The `?` after a property name makes it optional. The object is valid whether or not the property is present:

```typescript
interface Todo {
    id: number;
    title: string;
    completed: boolean;
    priority: "low" | "medium" | "high";
    description?: string;  // optional
    dueDate?: string;      // optional
}

// Both are valid:
const task1: Todo = { id: 1, title: "Task", completed: false, priority: "low" };
const task2: Todo = { id: 2, title: "Task", completed: false, priority: "low", dueDate: "2026-04-01" };
```

### Type Aliases

A **type alias** gives a name to any type. It works similarly to interfaces for objects, but can also name simpler types:

```typescript
// Type alias for a union of string values
type Priority = "low" | "medium" | "high";
type Status = "loading" | "success" | "error";

// Type alias for an object (similar to interface)
type TodoItem = {
    id: number;
    title: string;
    completed: boolean;
    priority: Priority; // reusing the Priority type
};

// Type alias for a function signature
type FilterFunction = (todo: TodoItem) => boolean;
```

### Interface vs Type - Which Should You Use?

For this course, use **interfaces for objects** and **type aliases for everything else**. This is the most common convention in React projects:

```typescript
// Use interface for object shapes
interface Todo {
    id: number;
    title: string;
    completed: boolean;
}

// Use type for unions, primitives, and function types
type Priority = "low" | "medium" | "high";
type TodoFilter = (todo: Todo) => boolean;
```

---

## 4.6 Arrays and Objects with Types

### Typed Arrays

There are two ways to write array types:

```typescript
// Style 1: type[] (preferred - more readable)
const names: string[] = ["Alice", "Bob", "Charlie"];
const scores: number[] = [85, 92, 78];
const flags: boolean[] = [true, false, true];

// Style 2: Array<type> (useful for complex types)
const names2: Array<string> = ["Alice", "Bob", "Charlie"];
```

### Arrays of Objects

This is where interfaces become powerful. Combine them with arrays and you get fully typed collections:

```typescript
interface Todo {
    id: number;
    title: string;
    completed: boolean;
    priority: "low" | "medium" | "high";
}

const todos: Todo[] = [
    { id: 1, title: "Learn TypeScript", completed: false, priority: "high" },
    { id: 2, title: "Build Todo App", completed: false, priority: "medium" },
    { id: 3, title: "Deploy to Vercel", completed: false, priority: "low" },
];
```

### Typed Array Methods

When TypeScript knows the type of your array, it automatically types the results of array methods:

```typescript
// TypeScript knows 'titles' is string[]
const titles: string[] = todos.map((todo: Todo): string => todo.title);

// TypeScript knows 'active' is Todo[]
const active: Todo[] = todos.filter((todo: Todo): boolean => !todo.completed);

// TypeScript knows 'found' is Todo | undefined
const found = todos.find((todo) => todo.id === 2);

// Because find() can return undefined, you must handle that:
if (found) {
    console.log(found.title); // safe - TypeScript knows 'found' is a Todo here
}
```

Note that you often do not need to annotate the callback parameters - TypeScript infers them from the array type:

```typescript
// These are equivalent - TypeScript infers the parameter types
const titles = todos.map((todo) => todo.title);
const active = todos.filter((todo) => !todo.completed);
```

---

## 4.7 Union Types

A union type allows a variable to hold one of several types. You write it with the `|` (pipe) symbol:

```typescript
// A variable that can be a string or a number
let id: string | number = "abc-123";
id = 456; // also valid
// id = true; // Error: Type 'boolean' is not assignable to type 'string | number'
```

### String Literal Unions

The most common use of unions in React apps is **string literal unions** - a fixed set of allowed values:

```typescript
type Priority = "low" | "medium" | "high";
type Status = "loading" | "success" | "error";
type Filter = "all" | "active" | "completed";

let currentFilter: Filter = "all";
currentFilter = "active";   // valid
// currentFilter = "done";  // Error: Type '"done"' is not assignable to type 'Filter'
```

This is enormously useful. Instead of accepting any string and hoping it is correct, TypeScript restricts the value to only the options you define.

### Using Unions in Functions

```typescript
type Filter = "all" | "active" | "completed";

const filterTodos = (todos: Todo[], filter: Filter): Todo[] => {
    switch (filter) {
        case "all":
            return todos;
        case "active":
            return todos.filter((todo) => !todo.completed);
        case "completed":
            return todos.filter((todo) => todo.completed);
    }
};
```

TypeScript even checks that your `switch` statement covers all possible cases. If you forget one, the editor warns you.

### Narrowing

When a variable has a union type, you need to **narrow** it before using type-specific operations:

```typescript
const formatId = (id: string | number): string => {
    if (typeof id === "string") {
        return id.toUpperCase(); // safe - TypeScript knows id is a string here
    }
    return id.toFixed(0); // safe - TypeScript knows id is a number here
};
```

---

## 4.8 Generics (Preview)

Generics let you write functions and types that work with **any type** whilst still keeping type safety. Think of a generic as a **placeholder type** that gets filled in when you use it.

### The Problem Generics Solve

Imagine you want a function that returns the first item from any array:

```typescript
// This only works for numbers
const getFirstNumber = (items: number[]): number => items[0];

// This only works for strings
const getFirstString = (items: string[]): string => items[0];

// Do we really need a separate function for every type?
```

### The Generic Solution

```typescript
// T is a placeholder - it means "whatever type you give me"
function getFirst<T>(items: T[]): T {
    return items[0];
}

// TypeScript fills in T based on what you pass:
const firstNumber = getFirst([1, 2, 3]);         // T is number, returns number
const firstString = getFirst(["a", "b", "c"]);   // T is string, returns string
const firstTodo = getFirst(todos);                // T is Todo, returns Todo

// You can also be explicit:
const firstNum = getFirst<number>([1, 2, 3]);     // explicitly number
```

### Why This Matters for React

You will see generics in React hooks like `useState`:

```typescript
// useState is a generic function
const [count, setCount] = useState<number>(0);
const [name, setName] = useState<string>("");
const [tasks, setTasks] = useState<Todo[]>([]);
```

The `<Todo[]>` tells `useState` that this state variable holds an array of `Todo` objects. Without it, TypeScript would not know the shape of the data.

You do not need to master generics right now. Just understand that `<T>` is a placeholder type, and you will see it used with React hooks.

---

## 4.9 TypeScript with React (Preview)

This is a preview of how everything you have learnt ties together in React. Do not worry about understanding React syntax yet - focus on where the **types** appear.

### Typed Props

React components receive data through **props**. With TypeScript, you define an interface for those props:

```tsx
// Define what props this component accepts
interface HeaderProps {
    title: string;
    taskCount: number;
    filter: "all" | "active" | "completed";
}

// Use the interface to type the props parameter
function Header({ title, taskCount, filter }: HeaderProps) {
    return (
        <header>
            <h1>{title} ({taskCount})</h1>
            <p>Showing: {filter}</p>
        </header>
    );
}

// Now TypeScript checks every usage:
// <Header title="My Todos" taskCount={5} filter="all" />     - valid
// <Header title="My Todos" taskCount="five" filter="all" />  - Error! taskCount must be number
// <Header title="My Todos" taskCount={5} />                  - Error! missing 'filter'
```

### Typed State

```tsx
interface Todo {
    id: number;
    title: string;
    completed: boolean;
    priority: "low" | "medium" | "high";
}

function TodoApp() {
    // Typed state - TypeScript knows exactly what shape the data is
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
    const [newTitle, setNewTitle] = useState<string>("");

    // Typed function
    const addTask = (title: string): void => {
        const newTask: Todo = {
            id: Date.now(),
            title,
            completed: false,
            priority: "medium",
        };
        setTasks([...tasks, newTask]);
    };

    const toggleTask = (id: number): void => {
        setTasks(
            tasks.map((task) =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        );
    };

    const deleteTask = (id: number): void => {
        setTasks(tasks.filter((task) => task.id !== id));
    };

    // ... component JSX would go here
}
```

### Typed Event Handlers

```tsx
// Form submission event
const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    addTask(newTitle);
    setNewTitle("");
};

// Input change event
const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setNewTitle(event.target.value);
};
```

You will learn all of this properly in the React lessons. The point here is to see how TypeScript types weave into every part of a React application, keeping your data predictable and your code safe.

---

## Practice Exercises

### Exercise 1: Convert JavaScript to TypeScript

Take these JavaScript functions from Lesson 3 and add proper type annotations:

```js
// Convert these to TypeScript:

function formatTask(task) {
    const status = task.completed ? "Done" : "Pending";
    return `${task.title} - ${status}`;
}

const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
};

const updateTask = (tasks, id, updates) => {
    return tasks.map(task =>
        task.id === id ? { ...task, ...updates } : task
    );
};
```

**Expected solution:**

```typescript
interface Todo {
    id: number;
    title: string;
    completed: boolean;
    priority: "low" | "medium" | "high";
    dueDate?: string;
}

function formatTask(task: Todo): string {
    const status = task.completed ? "Done" : "Pending";
    return `${task.title} - ${status}`;
}

const isOverdue = (dueDate: string): boolean => {
    return new Date(dueDate) < new Date();
};

const updateTask = (tasks: Todo[], id: number, updates: Partial<Todo>): Todo[] => {
    return tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
    );
};
```

(`Partial<Todo>` is a built-in TypeScript utility that makes all properties of `Todo` optional - perfect for partial updates.)

### Exercise 2: Create a Typed Todo System

Define the interface and create a typed array, then write functions to manipulate it:

```typescript
// 1. Define a Todo interface with: id, title, completed, priority, and optional description

// 2. Create an array of at least 3 todos

// 3. Write these typed functions:

// addTodo - takes a title and priority, returns a new Todo
const addTodo = (title: string, priority: "low" | "medium" | "high"): Todo => {
    // your code here
};

// toggleTodo - takes a Todo array and an id, returns a new array with that todo toggled
const toggleTodo = (todos: Todo[], id: number): Todo[] => {
    // your code here
};

// deleteTodo - takes a Todo array and an id, returns a new array without that todo
const deleteTodo = (todos: Todo[], id: number): Todo[] => {
    // your code here
};

// getFilteredTodos - takes a Todo array and a filter, returns filtered todos
const getFilteredTodos = (todos: Todo[], filter: "all" | "active" | "completed"): Todo[] => {
    // your code here
};
```

### Exercise 3: Type Challenges

Try these small challenges to test your understanding:

```typescript
// 1. What type should 'result' be?
const result = [1, 2, 3].map(n => n.toString());
// Answer: string[]

// 2. Fix the type error:
// const user: { name: string; age: number } = { name: "Prabin", age: "25" };

// 3. Create a type for an API response that can be loading, successful, or failed:
// Hint: use a union type with different shapes for each state

// 4. Write a generic function 'lastItem' that returns the last element of any array
```

---

## Key Takeaways

1. **TypeScript adds types to JavaScript** - it catches bugs at compile time, before your code runs
2. **Type annotations** tell TypeScript what type a variable or parameter should be (`name: string`)
3. **Type inference** means TypeScript can often figure out types automatically - you do not need to annotate everything
4. **Interfaces** define the shape of objects - what properties they have and their types
5. **Optional properties** use the `?` suffix (`description?: string`)
6. **Union types** allow multiple possible types (`"low" | "medium" | "high"`)
7. **Generics** let functions work with any type safely (`useState<Todo[]>`)
8. `.ts` for regular files, `.tsx` for React components
9. **TypeScript compiles to JavaScript** - the browser never sees your type annotations
10. When in doubt, let TypeScript infer. Annotate explicitly for function parameters, complex types, and empty initialisations
