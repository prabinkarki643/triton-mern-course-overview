# Lesson 8: React State and Props

## What You Will Learn
- What state is and why it matters
- The `useState` hook with TypeScript generics
- Typing event handlers
- Updating state correctly (immutability)
- Lifting state up with typed callback props
- Controlled inputs with typed events

---

## 8.1 What is State?

State is **data that changes over time** in your component. When state changes, React re-renders the component to show the updated data.

**Examples of state:**
- The list of todos (changes when you add/remove)
- Whether a todo is completed (changes when you tick it)
- The text in an input field (changes as you type)
- Whether a modal is open or closed

**Props vs State:**

| Props | State |
|-------|-------|
| Passed from parent | Owned by the component |
| Read-only (cannot change them) | Can be updated |
| Like function parameters | Like variables inside a function |

---

## 8.2 The useState Hook with TypeScript

`useState` is a React function (called a "hook") that adds state to your component. With TypeScript, we provide a **type parameter** so the state is properly typed.

### Basic Usage

```tsx
import { useState } from 'react'
import { Button } from "@/components/ui/button"

function Counter() {
  const [count, setCount] = useState<number>(0);

  return (
    <div className="space-y-4 p-6">
      <p className="text-2xl font-bold">Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </div>
  )
}
```

**Breaking it down:**

```tsx
const [count, setCount] = useState<number>(0);
//     ^       ^                  ^        ^
//     |       |                  |        |
//  current  function to      type      initial
//  value    update it     parameter    value
```

- `count` - the current state value (TypeScript knows it is a `number`)
- `setCount` - the function to update it (only accepts a `number`)
- `<number>` - the type parameter (tells TypeScript what type the state holds)
- `0` - the initial value (what `count` starts as)

### Multiple State Values

```tsx
import { useState } from 'react'
import { Todo } from '../types/todo'

function TodoApp() {
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");

  // ...
}
```

Each piece of state gets its own `useState` call with its own type parameter.

### When TypeScript Can Infer the Type

If the initial value makes the type obvious, TypeScript can infer it:

```tsx
// TypeScript infers number from the initial value 0
const [count, setCount] = useState(0);

// TypeScript infers string from the initial value ""
const [inputValue, setInputValue] = useState("");

// But for complex types, always be explicit:
const [tasks, setTasks] = useState<Todo[]>([]);
// Without <Todo[]>, TypeScript would infer never[] (an empty array of nothing)
```

**Rule of thumb:** Always provide the type parameter for arrays and objects. Simple primitives can be inferred.

---

## 8.3 Event Handling with TypeScript

React handles events similarly to HTML, but with camelCase naming. TypeScript adds **event types** so you know exactly what properties are available.

### Click Events

```tsx
import { Button } from "@/components/ui/button"

function App() {
  const handleClick = (): void => {
    console.log("Button clicked!");
  };

  return <Button onClick={handleClick}>Click Me</Button>
}
```

**Important:** Pass the function reference, do not call it:

```tsx
// CORRECT - passes the function
<Button onClick={handleClick}>

// WRONG - calls the function immediately on render
<Button onClick={handleClick()}>

// CORRECT - inline with arrow function (useful for passing arguments)
<Button onClick={() => handleDelete(task.id)}>
```

### Typed Event Handlers

```tsx
// Form submit - use React.FormEvent
const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
  event.preventDefault();
  console.log("Form submitted without page reload!");
};

// Input change - use React.ChangeEvent
const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
  setInputValue(event.target.value);
};

// Key press - use React.KeyboardEvent
const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
  if (event.key === "Enter") {
    console.log("Enter pressed!");
  }
};

// Focus/blur - use React.FocusEvent
const handleFocus = (event: React.FocusEvent<HTMLInputElement>): void => {
  console.log("Input focused");
};
```

### Common Events Summary

```tsx
// Click
<Button onClick={handleClick}>

// Form submit
<form onSubmit={handleSubmit}>

// Input change
<Input onChange={handleChange} />

// Key press
<Input onKeyDown={handleKeyDown} />

// Focus/blur
<Input onFocus={handleFocus} onBlur={handleBlur} />
```

---

## 8.4 Controlled Inputs

A **controlled input** is an input whose value is controlled by React state. This is the standard pattern in React.

```tsx
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function AddTodoForm() {
  const [inputValue, setInputValue] = useState<string>("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    console.log("New task:", inputValue);
    setInputValue(""); // clear the input
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={inputValue}
        onChange={handleChange}
        placeholder="Add a task..."
      />
      <Button type="submit">Add</Button>
    </form>
  )
}
```

**How it works:**
1. User types -> `onChange` fires -> `setInputValue` updates state
2. State changes -> component re-renders -> input shows new value
3. React is the **single source of truth** for the input value

---

## 8.5 Updating State Correctly

### Never Mutate State Directly

```tsx
// WRONG - mutating state directly
tasks.push(newTask);
setTasks(tasks); // React will not detect the change!

// CORRECT - create a new array
setTasks([...tasks, newTask]);
```

React only re-renders when it detects a **new** value. Mutating the existing array or object does not create a new reference, so React does not know anything changed.

