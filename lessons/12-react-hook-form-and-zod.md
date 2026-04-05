# Lesson 12: React Hook Form and Zod

## What You Will Learn
- Why use a form library instead of manual state management
- Creating validation schemas with Zod
- Deriving TypeScript types from Zod schemas with `z.infer`
- Using React Hook Form with the typed `useForm` hook
- Connecting Zod to React Hook Form
- Displaying validation errors
- Building a validated Todo input form

---

## 12.1 Why Use a Form Library?

In Lesson 7, we managed form inputs with `useState`. That works for simple forms, but it has problems:

**Manual approach issues:**
- You write `useState` and `onChange` for every input
- Validation logic is scattered and repetitive
- The component re-renders on every keystroke
- Error handling gets messy quickly

**React Hook Form solves this by:**
- Managing form state without re-renders on every keystroke
- Providing built-in validation
- Handling errors consistently
- Making complex forms simple

**Zod adds:**
- Type-safe validation schemas
- Clear error messages
- Reusable validation rules
- **Automatic TypeScript types** - define your schema once and get both validation AND types

---

## 12.2 Installing the Libraries

```bash
npm install react-hook-form zod @hookform/resolvers
```

- `react-hook-form` - the form library
- `zod` - the validation library
- `@hookform/resolvers` - connects Zod to React Hook Form

---

## 12.3 Understanding Zod Schemas

A Zod schema defines the **shape and rules** of your data. Think of it as a contract - "this data must look like this."

### Basic Schema

```ts
import { z } from "zod";

// A simple string that must exist
const nameSchema = z.string();

// A string with rules
const titleSchema = z.string()
  .min(3, "Title must be at least 3 characters")
  .max(100, "Title must be under 100 characters");

// A number
const prioritySchema = z.number()
  .min(1, "Priority must be between 1 and 5")
  .max(5, "Priority must be between 1 and 5");
```

### Object Schema

For forms, you define a schema for the whole form data:

```ts
const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
  priority: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "Please select a priority" }),
  }),
  description: z.string().optional(), // optional field
});
```

### Deriving TypeScript Types from Zod

This is one of the most powerful features of Zod. Instead of writing your types separately, you **derive them from the schema**:

```ts
const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
  priority: z.enum(["low", "medium", "high"]),
});

// Derive the TypeScript type from the schema
type TodoFormData = z.infer<typeof todoSchema>;

// TodoFormData is now equivalent to:
// {
//   title: string;
//   priority: "low" | "medium" | "high";
// }
```

**Why this matters:** Your validation rules and your TypeScript types are always in sync. If you add a field to the schema, the type updates automatically. No duplication, no drift.

### Common Zod Validators

```ts
// Strings
z.string()                              // must be a string
z.string().min(3, "Too short")          // minimum length
z.string().max(100, "Too long")         // maximum length
z.string().email("Invalid email")       // must be email format
z.string().min(1, "Required")           // cannot be empty

// Numbers
z.number()                              // must be a number
z.number().min(1)                       // minimum value
z.number().max(100)                     // maximum value
z.number().positive("Must be positive") // > 0

// Booleans
z.boolean()

// Enums (pick from options)
z.enum(["low", "medium", "high"])

// Optional fields
z.string().optional()                   // can be undefined

// Coerce (convert strings from inputs to numbers)
z.coerce.number().min(1).max(10)
```

### Testing a Schema

```ts
const result = todoSchema.safeParse({
  title: "Hi",
  priority: "low",
});

if (!result.success) {
  console.log(result.error.errors);
  // [{ message: "Title must be at least 3 characters", path: ["title"] }]
} else {
  console.log(result.data); // validated data, typed as TodoFormData
}
```

---

## 12.4 React Hook Form Basics

### The useForm Hook

```tsx
import { useForm } from "react-hook-form";

interface FormData {
  title: string;
}

function MyForm() {
  const {
    register,      // connects inputs to the form
    handleSubmit,   // wraps your submit function with validation
    formState: { errors },  // validation errors
    reset,          // reset form to defaults
  } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    console.log(data); // { title: "..." }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("title")} placeholder="Task title" />
      <button type="submit">Add</button>
    </form>
  );
}
```