### Adding to an Array

```tsx
import { Todo } from '../types/todo'

const addTask = (title: string): void => {
  const newTask: Todo = {
    id: Date.now(),
    title: title,
    completed: false,
  };
  setTasks([...tasks, newTask]);
};
```

### Removing from an Array

```tsx
const deleteTask = (id: number): void => {
  setTasks(tasks.filter((task: Todo) => task.id !== id));
};
```

### Updating an Item in an Array

```tsx
const toggleTask = (id: number): void => {
  setTasks(tasks.map((task: Todo) =>
    task.id === id
      ? { ...task, completed: !task.completed }
      : task
  ));
};
```

### Updating Based on Previous State

When the new state depends on the old state, use the **function form**:

```tsx
// Simple value - OK to reference directly
setCount(count + 1);

// But for safety with rapid updates, use the function form:
setCount((prevCount: number) => prevCount + 1);

// Array updates should use function form
setTasks((prevTasks: Todo[]) => [...prevTasks, newTask]);
```

---

## 8.6 Lifting State Up

When multiple components need the same state, move it to their **closest common parent**.

**Problem:** `AddTodoForm` needs to add tasks, and `TodoList` needs to display them. They are siblings - neither is inside the other.

**Solution:** Put the state in their parent (`App`) and pass it down via typed props.

```tsx
// src/App.tsx
import { useState } from 'react'
import { Todo } from './types/todo'
import Header from './components/Header'
import AddTodoForm from './components/AddTodoForm'
import TodoList from './components/TodoList'

function App() {
  const [tasks, setTasks] = useState<Todo[]>([
    { id: 1, title: "Learn HTML", completed: true },
    { id: 2, title: "Learn CSS", completed: true },
    { id: 3, title: "Learn JavaScript", completed: false },
  ]);

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

  const completedCount: number = tasks.filter((t: Todo) => t.completed).length;

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <Header
        title="My Todo App"
        taskCount={tasks.length}
        completedCount={completedCount}
      />
      <AddTodoForm onAdd={addTask} />
      <TodoList
        tasks={tasks}
        onToggle={toggleTask}
        onDelete={deleteTask}
      />
    </div>
  )
}

export default App
```

```tsx
// src/components/AddTodoForm.tsx
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AddTodoFormProps {
  onAdd: (title: string) => void;
}

function AddTodoForm({ onAdd }: AddTodoFormProps) {
  const [inputValue, setInputValue] = useState<string>("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (inputValue.trim() === "") return;
    onAdd(inputValue.trim());
    setInputValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface TodoItemProps {
  task: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

function TodoItem({ task, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 p-3 rounded-lg border">
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
      />
      <span className={task.completed ? "flex-1 line-through text-gray-400" : "flex-1"}>
        {task.title}
      </span>
      <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)}>
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
import TodoItem from './TodoItem'

interface TodoListProps {
  tasks: Todo[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

function TodoList({ tasks, onToggle, onDelete }: TodoListProps) {
  if (tasks.length === 0) {
    return <p className="text-gray-500 text-center py-4">No tasks yet. Add one above!</p>
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task: Todo) => (
        <TodoItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

export default TodoList
```

### Data Flow Diagram

```
       App (owns state: tasks)
      / |  \
     /  |   \
    v   v    v
Header  AddTodoForm  TodoList
(reads) (calls onAdd)  (reads + passes down)
                          v
                      TodoItem
                   (calls onToggle, onDelete)
```

**Data flows DOWN** through typed props. **Actions flow UP** through typed callback functions.

---

## Practice Exercises

### Exercise 1: Counter Component
Build a counter with full TypeScript types:
- `useState<number>(0)` for the count
- Display of current count
- Increment button (+1)
- Decrement button (-1)
- Reset button (back to 0)
- The count should never go below 0

### Exercise 2: Interactive Todo
Build the full Todo app from section 8.6:
1. Create `src/types/todo.ts` with the `Todo` interface
2. Add tasks via the form with typed event handlers
3. Toggle completion with checkboxes
4. Delete tasks with a button
5. Show task count and completed count in the header
6. Clear the input after adding

### Exercise 3: Filter Tasks
Add filter buttons to the Todo app:
- "All" - shows all tasks
- "Active" - shows only incomplete tasks
- "Completed" - shows only completed tasks

Hint: Add a `const [filter, setFilter] = useState<string>("all")` state and use typed `.filter()` on `tasks` before passing to `TodoList`.

---

## Key Takeaways
1. **State** is data that changes - use `useState<Type>()` to create it with a type parameter
2. `useState` returns `[value, setValue]` - always use the setter, never mutate directly
3. **Type your event handlers**: `React.FormEvent`, `React.ChangeEvent`, `React.KeyboardEvent`
4. **Type your callback props**: `onAdd: (title: string) => void`
5. Always call `event.preventDefault()` on form submissions
6. **Controlled inputs**: the input's value is driven by typed state
7. **Never mutate** arrays or objects - create new ones with spread
8. **Lift state up** to the closest common parent when siblings need shared data
9. Data flows **down** via typed props, actions flow **up** via typed callback functions