**How it works:**
1. `register("fieldName")` returns props (`onChange`, `onBlur`, `ref`, `name`) that connect the input to the form
2. The spread operator `{...register("title")}` applies those props to the input
3. `handleSubmit(onSubmit)` validates the form, then calls `onSubmit` with the data
4. No `useState` needed for form values!

### Register with Validation Rules

```tsx
<input
  {...register("title", {
    required: "Title is required",
    minLength: { value: 3, message: "Must be at least 3 characters" },
    maxLength: { value: 100, message: "Must be under 100 characters" },
  })}
  placeholder="Task title"
/>
{errors.title && <p className="text-red-500">{errors.title.message}</p>}
```

This works, but **Zod is better** for validation. Let's use it instead.

---

## 12.5 Connecting Zod to React Hook Form

This is where the power comes together. Zod gives you both validation **and** types from a single schema:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// 1. Define the schema
const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
});

// 2. Derive the type from the schema
type TodoFormData = z.infer<typeof todoSchema>;

function AddTodoForm() {
  // 3. Connect schema to form with the derived type
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: "",
    },
  });

  // 4. Handle valid submission - data is typed as TodoFormData
  const onSubmit = (data: TodoFormData) => {
    console.log("Valid data:", data); // { title: "..." }
    reset(); // clear the form
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("title")}
        placeholder="What needs to be done?"
      />
      {errors.title && (
        <p className="text-red-500 text-sm mt-1">
          {errors.title.message}
        </p>
      )}
      <button type="submit">Add</button>
    </form>
  );
}
```

Now:
- The form won't submit unless all Zod rules pass
- Error messages come from your Zod schema
- The `data` in `onSubmit` is guaranteed to be valid **and** fully typed
- TypeScript knows exactly what fields and types `data` contains

---

## 12.6 Full Todo Form with shadcn/ui

Let's build a proper form with shadcn/ui components and Zod validation:

```ts
// src/schemas/todoSchema.ts
import { z } from "zod";

export const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
  priority: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "Please select a priority" }),
  }),
});

// Export the derived type so other files can use it
export type TodoFormData = z.infer<typeof todoSchema>;
```

```tsx
// src/components/AddTodoForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { todoSchema, type TodoFormData } from "../schemas/todoSchema";
import { useTodo } from "../context/TodoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AddTodoForm() {
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

  const onSubmit = (data: TodoFormData) => {
    addTask(data.title, data.priority);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title field */}
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="What needs to be done?"
        />
        {errors.title && (
          <p className="text-sm text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Priority field */}
      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <select
          id="priority"
          {...register("priority")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {errors.priority && (
          <p className="text-sm text-destructive">
            {errors.priority.message}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" className="w-full">
        Add Task
      </Button>
    </form>
  );
}

export default AddTodoForm;
```

### Update TodoContext to Accept Priority

```ts
// In TodoContext.tsx - update the addTask function
const addTask = (title: string, priority: "low" | "medium" | "high" = "medium") => {
  const newTask = {
    id: Date.now(),
    title,
    priority,
    completed: false,
  };
  setTasks((prev) => [...prev, newTask]);
};
```

---

## 12.7 Displaying Errors Nicely

### Error Message Component

Create a reusable error component:

```tsx
// src/components/FormError.tsx
interface FormErrorProps {
  message?: string;
}

function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p className="text-sm text-destructive mt-1">
      {message}
    </p>
  );
}

export default FormError;
```

Use it:

```tsx
<Input {...register("title")} />
<FormError message={errors.title?.message} />
```

### Highlighting Invalid Inputs

```tsx
import { cn } from "@/lib/utils";

<Input
  {...register("title")}
  className={cn(
    errors.title && "border-destructive focus-visible:ring-destructive"
  )}
/>
```

---

## 12.8 Common Form Patterns

### Watch Field Values

```tsx
const { watch } = useForm<TodoFormData>();
const title = watch("title"); // reactive value, typed as string

return (
  <div>
    <p>{title?.length ?? 0}/100 characters</p>
  </div>
);
```

### Set Values Programmatically

```tsx
const { setValue } = useForm<TodoFormData>();

// Set a single field - TypeScript ensures you use valid field names and values
setValue("title", "New value");
```

### Reset Form

```tsx
const { reset } = useForm<TodoFormData>();

// Reset to defaults
reset();

// Reset to specific values - TypeScript checks the shape
reset({ title: "Prefilled title", priority: "high" });
```

### Form Submission State

```tsx
const {
  formState: { errors, isSubmitting, isValid },
} = useForm<TodoFormData>({ mode: "onChange" }); // validate on every change

<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Adding..." : "Add Task"}
</Button>
```

---

## 12.9 Edit Task Form with Validation

```tsx
// src/components/EditTaskForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { todoSchema, type TodoFormData } from "../schemas/todoSchema";
import { useTodo } from "../context/TodoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Task {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
}

interface EditTaskFormProps {
  task: Task;
  onClose: () => void;
}

function EditTaskForm({ task, onClose }: EditTaskFormProps) {
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

  const onSubmit = (data: TodoFormData) => {
    editTask(task.id, data.title, data.priority);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-title">Task Title</Label>
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
        {errors.priority && (
          <p className="text-sm text-destructive">{errors.priority.message}</p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export default EditTaskForm;
```

---

## 12.10 How Zod + TypeScript Work Together

Here's a summary of why this combination is so effective:

```ts
// 1. Define the schema ONCE
const todoSchema = z.object({
  title: z.string().min(1).min(3).max(100).trim(),
  priority: z.enum(["low", "medium", "high"]),
});

// 2. Derive the type - no manual interface needed
type TodoFormData = z.infer<typeof todoSchema>;

// 3. Use everywhere with full type safety
const form = useForm<TodoFormData>({
  resolver: zodResolver(todoSchema),   // validates at runtime
});

const onSubmit = (data: TodoFormData) => {
  // TypeScript knows:
  // - data.title is a string
  // - data.priority is "low" | "medium" | "high"
  // - no other fields exist
};
```

**Without Zod**, you'd need to:
1. Write an interface manually
2. Write validation logic separately
3. Keep them in sync yourself
4. Hope they don't drift apart

**With Zod**, you write the schema once and get:
- Runtime validation (catches bad data)
- TypeScript types (catches bugs at compile time)
- Error messages (for the user interface)

All from a single source of truth.

---

## Practice Exercises

### Exercise 1: Basic Validated Form
Create a form with:
- A "title" field (required, min 3 chars, max 100 chars)
- Define the schema with Zod and derive the type with `z.infer`
- Type the `useForm` hook and `onSubmit` handler
- Display the error message below the input when validation fails
- Log the valid data on submit

### Exercise 2: Full Todo Form
Build the complete AddTodoForm with:
- Title input with validation
- Priority select (low/medium/high)
- shadcn/ui components for styling
- Error messages for all fields
- Form resets after successful submission
- All types derived from the Zod schema

### Exercise 3: Character Counter
Add a live character counter below the title input:
- Show "X/100 characters"
- Turn the counter red when over 80 characters
- Hint: use `watch("title")` from React Hook Form

---

## Key Takeaways
1. **Zod** defines validation rules as schemas - clear, reusable, type-safe
2. **`z.infer<typeof schema>`** derives TypeScript types from Zod schemas - one source of truth
3. **React Hook Form** manages form state without re-renders
4. Connect them with `useForm<TodoFormData>({ resolver: zodResolver(schema) })`
5. `register("fieldName")` connects inputs - spread it onto the element
6. `handleSubmit(onSubmit)` validates before calling your function
7. Access errors via `formState.errors.fieldName.message`
8. Use `reset()` to clear the form after submission
9. Define schemas in separate `.ts` files and export both the schema and the derived type
